import { timingSafeEqual } from "node:crypto";

// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Routes that fetch
// omocoro.jp and write to the DB must reject anything else, so outsiders can't
// make us hammer the origin or churn the database. Development skips the check
// to let a developer call the routes by hand.
export default function isAuthorizedCronRequest(
  authorization: null | string,
  secret: string,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  if (nodeEnv === "development") {
    return true;
  }

  if (!secret || !authorization) {
    return false;
  }

  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authorization);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
