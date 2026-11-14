import { isValidToken } from "@/lib/scoreToken";

const ORIGINAL_TOKEN = process.env.SCORE_TOKEN;

afterEach(() => {
  process.env.SCORE_TOKEN = ORIGINAL_TOKEN;
});

describe("isValidToken", () => {
  it("returns true when the candidate matches SCORE_TOKEN", () => {
    process.env.SCORE_TOKEN = "abc123";
    expect(isValidToken("abc123")).toBe(true);
  });

  it("returns false when the candidate does not match", () => {
    process.env.SCORE_TOKEN = "abc123";
    expect(isValidToken("wrong")).toBe(false);
  });

  it("returns false when SCORE_TOKEN is unset", () => {
    delete process.env.SCORE_TOKEN;
    expect(isValidToken("anything")).toBe(false);
  });

  it("returns false when SCORE_TOKEN is empty", () => {
    process.env.SCORE_TOKEN = "";
    expect(isValidToken("")).toBe(false);
  });
});
