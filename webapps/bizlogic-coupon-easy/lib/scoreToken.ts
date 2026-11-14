export function isValidToken(candidate: string): boolean {
  const expected = process.env.SCORE_TOKEN;
  return typeof expected === "string" && expected.length > 0 && candidate === expected;
}
