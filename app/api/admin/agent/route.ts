import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateTenantAgentConfig } from "@/lib/db/admin";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { tenantId, agentId, ...updates } = body;

  if (!tenantId || !agentId) {
    return NextResponse.json({ error: "tenantId and agentId are required" }, { status: 400 });
  }

  await updateTenantAgentConfig(tenantId, agentId, updates);
  return NextResponse.json({ success: true });
}
