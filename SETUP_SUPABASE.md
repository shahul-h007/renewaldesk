# RenewalDesk — Supabase Backend & Database Setup Guide

RenewalDesk is designed with a **Hybrid Dual-Engine Architecture**:
1. **Cloud PostgreSQL Mode**: When Supabase credentials are configured in `.env.local`, the app uses Supabase Auth, PostgreSQL 16+, strict multi-tenant Row Level Security (RLS), and real-time persistence.
2. **Offline / Demo Mode**: When credentials are not yet set, the app runs smoothly with the pre-seeded Kochi AC/RO/Pest Control dataset in LocalStorage without throwing unhandled exceptions.

---

## 1. Create a Supabase Project

1. Go to [https://database.new](https://database.new) and log in with your Supabase account.
2. Create a new project:
   - **Name**: `renewaldesk-prod` (or any preferred name)
   - **Database Password**: Choose a strong password and save it securely.
   - **Region**: Select a region close to your target customers (e.g. `ap-south-1` Mumbai for India).
3. Wait 1–2 minutes for the database to provision.

---

## 2. Apply Database Schema & Migrations

1. In the Supabase Dashboard, open the **SQL Editor** from the left navigation bar.
2. Click **New Query**.
3. Open the migration file in your repository:
   `supabase/migrations/20261010_initial_schema.sql`
4. Copy the entire contents and paste it into the Supabase SQL Editor.
5. Click **Run**.
6. Verify that all 11 tables and helper functions were created:
   - `profiles`
   - `businesses`
   - `business_members`
   - `customers`
   - `assets`
   - `service_types`
   - `service_records`
   - `service_schedules`
   - `reminders`
   - `message_templates`
   - `activities`
   - Functions: `is_business_member`, `is_business_owner_or_manager`, `handle_new_user`, `create_business_and_owner`

---

## 3. Configure Supabase Authentication

### A. Site URL & Redirect URLs
1. In the Supabase Dashboard, navigate to **Authentication** > **URL Configuration**.
2. Set **Site URL** to:
   - Local: `http://localhost:3000`
   - Production: `https://your-domain.vercel.app`
3. Add to **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.vercel.app/auth/callback`

### B. Email & Password Provider
- Enabled by default under **Authentication** > **Providers** > **Email**.
- (Optional for development) Disable "Confirm email" if you want instant test sign-ups without email verification loops.

### C. Google OAuth Provider (Optional)
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create an **OAuth 2.0 Client ID** (Web Application).
3. Add Authorized Redirect URI:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. In Supabase Dashboard, go to **Authentication** > **Providers** > **Google**.
5. Enable Google and paste your **Client ID** and **Client Secret**.

---

## 4. Set Environment Variables

Create a `.env.local` file in the root directory `d:\project\renewal\.env.local` with your project keys:

```env
# Supabase API (found in Dashboard > Project Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxxxxxx

# Supabase Service Role Key (for administrative tasks / seed scripts)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxxxxxx

# App Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 5. First-Time Sign Up & Onboarding Flow

1. Start the development server:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:3000/signup`.
3. Sign up with your email and password.
4. You will be automatically redirected to `/onboarding`.
5. Enter your business details:
   - Business Name (e.g. *Kochi CoolCare Services*)
   - Phone (e.g. *+91 98470 12345*)
   - Industry (AC, RO, Pest Control, Appliance, etc.)
   - City / Locality (e.g. *Kochi*)
   - Currency (`INR ₹`)
   - Default Service Interval (`6 months`)
6. Click **Launch My Workspace**. The atomic procedure `create_business_and_owner` will initialize your business tenancy, assign your owner role, and seed your standard service catalog and WhatsApp templates.
7. You will land on your RenewalDesk dashboard with a live PostgreSQL Cloud connection badge.

---

## 6. Multi-Tenant Architecture & Security Model

- **Row Level Security (RLS)**: Every operational table has RLS enabled with policies checking `is_business_member(business_id)`.
- **Tenant Isolation**: Users can only read, insert, update, or delete records belonging to their active business workspace.
- **Service Type Safety**: Service types referenced by active schedules or historical service records cannot be deleted; they can only be deactivated.
- **Recurrence Engine**: Automatically calculates exact next service dates with month-end date clamping (Jan 31 -> Feb 28; Aug 31 -> Sep 30) and leap-year preservation.

---

## 7. Deploying to Vercel

1. Push your repository to GitHub:
   ```bash
   git push origin main
   ```
2. Connect your repository to [Vercel](https://vercel.com).
3. In Project Settings > Environment Variables, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (set to your Vercel production domain)
4. Trigger the deployment.
