# RenewalDesk UI & Design System Guide

> **Product Loop**: *Remember $\rightarrow$ Remind $\rightarrow$ Book $\rightarrow$ Repeat*  
> **Target Audience**: Small service business owners and technicians in India (AC maintenance, RO/water purifiers, auto care, appliances).  
> **Design Philosophy**: Fast, linear, touch-first, zero technical jargon, and accessible on any device from 320px mobile screens to 1440px desktop displays.

---

## 1. Viewport & Layout Architecture

RenewalDesk utilizes a responsive, safe-area-aware shell that adapts dynamically across all screen sizes:

| Viewport Range | Navigation Pattern | Container Padding | Primary Actions |
|---|---|---|---|
| **< 768px** (Mobile) | Fixed bottom bar (`MobileNav`) + Floating Action Button (FAB) | `p-3` or `p-3.5`, `pb-24` | 44px touch targets, BottomSheet dialogs (`rounded-t-3xl`) |
| **768px – 1023px** (Tablet) | Collapsed 64px icon-only sidebar (`w-16`) | `p-6`, `pb-8` | Header buttons, centered modal dialogs |
| **$\ge$ 1024px** (Desktop) | Full 240px sidebar (`w-60`) | `p-8`, `max-w-7xl` | Proximity action clusters, centered modal dialogs |

### Core Rules for Viewports:
1. **No Horizontal Scroll**: Always apply `min-w-0` to flex child containers and truncate text where necessary.
2. **Safe-Area Insets**: Any fixed or bottom-anchored container must use `pb-safe` to prevent occlusion by iPhone home indicators or Android system navigation bars.
3. **Touch Targets**: All mobile buttons, links, and form inputs must have a minimum height/width of **44px** (`min-h-[44px]`).
4. **Prevent iOS Auto-Zoom**: All `<input>` and `<select>` elements use `text-base sm:text-sm` so iOS Safari never triggers automatic page zoom on focus.

---

## 2. Component Primitives (`components/ui/`)

All new features and pages should build exclusively upon the reusable primitives in `components/ui/`:

### 2.1 `AppShell`
Wraps every page with the top header, desktop sidebar, mobile bottom navigation, and global customer creation modal.
```tsx
import { AppShell } from '@/components/AppShell';

export default function MyPage() {
  return (
    <AppShell
      title="Page Title"
      subtitle="Short, clear explanation of what the user can do here."
      headerActions={<Button variant="primary" size="sm">Action</Button>}
    >
      <div className="space-y-4">
        {/* Page Content */}
      </div>
    </AppShell>
  );
}
```

### 2.2 `Button`
Provides standard interactive buttons with loading spinners, left/right icons, and accessible focus states.
- **Variants**: `primary` (blue), `secondary` (gray), `outline` (white with border), `ghost` (transparent), `danger` (red), `success` (emerald), `whatsapp` (green `#25D366`).
- **Sizes**:
  - `sm`: `min-h-[36px]` (desktop toolbars and compact tables).
  - `md`: `min-h-[44px]` (default for all mobile touch targets and modal footers).
```tsx
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';

<Button variant="primary" size="md" leftIcon={Plus} onClick={handleAction}>
  Add Customer
</Button>
```

### 2.3 `Card`
Standard surface for grouping related information, metrics, or forms.
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Supporting context for the section.</CardDescription>
  </CardHeader>
  <CardContent className="space-y-3">
    <p>Main content area.</p>
  </CardContent>
</Card>
```

### 2.4 `Modal` / `BottomSheet`
A single component that automatically adapts: renders as a bottom sheet (`rounded-t-3xl`) on mobile screens and a centered modal dialog on desktop.
- Features: Focus trapping, `Escape` key dismissal, outside backdrop click dismissal, body scroll locking, and accessible `role="dialog"`.
```tsx
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
  description="Explanatory helper text"
  footer={
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button variant="primary" size="sm" onClick={handleSave}>
        Confirm
      </Button>
    </div>
  }
>
  <div className="space-y-4">
    {/* Form inputs or dialog body */}
  </div>
</Modal>
```

### 2.5 `Input` & `Select`
Standard accessible inputs with built-in label pairing, helper text, error messages, and support for `ReactNode` labels (allowing inline `HelpTip` components).
```tsx
import { Input, Select, HelpTip } from '@/components/ui';

<Input
  label={
    <span className="inline-flex items-center gap-1.5">
      <span>Service Interval</span>
      <HelpTip content="How often maintenance repeats (e.g., every 6 months)." />
    </span>
  }
  required
  type="text"
  placeholder="e.g. 6"
  helperText="Auto-schedules next service date upon completion."
/>
```

### 2.6 `Toast`
Non-blocking notification system supporting `success`, `error`, and `undo` action toasts.
- **Never use native `alert()` or `confirm()`**. Always use `toast` or `Modal`.
```tsx
import { useToast } from '@/components/ui/Toast';

export function MyComponent() {
  const toast = useToast();

  const handleAction = () => {
    // Standard success notification
    toast.success('Customer saved successfully!');

    // Undo notification (5-second window)
    toast.undo(
      'Customer marked as Booked',
      () => restorePreviousState(),
      'Status Changed',
      5000
    );
  };
}
```

### 2.7 `HelpTip`
A compact circular `?` trigger that reveals contextual explanations on hover (desktop) or tap (mobile touch screens).
```tsx
import { HelpTip } from '@/components/ui/HelpTip';

<HelpTip
  title="Template Placeholders"
  content="Placeholders like {{customer_name}} are automatically filled when generating WhatsApp reminders."
/>
```

### 2.8 `EmptyState`
Uniform empty state for zero-record databases or caught-up tabs.
```tsx
import { EmptyState } from '@/components/ui/EmptyState';
import { Users, Plus, Upload } from 'lucide-react';

<EmptyState
  icon={Users}
  title="No Customers Yet"
  description="Add your first customer or upload an Excel spreadsheet to start tracking service cycles."
  primaryAction={{
    label: 'Add Customer',
    onClick: () => setShowModal(true),
    icon: Plus,
  }}
  secondaryAction={{
    label: 'Import CSV',
    onClick: () => router.push('/import'),
    icon: Upload,
  }}
/>
```

---

## 3. How to Add a New Page or Feature

Follow these steps to ensure new features seamlessly integrate with the existing application:

### Step 1: Create the Page Route (`app/<route>/page.tsx`)
```tsx
'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useRenewalDesk } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';

export default function MyNewFeaturePage() {
  const { business, isLoaded } = useRenewalDesk();
  const { isConfigured, isLoading: isAuthLoading } = useAuth();
  const toast = useToast();

  const isCloudLoading = isConfigured && (isAuthLoading || !isLoaded);

  if (isCloudLoading) {
    return (
      <AppShell title="Feature Title" subtitle="Description">
        <div className="space-y-4 animate-pulse">
          <div className="h-10 w-48 bg-gray-200 rounded-xl" />
          <div className="h-64 bg-white border border-gray-200 rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Feature Title"
      subtitle="Explain the feature simply without technical jargon."
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Section Header</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Feature Content */}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
```

### Step 2: Register in Navigation (if top-level)
- If the page is a top-level hub: add to `primaryNavItems` in `components/Sidebar.tsx` and `components/MobileNav.tsx`.
- If the page is a configuration tool: place it inside the Settings hub (`/settings`) or secondary tools menu. Keep mobile navigation to the canonical 4 items (Today, Customers, Results, Settings).

### Step 3: Add to Interactive Tutorial (if part of onboarding)
1. In `lib/tutorial-content.ts`, declare the step in `TUTORIAL_LESSONS`:
```ts
{
  id: 'l8-s1-my-feature',
  lessonNumber: 8,
  stepNumber: 1,
  totalStepsInLesson: 3,
  lessonTitle: 'My Feature',
  stepTitle: 'My Feature Name',
  instruction: 'Explain what this feature does for the shop owner.',
  explanation: 'Why it matters for recurring business.',
  targetSelector: '[data-tutorial="my-feature-target"]',
  placement: 'bottom',
}
```
2. Attach `data-tutorial="my-feature-target"` to the corresponding DOM element in your component.

---

## 4. Copywriting & Tone Guidelines

RenewalDesk is designed for local service businesses in India. Keep copy clear, respectful, and direct:

- **Do Say**:
  - *"Customer"* (not "User" or "Client profile")
  - *"Appliance"* or *"Vehicle"* (not "Asset entity")
  - *"Service interval"* (not "Cadence cron schedule")
  - *"Today's follow-up queue"* (not "Task backlog")
  - *"1-click WhatsApp reminder"* (not "wa.me API integration")
  - *"Connection issue — retry sync"* (not "Supabase PostgreSQL RLS error")
- **Don't Say**:
  - Never expose database or developer terms in user-facing UI: *PostgreSQL, Supabase, Row Level Security, RLS, Tenant isolation, Foreign keys, JWT, Webhooks*.
  - Keep developer diagnostics strictly behind `{isDev && ...}` and only render them in `NODE_ENV === 'development'`.
- **The Core Loop**:
  - Frame all workflows around the 4 stages: **Remember $\rightarrow$ Remind $\rightarrow$ Book $\rightarrow$ Repeat**.
