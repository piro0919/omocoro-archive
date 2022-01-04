import * as contentful from "contentful";
import { GetStaticProps } from "next";
import { NextSeo } from "next-seo";
import { useRouter } from "next/router";
import queryString from "query-string";
import { useCallback } from "react";
import { IArticleFields } from "../../@types/generated/contentful";
import Top, { TopProps } from "components/Top";

export type PagesProps = Pick<TopProps, "articles">;

function Pages({ articles }: PagesProps): JSX.Element {
  const router = useRouter();
  const handleSubmit = useCallback<TopProps["onSubmit"]>(
    ({ from, isNewOrder, query, until }) => {
      router.push(
        {
          pathname: "/",
          query: queryString.stringify(
            {
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
    [router]
  );

  return (
    <>
      <NextSeo title="オモコロアーカイブ" />
      <Top articles={articles} onSubmit={handleSubmit} />
    </>
  );
}

export const getStaticProps: GetStaticProps<PagesProps> = async () => {
  const client = contentful.createClient({
    accessToken: process.env.CONTENTFUL_DELIVERY_API_ACCESS_TOKEN || "",
    space: process.env.CONTENTFUL_SPACE_ID || "",
  });
  const articles = await client
    .getEntries<IArticleFields>({
      content_type: "article",
      limit: 20,
      order: "-fields.date",
      skip: 20 * 0,
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
    revalidate: 60 * 60 * 12,
  };
};

export default Pages;
