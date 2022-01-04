import * as contentful from "contentful";
import { NextApiRequest, NextApiResponse } from "next";
import nc from "next-connect";
import { IArticleFields } from "../../../../@types/generated/contentful";

const handler = nc<NextApiRequest, NextApiResponse>();

handler.get(async ({ query }, res) => {
  const client = contentful.createClient({
    accessToken: process.env.CONTENTFUL_DELIVERY_API_ACCESS_TOKEN || "",
    space: process.env.CONTENTFUL_SPACE_ID || "",
  });
  const articles = await client
    .getEntries<IArticleFields>({
      ...query,
      content_type: "article",
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

  res.json(articles);
  res.status(200);
  res.end();
});

export default handler;
