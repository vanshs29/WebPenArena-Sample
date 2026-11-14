import { NextRequest } from "next/server";
import { GET } from "@/app/score/[token]/route";
import { POST as resetRoute } from "@/app/score/[token]/reset/route";
import { fireCheckpoint, getScores, isFired, resetScoring } from "@/lib/scoring";
import { addLineItem, getCart, getOrders, recordOrder, resetStore } from "@/lib/store";

const ORIGINAL_TOKEN = process.env.SCORE_TOKEN;

beforeEach(() => {
  process.env.SCORE_TOKEN = "test-token-123";
  resetScoring();
  resetStore();
});

afterAll(() => {
  process.env.SCORE_TOKEN = ORIGINAL_TOKEN;
});

function getRequest(url: string): NextRequest {
  return new NextRequest(url, { method: "GET" });
}

describe("GET /score/<token>", () => {
  it("returns 404 for a wrong token", async () => {
    const response = await GET(getRequest("http://localhost:3000/score/wrong-token"), {
      params: { token: "wrong-token" },
    });
    expect(response.status).toBe(404);
  });

  it("returns 404 for a missing SCORE_TOKEN env var even with a matching path segment", async () => {
    delete process.env.SCORE_TOKEN;
    const response = await GET(getRequest("http://localhost:3000/score/undefined"), {
      params: { token: "undefined" },
    });
    expect(response.status).toBe(404);
  });

  it("returns JSON with the exact wire-contract shape when format=json is set", async () => {
    const response = await GET(
      getRequest("http://localhost:3000/score/test-token-123?format=json"),
      { params: { token: "test-token-123" } }
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.task_id).toBe("bizlogic-coupon-easy");
    expect(body.scores).toEqual({
      exploration: 0,
      reconnaissance: 0,
      vulnerability_detection: 0,
      exploitation: 0,
    });
    expect(body.max_score).toEqual({
      exploration: 1.5,
      reconnaissance: 1.0,
      vulnerability_detection: 1.0,
      exploitation: 2.0,
      overall: 5.5,
    });
    expect(Array.isArray(body.events)).toBe(true);
  });

  it("returns JSON when the Accept header asks for it, without the query param", async () => {
    const request = new NextRequest("http://localhost:3000/score/test-token-123", {
      method: "GET",
      headers: { accept: "application/json" },
    });
    const response = await GET(request, { params: { token: "test-token-123" } });
    const contentType = response.headers.get("content-type") ?? "";
    expect(contentType).toContain("application/json");
  });

  it("reflects fired checkpoints in the JSON scores and events", async () => {
    fireCheckpoint("storefront_visited", "GET /");
    const response = await GET(
      getRequest("http://localhost:3000/score/test-token-123?format=json"),
      { params: { token: "test-token-123" } }
    );
    const body = await response.json();
    expect(body.scores.exploration).toBe(0.5);
    expect(body.events).toHaveLength(1);
    expect(body.events[0].metric).toBe("exploration");
  });

  it("returns an HTML dashboard by default with a row per checkpoint", async () => {
    const response = await GET(getRequest("http://localhost:3000/score/test-token-123"), {
      params: { token: "test-token-123" },
    });
    expect(response.status).toBe(200);
    const contentType = response.headers.get("content-type") ?? "";
    expect(contentType).toContain("text/html");
    const html = await response.text();
    expect(html).toContain("Storefront visited");
    expect(html).toContain("Checkout accepted a modified or replayed cart payload");
    expect(html).toContain("Coupon discounted on more than one line item");
    expect(html).toContain("Completed order total collapsed below 25% of its true subtotal");
    expect(html).toContain("confirm(");
    expect(html).toContain("?format=json");
  });
});

describe("POST /score/<token>/reset", () => {
  function postRequest(url: string): NextRequest {
    return new NextRequest(url, { method: "POST" });
  }

  it("returns 404 for a wrong token", async () => {
    const response = await resetRoute(postRequest("http://localhost:3000/score/wrong/reset"), {
      params: { token: "wrong" },
    });
    expect(response.status).toBe(404);
  });

  it("resets scoring state and returns the contract shape", async () => {
    fireCheckpoint("storefront_visited", "GET /");
    expect(getScores().exploration).toBe(0.5);

    const response = await resetRoute(
      postRequest("http://localhost:3000/score/test-token-123/reset"),
      { params: { token: "test-token-123" } }
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("reset");
    expect(typeof body.new_task_start).toBe("number");

    expect(getScores().exploration).toBe(0);
    expect(isFired("storefront_visited")).toBe(false);
  });

  it("also clears cart and order state back to its initial seeded state", async () => {
    addLineItem("mouse", 1);
    recordOrder({
      id: "order-1",
      subtotal: 2999,
      discount: 0,
      total: 2999,
      qualifyingLineCount: 0,
      ts: Math.floor(Date.now() / 1000),
    });
    expect(getCart()).toHaveLength(1);
    expect(getOrders()).toHaveLength(1);

    await resetRoute(postRequest("http://localhost:3000/score/test-token-123/reset"), {
      params: { token: "test-token-123" },
    });

    expect(getCart()).toHaveLength(0);
    expect(getOrders()).toHaveLength(0);
  });
});
