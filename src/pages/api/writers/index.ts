import { createClient } from "contentful-management";
import { NextApiRequest, NextApiResponse } from "next";
import nc from "next-connect";
import scrapeIt from "scrape-it";

const handler = nc<NextApiRequest, NextApiResponse>();

type Writer = {
  image: string;
  name: string;
};

type Data = {
  writers: Writer[];
};

handler.post(async ({ headers: { authorization } }, res) => {
  if (authorization !== `Bearer ${process.env.API_SECRET_KEY}`) {
    res.status(401);
    res.end();

    return;
  }

  const {
    data: { writers },
  } = await scrapeIt<Data>("https://omocoro.jp/writer", {
    writers: {
      data: {
        image: {
          attr: "src",
          selector: ".image img",
        },
        name: {
          selector: ".waku-text",
        },
      },
      listItem: ".box",
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
    writers.map(
      ({ image, name }, index) =>
        new Promise<void>((resolve) => {
          setTimeout(async () => {
            const { total } = await environment.getEntries({
              content_type: "writer",
              "fields.name": name,
              limit: 1,
              skip: 0,
            });

            console.log(index, total, name);

            if (total) {
              resolve();

              return;
            }

            const entry = await environment.createEntry("writer", {
              fields: {
                image: {
                  ja: image,
                },
                name: {
                  ja: name,
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
