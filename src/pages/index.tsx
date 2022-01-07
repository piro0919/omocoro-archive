import * as contentful from "contentful";
import dayjs from "dayjs";
import { GetServerSideProps } from "next";
import { NextSeo } from "next-seo";
import Head from "next/head";
import { useRouter } from "next/router";
import nookies, { setCookie } from "nookies";
import queryString from "query-string";
import { useCallback } from "react";
import {
  IArticleFields,
  IWriterFields,
} from "../../@types/generated/contentful";
import Top, { TopProps } from "components/Top";

export type PagesProps = Pick<TopProps, "articles" | "writers">;

function Pages({ articles, writers }: PagesProps): JSX.Element {
  const { query: routerQuery, ...router } = useRouter();
  const handleSubmit = useCallback<TopProps["onSubmit"]>(
    ({ from, isNewOrder, onigiri, query, until, writer }) => {
      setCookie(null, "onigiri", onigiri.toString(), {
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
      });

      router.push(
        {
          pathname: "/",
          query: queryString.stringify(
            {
              ...routerQuery,
              from,
              query,
              until,
              order: isNewOrder ? "-fields.date" : "fields.date",
              staffs: writer,
            },
            { skipEmptyString: true }
          ),
        },
        undefined,
        { shallow: true }
      );
    },
    [router, routerQuery]
  );

  return (
    <>
      <NextSeo
        additionalLinkTags={[
          {
            href: "https://omocoro-archive.kk-web.link/favicon.ico",
            rel: "icon",
          },
          {
            href: "https://omocoro-archive.kk-web.link/icon-512x512.png",
            rel: "apple-touch-icon",
            sizes: "512x512",
          },
          {
            href: "/manifest.json",
            rel: "manifest",
          },
        ]}
        canonical="https://omocoro-archive.kk-web.link/"
        description="オモコロの非公式アーカイブサイトです"
        openGraph={{
          description: "オモコロの非公式アーカイブサイトです",
          images: [
            {
              alt: "オモコロの非公式アーカイブサイトです",
              height: 630,
              type: "image/jpeg",
              url: "https://omocoro-archive.kk-web.link/og-image-01.jpg",
              width: 1200,
            },
          ],
          site_name: "オモコロアーカイブ",
          title: "オモコロアーカイブ",
          url: "https://omocoro-archive.kk-web.link/",
        }}
        title="オモコロアーカイブ"
        twitter={{
          cardType: "summary_large_image",
        }}
      />
      <Head>
        {dayjs().date() % 2 ? (
          <link
            href="https://omocoro-archive.kk-web.link/favicon2.ico"
            rel="icon"
          />
        ) : null}
      </Head>
      <Top articles={articles} onSubmit={handleSubmit} writers={writers} />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<PagesProps> = async (
  ctx
) => {
  const { onigiri } = nookies.get(ctx);
  const client = contentful.createClient({
    accessToken: process.env.CONTENTFUL_DELIVERY_API_ACCESS_TOKEN || "",
    space: process.env.CONTENTFUL_SPACE_ID || "",
  });
  const articles = await client
    .getEntries<IArticleFields>({
      content_type: "article",
      "fields.category[ne]":
        onigiri === "true" ? undefined : "おにぎりクラブ限定",
      limit: 24,
      order: "-fields.date",
      skip: 24 * 0,
    })
    .then(({ items }) =>
      items.map(
        ({ fields: { category, date, image, staffs, title, url } }) => ({
          category,
          date,
          image,
          title,
          url,
          staffs: staffs || [],
        })
      )
    );
  const writers = await client
    .getEntries<IWriterFields>({
      content_type: "writer",
      limit: 1000,
      order: "fields.name",
    })
    .then(({ items }) =>
      items.map(({ fields: { image, name } }) => ({
        image,
        name,
        value: name,
      }))
    );

  return {
    props: {
      articles,
      writers,
    },
  };
};

export default Pages;
