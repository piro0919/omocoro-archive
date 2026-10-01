import assert from "node:assert/strict";
import { describe, test } from "node:test";
import isAuthorizedCronRequest from "@/lib/cron-auth";

describe("isAuthorizedCronRequest", () => {
  test("accepts the matching bearer token", () => {
    assert.equal(
      isAuthorizedCronRequest("Bearer s3cret", "s3cret", "production"),
      true,
    );
  });

  test("rejects a missing header", () => {
    assert.equal(isAuthorizedCronRequest(null, "s3cret", "production"), false);
  });

  test("rejects a wrong token", () => {
    assert.equal(
      isAuthorizedCronRequest("Bearer nope", "s3cret", "production"),
      false,
    );
    assert.equal(
      isAuthorizedCronRequest("s3cret", "s3cret", "production"),
      false,
    );
  });

  test("rejects everything when the secret is empty", () => {
    assert.equal(isAuthorizedCronRequest("Bearer ", "", "production"), false);
  });

  test("lets requests through in development", () => {
    assert.equal(isAuthorizedCronRequest(null, "s3cret", "development"), true);
  });

  test("does not skip the check in test or preview builds", () => {
    assert.equal(isAuthorizedCronRequest(null, "s3cret", "test"), false);
    assert.equal(isAuthorizedCronRequest(null, "s3cret", undefined), false);
  });
});
