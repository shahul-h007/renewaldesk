import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getServiceRoleSupabaseClient } from '@/lib/supabase/service-role';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/business/delete
 * Permanently erases a business workspace and all child data (customers, assets,
 * service records, schedules, templates, subscriptions, etc.) via ON DELETE CASCADE.
 * 
 * Security Guardrails:
 * 1. Strictly requires authenticated session.
 * 2. Caller must have role = 'owner' for the target business_id.
 * 3. Exact business name confirmation must match before deletion proceeds.
 * 4. Rate-limited to prevent automated destructive abuse.
 * 5. Executed via service role client to ensure complete cascade cleanup.
 */
export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    // Rate Limiting: 3 deletion requests per hour per user/IP
    const ip = getClientIp(request);
    const rateLimit = await checkRateLimit({
      key: `workspace_delete:${user.id}:${ip}`,
      limit: 3,
      windowSeconds: 3600,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        { status: 429, headers: { 'Retry-After': '300' } }
      );
    }

    const body = await request.json();
    const { businessId, businessNameConfirmation } = body;

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required.' }, { status: 400 });
    }

    // 1. Verify caller is the verified owner of this workspace
    const { data: membership, error: memberErr } = await supabase
      .from('business_members')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberErr || !membership || membership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Unauthorized: Only the workspace owner can delete this business.' },
        { status: 403 }
      );
    }

    // 2. Fetch business details to verify exact name confirmation
    const { data: biz, error: bizErr } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', businessId)
      .maybeSingle();

    if (bizErr || !biz) {
      return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 });
    }

    if (!businessNameConfirmation || businessNameConfirmation.trim().toLowerCase() !== biz.name.trim().toLowerCase()) {
      return NextResponse.json(
        { error: `Confirmation mismatch. You must type "${biz.name}" exactly to confirm permanent deletion.` },
        { status: 400 }
      );
    }

    // 3. Execute permanent deletion using service role client
    const adminClient = getServiceRoleSupabaseClient();
    const { error: deleteErr } = await adminClient
      .from('businesses')
      .delete()
      .eq('id', businessId);

    if (deleteErr) {
      console.error('Failed deleting business workspace:', deleteErr);
      return NextResponse.json(
        { error: 'Failed to delete workspace. Please contact support if this persists.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Workspace and all associated records have been permanently erased (DPDP Act compliant).',
    });
  } catch (err: any) {
    console.error('Unexpected error in workspace deletion:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
