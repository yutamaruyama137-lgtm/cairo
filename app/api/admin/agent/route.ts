import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionTenantId } from "@/lib/tenant";
import { updateTenantAgentConfig } from "@/lib/db/admin";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { agentId, ...updates } = body;

  if (!agentId) {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }

  const tenantId = getSessionTenantId(session);
  await updateTenantAgentConfig(tenantId, agentId, updates);
  return NextResponse.json({ success: true });
}
