import * as cheerio from "cheerio";
import { NextResponse } from "next/server";
import prismaClient from "@/lib/prisma-client";

type Writer = {
  avatarUrl?: string;
  name: string;
  profileUrl?: string;
};

// eslint-disable-next-line import/prefer-default-export
export async function GET(): Promise<NextResponse> {
  const response = await fetch("https://omocoro.jp/writer");
  const html = await response.text();
  const $ = cheerio.load(html);
  const writerElements = $(".writers .box");
  const writers: Writer[] = [];

  for (const writerElement of writerElements) {
    const writer = $(writerElement);
    const avatarUrl = writer.find("img").attr("src");
    const name = writer.find(".waku-text").text();
    const profileUrl = writer.find("a").attr("href");

    writers.push({
      avatarUrl,
      name,
      profileUrl,
    });
  }

  const notCorrectWriter = writers.find(
    (writer) =>
      !(typeof writer.avatarUrl === "string" && writer.avatarUrl.length > 0) ||
      !(typeof writer.profileUrl === "string" && writer.profileUrl.length > 0),
  );

  if (notCorrectWriter) {
    throw new Error("Writer data is not correct");
  }

  for (const writer of writers as Required<(typeof writers)[number]>[]) {
    await prismaClient.writer.upsert({
      create: writer,
      update: {
        avatarUrl: writer.avatarUrl,
        profileUrl: writer.profileUrl,
      },
      where: {
        name: writer.name,
      },
    });
  }

  return NextResponse.json({
    success: true,
  });
}
