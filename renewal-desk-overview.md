# RenewalDesk: Product Overview & Market Seed Document

---

## 1. Executive Summary & Value Proposition

**RenewalDesk** is an automated renewal tracking, recurring contract lifecycle management, and customer retention platform. It transforms passive renewal tracking (spreadsheets, calendar reminders, disjointed ERP records) into an active, automated pipeline that spots upcoming and overdue contract expirations, calculates financial exposure, and triggers actionable, personalized multi-channel outreach (WhatsApp, Email, SMS).

### Core Problem It Solves
- **For B2B Buyers & IT Organizations**: Organizations lose millions annually to surprise auto-renewals, overlooked contract expirations, unbudgeted price jumps, and zombie software subscriptions. Manual spreadsheets lack accountability, contextual notifications, and escalation workflows.
- **For Service & Recurring Operations**: Service businesses lose 30–50% of repeatable repeat business simply because no one follows up when maintenance cycles or contract service windows expire.
- **The Core Promise**: *"Never lose a renewal or get blindsided by an auto-renewal you should have renegotiated or cancelled."*

---

## 2. Target Audience & Ideal Customer Profiles (ICPs)

### Primary Persona 1: IT Procurement & Vendor Management Leads
- **Profile**: Heads of IT Procurement, Vendor Management Office (VMO) Directors, Senior IT Buyers in mid-market companies (50–2,000 employees).
- **Core Jobs-to-be-Done**:
  - Maintain a centralized repository of all SaaS licenses, IT service contracts, and hardware support agreements.
  - Receive actionable 90/60/30-day early warnings prior to non-cancellable auto-renewal lock-in windows.
  - Track contract terms, renewal notice periods, price escalation caps, and vendor points of contact.
- **Pain Points**:
  - Silent auto-renewals rolling over without renegotiation leverage.
  - Scattered contract PDFs across Google Drive, email inboxes, and local desks.
  - Disconnected tracking between IT requester and central procurement.

### Primary Persona 2: Finance Heads, Controllers & CFOs
- **Profile**: CFOs, VPs of Finance, Corporate Financial Controllers.
- **Core Jobs-to-be-Done**:
  - Prevent cash-flow leaks and unexpected quarterly software / maintenance billing surprises.
  - Model forward-looking renewal liabilities and cash commitment forecasts.
  - Measure return on investment (ROI) and quantify recoverable revenue or potential waste reduction.
- **Pain Points**:
  - Unexpected annual invoice charges arriving with zero warning.
  - Lack of audit trail on who approved an auto-renewal.
  - Inability to quickly query upcoming 30/60/90-day cash renewal obligations across departments.

### Primary Persona 3: Startup CTOs & Engineering Operations
- **Profile**: Seed to Series B Tech Founders, CTOs, VP Engineering in lean teams.
- **Core Jobs-to-be-Done**:
  - Keep track of cloud infrastructure commitments, dev tool subscriptions (GitHub, AWS, Datadog, Figma, OpenAI), and operational service agreements without enterprise bloat.
  - Rapid, frictionless setup without months of enterprise implementation or complex agent installations.
- **Pain Points**:
  - Cannot justify spending \$15,000–\$30,000/year on enterprise SaaS management suites (Zylo, Torii, BetterCloud).
  - Free spreadsheets fall out of date within 3 weeks.

### Secondary Persona 4: Field & Commercial Service Operations Managers
- **Profile**: Service business owners and fleet operations directors (commercial HVAC, vehicle fleets, maintenance contracts, facility management).
- **Core Jobs-to-be-Done**:
  - Manage periodic asset maintenance schedules, warranty renewals, and recurring service agreements.
  - Dispatch customer follow-up alerts and secure service renewals directly via 1-click messaging (WhatsApp / SMS).

---

## 3. Product Architecture & Core Capabilities

```
+-----------------------------------------------------------------------------------+
|                                  RENEWALDESK CORE                                 |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ 1. Contract & Renewal Engine ]      [ 2. Action & Alert Queue ]                |
|  * Predictive Due-Date Engine          * Today's Prioritized Renewal Queue        |
|  * Configurable Cycle Intervals        * Overdue vs Due-Soon Status Matrix        |
|  * Notice Period & Renegotiation Gates * 1-Click Multi-Channel Dispatch (WA/Email)|
|                                                                                   |
|  [ 3. Dynamic Template & AI Studio ]   [ 4. Financial Analytics & ROI Dashboard ] |
|  * 10+ Standard Placeholders           * Overdue & Recoverable Revenue Forecaster |
|  * Context-Aware Variable Injection    * Renewal Conversion & Churn Ratios        |
|  * Zero-API-Cost Client AI Generator   * Cohort Health & Realized Revenue Audit   |
|                                                                                   |
|  [ 5. Enterprise Multi-Tenancy & Data Isolation ]                                 |
|  * Row-Level Security (PostgreSQL RLS) with complete workspace cryptographic wall |
|  * Zero Cross-Tenant Leakage across customers, schedules, and revenue data        |
|  * Bulk CSV Import with validation engine & deduplication safeguards              |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### 1. Smart Renewal Engine & Cycle Calculator
- Automatically projects contract renewal dates, expiration milestones, and notice-period deadlines based on custom recurrence cycles (days, months, or years).
- Computes exact days-overdue and urgency categories:
  - 🔴 **Overdue**: Critical renewal deadline passed; immediate renegotiation or retention required.
  - 🟠 **Due Soon**: Inside notice period window; action needed to renegotiate, benchmark, or cancel.
  - 🟢 **Upcoming / Healthy**: Active contract with runway.

### 2. Prioritized Daily Renewal Queue
- Consolidates all expiring subscriptions, vendor agreements, and customer contracts into an actionable daily triage queue.
- Replaces static reports with direct 1-click action triggers: launch pre-formatted outreach, log renewal decisions, mark completed services, or defer with notes.

### 3. Contextual Placeholder Engine & Client-Side AI Studio
- Dynamic template interpolation engine supporting standard variables: `{{customer_name}}`, `{{service_name}}`, `{{asset_name}}`, `{{due_date}}`, `{{days_overdue}}`, `{{business_name}}`, `{{business_phone}}`, `{{booking_date}}`, `{{next_due_date}}`.
- Built-in zero-cost AI Prompt Generator: Generates copy tuned for polite vendor inquiries, firm cancellation notices, aggressive renegotiations, or customer renewal reminders.

### 4. Results & Revenue Analytics
- Eliminates guesswork by tracking:
  - **Recoverable Renewal Pipeline**: Total dollar value of contracts up for renewal.
  - **Realized Renewals**: Revenue captured or contracts successfully renewed in the period.
  - **Overdue Exposure**: Financial volume at immediate risk of churn or unwanted auto-billing.
  - **Renewal Conversion Rate**: Real-time ratio of completed renewals vs total due.

### 5. Multi-Tenant Security & Architectural Rigor
- Built on Next.js 14, TypeScript, and PostgreSQL with enforced Row-Level Security (RLS).
- Guaranteed tenant isolation: each business or organizational department operates inside its own cryptographic workspace where cross-tenant reads, writes, and deletions are strictly blocked at the database engine level.

---

## 4. Pricing & Packaging Model

RenewalDesk uses a transparent, volume-indexed model with zero hidden implementation fees, designed to be accessible to early-stage teams while scaling seamlessly to large enterprises:

| Plan | Pricing (INR) | Pricing (USD Approx) | Capacity Limit | Best For | Key Capabilities |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Free Trial** | ₹0 | \$0 | Up to 25 items | Evaluation | Full access for 14 days, no credit card required |
| **Starter** | ₹49 / mo | ~\$0.60–\$5 / mo | Up to 25 active items | Solo admins & pilots | Core renewal engine, daily queue, manual dispatch |
| **Business** *(Popular)* | ₹199 / mo | ~\$15–\$25 / mo | Up to 250 active items | Growing B2B teams | Full automation, CSV fleet import, custom templates |
| **Business Growth** | ₹249 / mo | ~\$25–\$35 / mo | Up to 500 active items | Scaling IT departments | High-volume queues, analytics dashboard, AI studio |
| **Business Scale** | ₹299 / mo | ~\$35–\$45 / mo | Up to 1,000 active items | Mid-market enterprises | Advanced reporting, multi-cycle tracking, priority SLA |
| **Large Business** | ₹399 / mo | ~\$50–\$60 / mo | Up to 2,000 active items | High-volume procurement | Dedicated database capacity, full multi-seat support |
| **Founding Lifetime** | ₹599 one-time | ~\$75 one-time | Up to 100 active items | Early adopters | Pay once, perpetual license (strictly limited slots) |

*Note: For global B2B SaaS deployments, standard international pricing ranges from \$19/mo (Starter) to \$149/mo (Enterprise) with unlimited tracking.*

---

## 5. Competitive Differentiation

| Capability | RenewalDesk | Spreadsheets (Excel / Sheets) | Legacy SAM / ITAM (Zylo, Torii, ServiceNow) | Contract CLMs (Ironclad, PandaDoc) |
| :--- | :--- | :--- | :--- | :--- |
| **Setup Time** | Under 5 minutes | Immediate | 3–6 months | 1–3 months |
| **Cost Profile** | \$5–\$60 / month | Free | \$15,000–\$50,000+ / year | \$5,000–\$20,000 / year |
| **Active Outreach** | 1-Click WhatsApp, SMS, Email | None (Passive) | Email notification only | Email notification only |
| **Notice Period Tracking** | Automatic calculation | Manual formulas (fragile) | Built-in | Built-in |
| **Maintenance Burden** | Zero maintenance SaaS | High (constant rot) | High (requires dedicated admin) | Medium |
| **User Experience** | Clean, mobile-friendly queue | Cluttered grid | Complex enterprise dashboard | Document-centric |

---

## 6. Key Adoption Barriers, Risks & Simulation Objectives

For multi-agent market simulation and predictive analysis, the key hypotheses and friction points to test are:

1. **Willingness to Pay vs Spreadsheet Inertia**:
   - Will IT and finance buyers pay a monthly subscription for renewal tracking when they currently maintain internal Excel or Google Sheets, even though spreadsheets frequently fail to prevent auto-renewals?
2. **Feature Scope & Integration Expectations**:
   - Do B2B IT procurement leads require direct integrations with accounting systems (QuickBooks, NetSuite) or SSO / IdP (Okta, Google Workspace) before taking a renewal tracker seriously?
3. **Churn & Usage Frequency**:
   - Do users log in daily/weekly to work through the renewal queue, or do they only log in once a quarter, increasing risk of perceived low utility and subscription churn?
4. **Security & Data Sensitivity**:
   - Will enterprise finance and procurement officers upload proprietary vendor contracts and pricing terms without SOC2 Type II or ISO certifications?
5. **Pricing Power & Packaging**:
   - Is the entry-level pricing perceived as a high-value "no-brainer" utility, or does low pricing trigger skepticism regarding enterprise robustness? How does pricing elasticity behave among IT vs Finance vs Startup buyers?
