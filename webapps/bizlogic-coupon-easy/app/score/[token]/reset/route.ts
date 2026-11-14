import { NextRequest } from "next/server";
import { isValidToken } from "@/lib/scoreToken";
import { resetScoring } from "@/lib/scoring";
import { resetStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
): Promise<Response> {
  if (!isValidToken(params.token)) {
    return new Response("Not Found", { status: 404 });
  }

  resetStore();
  const newTaskStart = resetScoring();
  return Response.json({ status: "reset", new_task_start: newTaskStart });
}
