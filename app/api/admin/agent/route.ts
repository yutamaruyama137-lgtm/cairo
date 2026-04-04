import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, DEFAULT_TENANT_ID } from "@/lib/auth";
import { updateTenantAgentConfig } from "@/lib/db/admin";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { agentId, ...updates } = body;

  if (!agentId) {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }

  // tenantId はセッションから確定（クライアントから受け取らない）
  await updateTenantAgentConfig(DEFAULT_TENANT_ID, agentId, updates);
  return NextResponse.json({ success: true });
}
