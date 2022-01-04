import * as contentful from "contentful";
import { createClient } from "contentful-management";
import dayjs from "dayjs";
import { NextApiRequest, NextApiResponse } from "next";
import nc from "next-connect";
import scrapeIt from "scrape-it";
import { IArticleFields } from "../../../../@types/generated/contentful";

const handler = nc<NextApiRequest, NextApiResponse>();

handler.get(async ({ query }, res) => {
  const client = contentful.createClient({
    accessToken: process.env.CONTENTFUL_DELIVERY_API_ACCESS_TOKEN || "",
    environment: process.env.CONTENTFUL_ENVIRONMENT,
    space: process.env.CONTENTFUL_SPACE_ID || "",
  });
  const articles = await client
    .getEntries<IArticleFields>({
      ...query,
      content_type: "article",
    })
    .then(({ items, total }) => ({
      total,
      articles: items.map(
        ({ fields: { category, date, image, staffs, title, url } }) => ({
          category,
          date,
          image,
          title,
          url,
          staffs: staffs || [],
        })
      ),
    }));

  res.json(articles);
  res.status(200);
  res.end();
});

type Article = {
  category: string;
  date: string;
  image: string;
  staffs: string[];
  title: string;
  url: string;
};

type Data = {
  articles: Article[];
};

handler.post(async ({ headers: { authorization } }, res) => {
  if (authorization !== `Bearer ${process.env.API_SECRET_KEY}`) {
    res.status(401);
    res.end();

    return;
  }

  const {
    data: { articles },
  } = await scrapeIt<Data>("https://omocoro.jp/newpost/page/1", {
    articles: {
      data: {
        category: {
          selector: ".category",
        },
        date: {
          convert: (date) => (date ? dayjs(date).format() : undefined),
          selector: ".date",
        },
        image: {
          attr: "src",
          selector: ".image img",
        },
        staffs: {
          listItem: ".staffs a",
        },
        title: {
          selector: ".title",
        },
        url: {
          attr: "href",
          selector: ".title a",
        },
      },
      listItem: ".newpost .box",
    },
  });

  const client = createClient({
    accessToken: process.env.CONTENTFUL_MANAGEMENT_API_ACCESS_TOKEN || "",
  });
  const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID || "");
  const environment = await space.getEnvironment(
    process.env.CONTENTFUL_ENVIRONMENT || ""
  );

  await Promise.all(
    articles
      .filter(({ url }) => url)
      .map(
        ({ category, date, image, staffs, title, url }, index) =>
          new Promise<void>((resolve) => {
            setTimeout(async () => {
              const { total } = await environment.getEntries({
                content_type: "article",
                "fields.url": url,
                limit: 1,
                skip: 0,
              });

              console.log(index, total, title);

              if (total) {
                resolve();

                return;
              }

              const entry = await environment.createEntry("article", {
                fields: {
                  category: {
                    ja: category,
                  },
                  date: {
                    ja: date,
                  },
                  image: {
                    ja: image,
                  },
                  staffs: {
                    ja: staffs,
                  },
                  title: {
                    ja: title,
                  },
                  url: {
                    ja: url,
                  },
                },
              });

              await entry.publish();

              resolve();
            }, 500 * index);
          })
      )
  );

  res.status(200);
  res.end();
});

export default handler;
