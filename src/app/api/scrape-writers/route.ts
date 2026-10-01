import * as cheerio from "cheerio";
import { type NextRequest, NextResponse } from "next/server";
import env from "@/env";
import isAuthorizedCronRequest from "@/lib/cron-auth";
import fetchOmocoro from "@/lib/omocoro-fetch";
import prismaClient from "@/lib/prisma-client";

type Writer = {
  avatarUrl?: string;
  name: string;
  profileUrl?: string;
};

// eslint-disable-next-line import/prefer-default-export
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (
    !isAuthorizedCronRequest(
      request.headers.get("authorization"),
      env.CRON_SECRET,
    )
  ) {
    return NextResponse.json(
      { error: "Unauthorized", success: false },
      { status: 401 },
    );
  }

  const response = await fetchOmocoro("https://omocoro.jp/writer");

  if (!response.ok) {
    console.error(`Failed to fetch writer list: HTTP ${response.status}`);

    return NextResponse.json(
      { error: `HTTP error! status: ${response.status}`, success: false },
      { status: 502 },
    );
  }

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

  if (writers.length === 0) {
    console.error(
      "Parsed 0 writers from the writer list; selector may be broken",
    );

    return NextResponse.json(
      { error: "No writers found on the writer list", success: false },
      { status: 502 },
    );
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
    writers: writers.length,
  });
}
