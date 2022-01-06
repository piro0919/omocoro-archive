import * as contentful from "contentful";
import { GetServerSideProps } from "next";
import { NextSeo } from "next-seo";
import { useRouter } from "next/router";
import queryString from "query-string";
import { useCallback } from "react";
import { IArticleFields } from "../../@types/generated/contentful";
import Top, { TopProps } from "components/Top";

export type PagesProps = Pick<TopProps, "articles">;

function Pages({ articles }: PagesProps): JSX.Element {
  const { query: routerQuery, ...router } = useRouter();
  const handleSubmit = useCallback<TopProps["onSubmit"]>(
    ({ from, isNewOrder, query, until }) => {
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
      <Top articles={articles} onSubmit={handleSubmit} />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<PagesProps> = async () => {
  const client = contentful.createClient({
    accessToken: process.env.CONTENTFUL_DELIVERY_API_ACCESS_TOKEN || "",
    space: process.env.CONTENTFUL_SPACE_ID || "",
  });
  const articles = await client
    .getEntries<IArticleFields>({
      content_type: "article",
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

  return {
    props: {
      articles,
    },
  };
};

export default Pages;
