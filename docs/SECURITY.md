# RenewalDesk Security & Compliance Architecture

This document defines the security model, secrets management, incident response playbook, and maintenance procedures for **RenewalDesk** (`https://renewaldesk.chronyx.in`).

---

## 1. Security Architecture & Threat Model

RenewalDesk is designed with defense-in-depth and the principle of least privilege:

```
┌────────────────────────────────────────────────────────────────────────┐
│                                CLIENT                                  │
│  - Browser UI / wa.me WhatsApp links / Razorpay Checkout               │
│  - Client Session authenticated via Supabase JWT (role: authenticated) │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ HTTPS / TLS 1.3
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        EDGE & HTTP HEADERS                             │
│  - Strict-Transport-Security: max-age=63072000; includeSubDomains      │
│  - X-Content-Type-Options: nosniff                                     │
│  - X-Frame-Options: DENY                                               │
│  - Referrer-Policy: strict-origin-when-cross-origin                    │
│  - Content-Security-Policy-Report-Only (CSP)                           │
│  - Serverless Distributed Rate Limiter (Upstash Redis / Postgres)      │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
┌─────────────────────────────────┐       ┌──────────────────────────────┐
│  RESTRICTED SERVER ROUTES       │       │ DIRECT POSTGRES ACCESS (RLS) │
│  - /api/billing/*               │       │ - Read queries scoped to     │
│  - /api/business/delete         │       │   verified business_members  │
│  - Executed via service_role    │       │ - FORCE ROW LEVEL SECURITY   │
│    client in Node.js server     │       │   active on ALL 14 tables    │
│  - Fail-closed validation       │       │ - Table writes to billing    │
│  - Authoritative payment checks │       │   strictly REVOKED for       │
└────────────────┬────────────────┘       │   authenticated / anon       │
                 │                        └──────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    POSTGRES DATABASE (SUPABASE)                        │
│  - 14 Tables with forced RLS:                                          │
│    businesses, business_members, customers, assets, service_types,     │
│    service_records, service_schedules, reminders, message_templates,   │
│    activities, business_subscriptions, payment_transactions,          │
│    webhook_events, profiles                                            │
│  - Billing RPCs claim_founding_lifetime_slot &                         │
│    activate_recurring_subscription restricted strictly to service_role │
│  - start_free_trial RPC rate-limited per user account (max 2 trials)   │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Security Guarantees
1. **Strict Multi-Tenant Isolation**: Every database table is protected by PostgreSQL Row Level Security (`FORCE ROW LEVEL SECURITY`). Tenants cannot read, insert, update, or delete records belonging to another business.
2. **Zero Client Write on Billing Records**: Direct `INSERT`, `UPDATE`, and `DELETE` privileges on `business_subscriptions` and `payment_transactions` are revoked from client roles (`anon`, `authenticated`). All subscription activations and cancellations happen exclusively via server route handlers using the private service role client.
3. **Fail-Closed Billing Functions**: Billing RPCs (`claim_founding_lifetime_slot` and `activate_recurring_subscription`) execute as `SECURITY DEFINER` with fixed `search_path = public, pg_temp` and throw an exception (`INVALID_TRANSACTION`) if the payment transaction is missing, not in `captured` status, or mismatched in amount, business, or plan. Execution is strictly revoked from `PUBLIC` and granted only to `service_role`.
4. **No Direct WhatsApp API Exposure**: RenewalDesk generates standard client-side `https://wa.me` deep links. No WhatsApp Business API keys, session tokens, or customer messages are sent to external third parties.
5. **CSV Formula Injection Sanitization**: Uploaded CSV files have cell values starting with `=, +, -, @, \t, \r` automatically prefixed with `'` to neutralize spreadsheet macro execution in Excel/Google Sheets. Uploads are strictly capped at 1,000 rows.
6. **Open-Redirect Hardening**: Auth redirects pass through `getSafeInternalRedirect()` which rejects protocol-relative paths (`//`), backslash tricks (`/\`), and foreign URIs.
7. **DPDP Act 2023 Compliance**: Workspace owners can self-serve permanently erase all workspace records via Settings > Danger Zone, and users have access to a designated Data Protection / Grievance Officer.

---

## 2. Secrets Management & Environment Inventory

> **SECURITY INVARIANT**: Never commit secret values to git or expose them in client-side bundles.

| Variable Name | Scope | Purpose | Sensitivity |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public (Client + Server) | Supabase project API gateway | Low (Public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (Client + Server) | Supabase anonymous client JWT | Low (Public, guarded by RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Private (Server Only)** | Admin database bypass key | **CRITICAL (Full DB access)** |
| `NEXT_PUBLIC_SITE_URL` | Public (Client + Server) | Canonical production domain URL | Low (Public) |
| `RAZORPAY_KEY_ID` | Public (Client + Server) | Razorpay public key ID | Medium (Public ID) |
| `RAZORPAY_KEY_SECRET` | **Private (Server Only)** | Razorpay API key secret | **HIGH (Merchant API)** |
| `RAZORPAY_WEBHOOK_SECRET` | **Private (Server Only)** | HMAC SHA256 webhook signature secret | **HIGH (Webhook validation)** |
| `UPSTASH_REDIS_REST_URL` | **Private (Server Only)** | Distributed rate limiting REST endpoint | Medium |
| `UPSTASH_REDIS_REST_TOKEN` | **Private (Server Only)** | Upstash REST authentication token | **HIGH (Rate store access)** |

---

## 3. Secret Rotation Procedures

### A. Supabase Service Role Key Rotation
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard) → Select Project (`renewaldesk`).
2. Navigate to **Project Settings** → **API**.
3. Under **Project API Keys**, locate `service_role (secret)`.
4. Click **Generate new key / Roll key**. Choose the grace period (if supported) or perform during a scheduled maintenance window.
5. In [Vercel Dashboard](https://vercel.com) → Project Settings → **Environment Variables**:
   - Update `SUPABASE_SERVICE_ROLE_KEY` for Production and Preview environments.
6. Trigger a zero-downtime redeploy of the latest production deployment:
   ```bash
   vercel redeploy --prod
   ```
7. Verify health by calling `/api/billing/plans` and loading the dashboard.

### B. Razorpay Key Secret & Webhook Secret Rotation
1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com) → **Settings** → **API Keys**.
2. Click **Regenerate Key**. Razorpay provides an option to keep the old key active for 24 hours.
3. Copy the new Key Secret.
4. Update `RAZORPAY_KEY_SECRET` in Vercel Environment Variables.
5. For Webhook Secret: Navigate to **Settings** → **Webhooks** → Edit Webhook → Generate new Secret → Update `RAZORPAY_WEBHOOK_SECRET` in Vercel.
6. Trigger a redeployment on Vercel (`vercel redeploy --prod`).
7. Perform a test ₹1 transaction in test mode to verify webhook signature verification.

### C. Upstash Redis Token Rotation
1. Log in to [Upstash Console](https://console.upstash.com) → Select Redis database.
2. Navigate to **REST API** → Click **Rotate Token**.
3. Update `UPSTASH_REDIS_REST_TOKEN` in Vercel Environment Variables.
4. Redeploy application on Vercel.

---

## 4. Security Incident Response & Data Breach Playbook

This playbook complies with **Section 8 & 9 of the Digital Personal Data Protection (DPDP) Act, 2023 (India)** and **CERT-In Cyber Security Directions (Section 70B of Information Technology Act, 2000)**.

### Statutory Reporting Timelines
- **CERT-In**: Must be reported within **6 hours** of noticing or becoming aware of a cybersecurity incident (email: `incident@cert-in.org.in`).
- **Data Protection Board of India (DPBI)**: Mandatory notification without undue delay in the event of personal data breach.
- **Affected Data Principals (Users)**: Direct email notification describing nature of breach, impacted data fields, and mitigation advice.

### Incident Response Steps

```
[Phase 1: Detection & Triage] (0 - 1 Hours)
  │ - Identify alert source (Vercel Firewall, Supabase logs, user report)
  │ - Assess severity: P1 (Data Breach / Secret Leak) vs P2 (Service Abuse / DDoS)
  │
  ▼
[Phase 2: Containment & Isolation] (1 - 2 Hours)
  │ - If credential leak: Immediately rotate affected key in Supabase / Razorpay
  │ - If DDoS / scraping attack: Enable Vercel Firewall Attack Mode & block IPs
  │ - If tenant isolation fault: Block affected routes using Edge Middleware
  │
  ▼
[Phase 3: Statutory Notification] (Within 6 Hours)
  │ - Dispatch CERT-In notification report (Form 1) to incident@cert-in.org.in
  │ - Notify Razorpay security team if payment credentials or signatures were impacted
  │
  ▼
[Phase 4: Eradication & Remediation] (Within 24 Hours)
  │ - Patch root cause in codebase
  │ - Apply database fixes / migration
  │ - Invalidate active auth sessions if user tokens were exposed
  │
  ▼
[Phase 5: User Notification & Post-Mortem] (Within 72 Hours)
  │ - Email affected workspace owners with transparent breach summary and actions taken
  │ - Complete root-cause analysis (RCA) and file post-mortem documentation
```

### Emergency Contacts
- **Security Lead & Grievance Officer**: Shahul Hameed (`shahulhmd.connect@gmail.com`)
- **Indian Computer Emergency Response Team (CERT-In)**:
  - Phone: `1800-11-4949`
  - Email: `incident@cert-in.org.in`
  - Website: `https://www.cert-in.org.in`
- **Razorpay Merchant Security**: `security@razorpay.com`
- **Supabase Security**: `security@supabase.com`

---

## 5. Monthly Security Checklist

Run this audit on the 1st of every month:

- [ ] **Dependency Audit**: Run `npm audit` and apply non-breaking security patches (`npm audit fix`).
- [ ] **Database RLS Verification**: Execute `supabase/scripts/audit_multi_tenant_isolation.sql` or run `npm test` to verify 100% of tables have active RLS policies.
- [ ] **Vercel Access & Env Audit**: Review team members on Vercel and Supabase. Confirm no personal keys or orphaned secrets exist.
- [ ] **Certificate & Domain Health**: Check SSL/TLS certificate validity and DNS health for `renewaldesk.chronyx.in`.
- [ ] **Rate Limiter Metrics**: Check Upstash / Postgres `rate_limit_entries` table for blocked attempts and brute force patterns.
- [ ] **Backup Verification Drill**: Download latest automated Supabase database backup and perform a mock table restoration.

---

## 6. Database Backup & Disaster Recovery Procedures

### Automated Backups
- Supabase automatically takes daily physical and logical backups with 7-day retention.
- Up to 30 days retention with Point-in-Time Recovery (PITR) on Pro plans.

### Manual Backup (Pre-Migration / Maintenance)
Before applying new migrations or schema updates, create a logical snapshot:
```bash
# Using Supabase CLI (if linked)
supabase db dump -f backup_$(date +%Y%m%d).sql

# Or using standard pg_dump with direct connection string
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  --clean --if-exists --no-owner --no-privileges -f renewaldesk_backup_$(date +%Y%m%d).sql
```

### Disaster Recovery & Rollback Procedure
1. **Rollback Individual Migration**:
   Every migration file in `supabase/migrations/` contains explicit rollback SQL in its header. To rollback a migration, execute the rollback SQL commands in reverse order using the Supabase SQL Editor.
2. **Point-in-Time Restore**:
   - Go to Supabase Dashboard → **Database** → **Backups**.
   - Select timestamp immediately prior to the incident and click **Restore**.
   - Supabase will provision the restored state with zero loss of unaffected historical records.
