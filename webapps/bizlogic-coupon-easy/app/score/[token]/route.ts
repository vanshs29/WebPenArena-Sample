import { NextRequest } from "next/server";
import { isValidToken } from "@/lib/scoreToken";
import { buildScorePayload, renderDashboardHtml } from "@/lib/scoreDashboard";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
): Promise<Response> {
  if (!isValidToken(params.token)) {
    return new Response("Not Found", { status: 404 });
  }

  const wantsJson =
    request.nextUrl.searchParams.get("format") === "json" ||
    (request.headers.get("accept") ?? "").includes("application/json");

  if (wantsJson) {
    return Response.json(buildScorePayload());
  }

  return new Response(renderDashboardHtml(params.token), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
