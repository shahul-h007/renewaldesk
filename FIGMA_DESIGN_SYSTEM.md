# RenewalDesk — Master Figma Design System & Specification Manual
**Zero to Complete Product UI Architecture (0 to 9 & A to Z)**

---

## Executive Overview: The Design Thesis
RenewalDesk is an operational tool built for small, busy service businesses (air conditioning, water purifiers/RO, pest control, appliances).
- **Core Mission**: "Who do I need to follow up with today, how do I reach them on WhatsApp in one click, and how do I schedule their next service so they never churn?"
- **UX Tenet**: Action over analytics. Every screen must prioritize immediate operational throughput over passive reporting.
- **Figma Execution Philosophy**: 100% Auto Layout, strict 4px spacing rhythm, semantic Figma Local Variables, minimal variant overhead, and zero ambiguity for developers.

---

# PART I: THE 0 TO 9 NUMERICAL PILLARS

```
┌────────────────────────────────────────────────────────────────────────┐
│                      THE 0 TO 9 PILLARS AT A GLANCE                    │
│                                                                        │
│  0. Figma Canvas & File Hierarchy     5. Master Shell & Navigation     │
│  1. Variables, Tokens & Styles        6. Domain Component Architecture │
│  2. Grids & Viewport Constraints      7. Complete Screen Specifications│
│  3. Iconography & Brand Assets        8. Interactive Prototyping Flows │
│  4. Atomic UI Component Library       9. Developer Handoff & Design QA │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 0. FIGMA CANVAS & FILE HIERARCHY

Create a single Figma file named **`RenewalDesk — Product Design System`**. Organize your Figma Pages in the left sidebar in this exact order:

```
RENEWALDESK
│
├── ❖ 00 — Cover & Version Log
│
├── ❖ 01 — Design Foundations (Tokens, Grids, Typography, Colors)
├── ❖ 02 — Component Library (Buttons, Inputs, Badges, Modals)
├── ❖ 03 — Domain Components (Follow-up Cards, WhatsApp Preview, Mappers)
│
├── 🖥️ 04 — Marketing & Landing (Desktop + Mobile)
├── 🔐 05 — Authentication (Login, Signup, Recovery)
├── 🚀 06 — Onboarding Wizard (5 Steps)
│
├── ⚡ 07 — Dashboard / Follow-up Queue (The Core Screen)
├── 👥 08 — Customers & Customer Details
├── 📥 09 — CSV Import Flow (Upload, Mapping, Validation)
├── 🛠️ 10 — Services Catalog & Service Cycle Rules
├── 💬 11 — WhatsApp Templates & Live Preview
├── 📈 12 — Results & Recovered Revenue
├── ⚙️ 13 — Settings & Business Profile
│
├── 📱 14 — Mobile App Adaptations (All 8 Core Views)
├── ⚠️ 15 — States (Empty, Loading, Error, Edge Cases)
└── 🔗 16 — Interactive Prototype Flows
```

### Canvas Layer Organization Rules:
1. **Frame Naming**: Prefix all main screen frames with category and screen number (e.g., `D-01-Dashboard`, `M-01-Dashboard-Mobile`, `C-Modal-AddCustomer`).
2. **Sections**: Use Figma `Sections` (Shift + S) to group related frames visually on the canvas (e.g., Section: "Dashboard Flow", Section: "CSV Import Flow").
3. **No Loose Layers**: Every element on every canvas must live inside an Auto Layout Frame. No detached text boxes or unconstrained rectangles.

---

## 1. DESIGN TOKENS & VARIABLES ENGINE

Set up Figma **Local Variables** under the collection name **`RenewalDesk-Tokens`**.

### 1.1 Color Palette & Semantic Tokens

#### Primitives
| Token Name | Hex Code | Purpose |
| :--- | :--- | :--- |
| `primitive/blue/50` | `#EFF6FF` | Tint backgrounds, active row highlights |
| `primitive/blue/100` | `#DBEAFE` | Subtle badge backgrounds, active nav items |
| `primitive/blue/500` | `#3B82F6` | Interactive hover states |
| `primitive/blue/600` | `#2563EB` | **Primary Brand Color**, main CTA buttons |
| `primitive/blue/700` | `#1D4ED8` | Primary button pressed/active state |
| `primitive/gray/50` | `#F9FAFB` | App background, subtle table header fill |
| `primitive/gray/100` | `#F3F4F6` | Card borders, secondary button background |
| `primitive/gray/200` | `#E5E7EB` | Dividers, input borders, table borders |
| `primitive/gray/300` | `#D1D5DB` | Placeholder text, disabled borders |
| `primitive/gray/400` | `#9CA3AF` | Inactive icons, helper text |
| `primitive/gray/500` | `#6B7280` | Secondary labels, timestamps |
| `primitive/gray/700` | `#374151` | Body copy, table cell content |
| `primitive/gray/900` | `#111827` | Primary headings, titles |
| `primitive/green/50` | `#F0FDF4` | Success background tint |
| `primitive/green/100` | `#DCFCE7` | Completed badge fill |
| `primitive/green/600` | `#16A34A` | Completed status, success icons |
| `primitive/green/whatsapp` | `#25D366` | **WhatsApp Action Accent** |
| `primitive/green/whatsapp-dark` | `#128C7E` | WhatsApp button hover/pressed |
| `primitive/red/50` | `#FEF2F2` | Error input fill, alert tint |
| `primitive/red/100` | `#FEE2E2` | Overdue status badge fill |
| `primitive/red/600` | `#DC2626` | Overdue text, danger action buttons |
| `primitive/orange/50` | `#FFF7ED` | Due today background tint |
| `primitive/orange/100` | `#FFEDD5` | Due today badge fill |
| `primitive/orange/600` | `#EA580C` | Due today label, urgency markers |
| `primitive/amber/100` | `#FEF3C7` | Due this week badge fill |
| `primitive/amber/600` | `#D97706` | Due this week text |

#### Semantic Color Mappings (Variables)
- `color/bg/canvas` → `primitive/gray/50` (`#F9FAFB`)
- `color/bg/surface` → `#FFFFFF`
- `color/bg/subtle` → `primitive/gray/100` (`#F3F4F6`)
- `color/text/primary` → `primitive/gray/900` (`#111827`)
- `color/text/secondary` → `primitive/gray/500` (`#6B7280`)
- `color/text/inverted` → `#FFFFFF`
- `color/border/default` → `primitive/gray/200` (`#E5E7EB`)
- `color/border/focus` → `primitive/blue/600` (`#2563EB`)
- `color/action/primary` → `primitive/blue/600` (`#2563EB`)
- `color/action/whatsapp` → `primitive/green/whatsapp` (`#25D366`)
- `color/status/overdue-bg` → `primitive/red/100` (`#FEE2E2`)
- `color/status/overdue-text` → `primitive/red/600` (`#DC2626`)
- `color/status/today-bg` → `primitive/orange/100` (`#FFEDD5`)
- `color/status/today-text` → `primitive/orange/600` (`#EA580C`)
- `color/status/week-bg` → `primitive/amber/100` (`#FEF3C7`)
- `color/status/week-text` → `primitive/amber/600` (`#D97706`)
- `color/status/completed-bg` → `primitive/green/100` (`#DCFCE7`)
- `color/status/completed-text` → `primitive/green/600` (`#16A34A`)

### 1.2 Spacing Variables (Strict 4px Scale)
- `space/1`: `4px`
- `space/2`: `8px`
- `space/3`: `12px`
- `space/4`: `16px` (Standard component internal padding)
- `space/5`: `20px`
- `space/6`: `24px` (Card padding, standard layout gap)
- `space/8`: `32px` (Section gap)
- `space/10`: `40px`
- `space/12`: `48px`
- `space/16`: `64px` (Page margin desktop)

### 1.3 Border Radius Variables
- `radius/sm`: `6px` (Badges, tags, small inputs)
- `radius/md`: `8px` (Buttons, form fields, table cell cards)
- `radius/lg`: `12px` (Cards, dialog modals, drawers)
- `radius/xl`: `16px` (Hero containers, large callouts)
- `radius/full`: `9999px` (Pill badges, avatars)

### 1.4 Elevation & Shadows
- `shadow/xs`: `0px 1px 2px rgba(16, 24, 40, 0.05)` (Table rows, compact cards)
- `shadow/sm`: `0px 1px 3px rgba(16, 24, 40, 0.10), 0px 1px 2px rgba(16, 24, 40, 0.06)` (Cards, filter bars)
- `shadow/md`: `0px 4px 8px -2px rgba(16, 24, 40, 0.10), 0px 2px 4px -2px rgba(16, 24, 40, 0.06)` (Dropdowns, popovers)
- `shadow/lg`: `0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03)` (Slide-out drawers)
- `shadow/xl`: `0px 20px 24px -4px rgba(16, 24, 40, 0.12), 0px 8px 8px -4px rgba(16, 24, 40, 0.04)` (Modals)

### 1.5 Typography Styles (Typeface: Inter)
| Style Name | Font Size | Weight | Line Height | Tracking | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Display/Large` | `48px` | Bold (700) | `56px` | `-0.02em` | Marketing Hero Headline |
| `Heading/H1` | `32px` | Bold (700) | `40px` | `-0.02em` | Page Title (Dashboard greeting) |
| `Heading/H2` | `24px` | SemiBold (600) | `32px` | `-0.01em` | Section Titles, Modal Headers |
| `Heading/H3` | `20px` | SemiBold (600) | `28px` | `0em` | Card Titles, Drawer Headers |
| `Heading/H4` | `16px` | SemiBold (600) | `24px` | `0em` | Subheadings, Table Header groups |
| `Body/Large` | `16px` | Regular (400) | `24px` | `0em` | Explanatory text, onboarding intro |
| `Body/Regular` | `14px` | Regular (400) | `20px` | `0em` | Table data, form inputs, notes |
| `Body/Medium` | `14px` | Medium (500) | `20px` | `0em` | Form labels, table cell primary text |
| `Body/SemiBold`| `14px` | SemiBold (600) | `20px` | `0em` | Button labels, customer names |
| `Caption/Regular`| `12px` | Regular (400) | `16px` | `0em` | Timestamps, helper text |
| `Caption/Medium` | `12px` | Medium (500) | `16px` | `0.01em` | Badges, status tags |
| `Kpi/Number` | `32px` | Bold (700) | `36px` | `-0.02em` | Large Metric Count (KPI Cards) |

---

## 2. GRIDS, VIEWPORTS & RESPONSIVE RULES

### 2.1 Standard Frame Sizes
- **Desktop (Primary Target)**: `1440px` width × `1024px` height (Application view container: `1440px` × `900px`)
- **Tablet / Small Laptop**: `1024px` width × `768px` height
- **Mobile (Primary Mobile Target)**: `390px` width × `844px` height (iPhone 14/15 standard)

### 2.2 Layout Grids
```
DESKTOP (1440px):
├── Left Sidebar: 240px Fixed
└── Main Content Container: 1200px
    ├── Margin: 32px Left & Right
    ├── Columns: 12 Columns
    └── Gutter: 24px

MOBILE (390px):
├── Top Navigation / Status: 44px + 56px
├── Main Content Container: 390px
    ├── Margin: 16px Left & Right
    ├── Columns: 4 Columns
    └── Gutter: 12px
└── Bottom Tab Bar: 64px Fixed Height (+ home indicator 20px)
```

---

## 3. ICONOGRAPHY & BRAND ASSETS

### 3.1 The Icon System: Lucide Icons
Use the **Lucide Icons** Figma plugin or official SVG set.
- **Default Size**: `20px × 20px` bounding box for all UI controls and navigation.
- **Micro Size**: `16px × 16px` for badges, table sort indicators, and inline metadata.
- **Stroke Width**: `1.75px` or `2.0px` uniform stroke.
- **Core Icon Set**:
  - Navigation: `LayoutDashboard`, `Users`, `RefreshCw`, `Wrench`, `MessageSquare`, `BarChart2`, `Settings`
  - Actions: `Plus`, `Search`, `Filter`, `Upload`, `Phone`, `ExternalLink`, `MoreVertical`, `Check`, `X`, `ChevronDown`, `ArrowRight`
  - Domain: `Clock`, `Calendar`, `AlertCircle`, `CheckCircle2`, `DollarSign`, `Building2`

### 3.2 The Brandmark & Logo
- **Symbol**: A modern geometric renewal loop. Two intertwined circular arrows forming a continuous cycle, with a solid center dot representing the retained customer.
  - Dimensions: `32px × 32px` in sidebar; `40px × 40px` on auth screens.
  - Fill: Gradient from `primitive/blue/600` (`#2563EB`) to `primitive/blue/500` (`#3B82F6`).
- **Wordmark**: `Renewal` (Inter Regular 600, `#111827`) + `Desk` (Inter Bold 700, `#2563EB`).

---

## 4. ATOMIC & MOLECULAR COMPONENT LIBRARY

Build these components in Figma page `❖ 02 — Component Library` before designing any screen.

### 4.1 Buttons (`Button`)
Create a single component with variants:
- **Variant Properties**:
  - `Variant`: `Primary` | `WhatsApp` | `Secondary` | `Ghost` | `Danger`
  - `Size`: `Small` (32px H) | `Medium` (40px H) | `Large` (48px H)
  - `State`: `Default` | `Hover` | `Pressed` | `Disabled` | `Loading`
  - `IconLeading`: Boolean (Default: false)
  - `IconTrailing`: Boolean (Default: false)

#### Auto Layout & Style Matrix for Size Medium (40px H):
| Variant | Background Fill | Border | Text Color / Style | Icon Fill/Stroke | Padding |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary** | `#2563EB` | None | `#FFFFFF`, `Body/SemiBold` | `#FFFFFF` | L/R: 16px, T/B: 10px, Gap: 8px |
| **WhatsApp** | `#25D366` | None | `#FFFFFF`, `Body/SemiBold` | `#FFFFFF` | L/R: 16px, T/B: 10px, Gap: 8px |
| **Secondary**| `#FFFFFF` | 1px solid `#E5E7EB` | `#374151`, `Body/SemiBold`| `#6B7280` | L/R: 16px, T/B: 10px, Gap: 8px |
| **Ghost** | Transparent | None | `#6B7280`, `Body/SemiBold`| `#6B7280` | L/R: 12px, T/B: 10px, Gap: 8px |
| **Danger** | `#DC2626` | None | `#FFFFFF`, `Body/SemiBold` | `#FFFFFF` | L/R: 16px, T/B: 10px, Gap: 8px |

### 4.2 Status & Urgency Badges (`Badge/Status`)
Create pill components (`radius/full`, Height: 24px, Padding: 4px 10px, Gap: 4px):
- **Overdue**: Fill: `#FEE2E2`, Text: `#DC2626`, Icon: `AlertCircle` (12px, red). Text: `"Overdue"`
- **Due Today**: Fill: `#FFEDD5`, Text: `#EA580C`, Icon: `Clock` (12px, orange). Text: `"Due Today"`
- **Due This Week**: Fill: `#FEF3C7`, Text: `#D97706`, Icon: `Calendar` (12px, amber). Text: `"Due This Week"`
- **Contacted**: Fill: `#DBEAFE`, Text: `#1D4ED8`, Icon: `MessageSquare` (12px, blue). Text: `"Contacted"`
- **Booked**: Fill: `#E0E7FF`, Text: `#4338CA`, Icon: `Calendar` (12px, indigo). Text: `"Booked"`
- **Completed**: Fill: `#DCFCE7`, Text: `#16A34A`, Icon: `CheckCircle2` (12px, green). Text: `"Completed"`
- **Not Interested**: Fill: `#F3F4F6`, Text: `#6B7280`, Icon: `X` (12px, gray). Text: `"Not Interested"`

### 4.3 Form Inputs (`Input/Text`)
- **Dimensions**: Height: 40px, Corner Radius: 8px, Fill: `#FFFFFF`, Border: 1px solid `#E5E7EB`.
- **Auto Layout**: Horizontal, Padding: L/R 12px, T/B 10px, Gap: 8px, Align: Left Center.
- **Variants**:
  - `State`: `Default` (Border: `#E5E7EB`) | `Focus` (Border: 2px solid `#2563EB`) | `Error` (Border: 1.5px solid `#DC2626`, Fill: `#FEF2F2`) | `Disabled` (Fill: `#F3F4F6`, Text: `#9CA3AF`)
  - `LeadingIcon`: Boolean
  - `TrailingAction`: Boolean (e.g. eye icon for password)
- **Label Structure**: Component contains Vertical Auto Layout:
  1. Label Text: `14px Medium`, `#374151` + Optional Red Asterisk (`*`)
  2. Input Container Frame (40px H)
  3. Helper / Error Text: `12px Regular`, `#6B7280` or `#DC2626`

### 4.4 Dashboard KPI Metric Cards (`Card/KPI`)
- **Frame**: Auto Layout Vertical, Width: 268px (Fill in 12-col layout), Height: Hug Contents, Padding: 20px, Gap: 12px.
- **Fill**: `#FFFFFF`, Border: 1px solid `#E5E7EB`, Corner Radius: 12px, Shadow: `shadow/xs`.
- **Internal Layers**:
  1. **Top Row** (Horizontal Auto Layout, Space Between):
     - Metric Label: `Body/Medium`, `#6B7280` (e.g., "Overdue Follow-ups")
     - Metric Icon Container: `32px × 32px` Frame, Radius: 8px, Fill (tint), Icon 18px.
  2. **Middle Value Row** (Horizontal Auto Layout, Gap: 8px, Align: Bottom):
     - Count Value: `Kpi/Number` (32px Bold), `#111827` (e.g., `"13"`)
     - Delta Pill: Height 20px, Radius full, Fill `#FEE2E2`, Text: `Caption/Medium` `#DC2626` (`"↑ 3 new"`)
  3. **Bottom Context**: `Caption/Regular`, `#9CA3AF` (e.g., `"Needs immediate WhatsApp contact"`)

---

## 5. MASTER SHELL & NAVIGATION STRUCTURES

### 5.1 Desktop Shell Layout (1440px × 900px)
```
┌────────────────────────────────────────────────────────────────────────┐
│ [Sidebar: 240px Fixed] │ [Top Header Bar: 1200px × 64px Fixed]         │
│                        ├───────────────────────────────────────────────┤
│ Logo (RenewalDesk)     │ Page Title & Breadcrumb  │ [Search] [Profile] │
│ ────────────────────── ├───────────────────────────────────────────────┤
│ ⌂ Overview             │                                               │
│ 🔄 Follow-up Queue (18)│                                               │
│ 👥 Customers           │              MAIN CONTENT CANVAS              │
│ 🛠 Services             │              (Auto Layout Scroll)             │
│ 💬 Message Templates   │              Padding: 32px                    │
│ 📊 Recovered Results   │                                               │
│ ⚙ Settings             │                                               │
│ ────────────────────── │                                               │
│ [Business Profile Card]│                                               │
└────────────────────────┴───────────────────────────────────────────────┘
```

#### Sidebar Layer Hierarchy:
- **Frame**: Width: 240px, Height: 100% (Fixed), Fill: `#FFFFFF`, Border-Right: 1px solid `#E5E7EB`, Padding: 20px 16px, Auto Layout Vertical, Gap: Space Between.
- **Top Block**:
  - Brand Header: `Height: 40px`, Horizontal Auto Layout, Logo + Text "RenewalDesk".
  - Spacer: 24px.
  - Nav Items List: Vertical Auto Layout, Gap: 4px.
    - Each Nav Item: Height: 40px, Radius: 8px, Padding: 8px 12px, Horizontal Auto Layout, Gap: 12px.
    - Active Item: Fill `#EFF6FF`, Text `#1D4ED8` (`Body/SemiBold`), Icon `#1D4ED8`. Includes right-aligned Pill Count (e.g., `"18"` in `#2563EB`).
    - Inactive Item: Fill Transparent, Text `#4B5563` (`Body/Medium`), Icon `#6B7280`. Hover Fill: `#F9FAFB`.
- **Bottom Block**:
  - Divider: 1px `#E5E7EB`.
  - User Card: Horizontal Auto Layout, Gap: 10px, Padding: 8px.
    - Avatar: 36px circular frame, initials or photo.
    - Info: Name "Shahul Hameed" (`14px SemiBold`), Role "Kochi AC Care (Owner)" (`12px Regular`, `#6B7280`).

---

## 6. DOMAIN-SPECIFIC COMPLEX COMPONENTS

### 6.1 The Crown Jewel: Follow-up Queue Item Row (`Row/FollowUp`)
This is the single most important component in the entire product.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [ ] │ Arun Kumar              │ Split AC (1.5T)      │ 🔴 Overdue (5 days) │ ₹1,200 │ [ WhatsApp ]   │
│     │ +91 98460 12345 · Kochi │ Samsung Inverter     │ Last: 10 Apr 2026   │        │ [ Call ] [ ⋮ ] │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Frame**: Horizontal Auto Layout, Width: Fill Container (1136px), Height: Hug Contents (approx 72px), Padding: 16px 20px, Gap: 16px, Align: Center.
- **Fill**: `#FFFFFF`, Border-Bottom: 1px solid `#F3F4F6`. Hover state: Fill `#F9FAFB`.
- **Layer Columns**:
  1. **Selection Checkbox**: 18px × 18px checkbox frame.
  2. **Customer Identity** (Width: 240px, Vertical Auto Layout, Gap: 4px):
     - Name: `Body/SemiBold`, `#111827` ("Arun Kumar")
     - Metadata: `Caption/Regular`, `#6B7280` ("+91 98460 12345 • Edappally, Kochi")
  3. **Asset & Service** (Width: 220px, Vertical Auto Layout, Gap: 4px):
     - Asset: `Body/Medium`, `#374151` ("Samsung Split AC (1.5T)")
     - Service Type: `Caption/Regular`, `#6B7280` ("Standard Periodic Service")
  4. **Due Status & History** (Width: 200px, Vertical Auto Layout, Gap: 4px):
     - Badge: `Badge/Status` (Variant: `Overdue` or `Due Today`)
     - Subtitle: `Caption/Regular`, `#9CA3AF` ("Last serviced: 10 Apr 2026")
  5. **Expected Revenue** (Width: 100px):
     - Value: `Body/SemiBold`, `#111827` ("₹1,200")
  6. **Immediate Action Cluster** (Width: 240px, Horizontal Auto Layout, Gap: 8px, Align: Right Center):
     - **WhatsApp Button**: Variant `WhatsApp`, Size `Small` (36px H), Icon `MessageSquare`, Label `"WhatsApp"`.
     - **Call Button**: Variant `Secondary`, Size `Small` (36px H), Icon `Phone`.
     - **Quick Status Dropdown**: Variant `Ghost`, Icon `MoreVertical` (Click opens status changer: Mark Booked, Mark Completed, Not Interested).

### 6.2 Live WhatsApp Message Preview Drawer (`Drawer/WhatsAppPreview`)
Used in templates and when triggering follow-ups.
- **Drawer Container**: Fixed Width: 440px, Height: 100% viewport, Fill: `#FFFFFF`, Shadow: `shadow/xl`.
- **Header**: Height: 64px, Title "Preview WhatsApp Message", Close Button `X`.
- **Target Details Bar**: Gray box (`#F9FAFB`) showing Recipient: Arun Kumar (`+91 98460 12345`).
- **Simulated WhatsApp Screen** (Padding: 20px, Fill: `#EFEAE2` with subtle WhatsApp chat pattern):
  - **Chat Bubble Frame**: Auto Layout Vertical, Width: 320px, Fill: `#FFFFFF`, Corner Radius: `0px 12px 12px 12px`, Padding: 12px 14px, Gap: 6px, Shadow: `shadow/xs`.
  - Bubble Message Text (`14px Regular`, `#111827`, Line Height: 20px):
    ```text
    Hi Arun, this is Kochi AC Care.

    Your Samsung Split AC service was last completed on 10 Apr 2026 and is now due for periodic maintenance.

    Regular servicing prevents compressor failure and reduces power bills. Would you like us to book a slot this week?
    ```
  - Bubble Footer: Right-aligned timestamp `"09:41 AM"` + double gray ticks.
- **Action Footer**: Fixed at drawer bottom, Padding: 16px 20px, Fill: `#FFFFFF`, Border-Top: 1px `#E5E7EB`.
  - Button: Primary WhatsApp Green (`#25D366`), Full Width (400px), 44px H, Label: `"Open in WhatsApp & Mark Contacted"` (opens `wa.me` URL).

### 6.3 CSV Column Mapper Row (`Row/ColumnMapper`)
- **Frame**: Horizontal Auto Layout, Width: 680px, Height: 56px, Padding: 8px 16px, Gap: 16px, Align: Center, Border: 1px solid `#E5E7EB`, Radius: 8px, Fill: `#FFFFFF`.
- **Columns**:
  1. Source Excel Column Name (Width: 200px, Badge style `#F3F4F6`, Label: `"Customer Mobile"`)
  2. Directional Indicator: `ArrowRight` (16px, `#9CA3AF`)
  3. Destination RenewalDesk Field (Width: 220px, Select Dropdown, Selected: `"Phone Number *"`)
  4. Sample Extracted Data: `Caption/Regular`, `#6B7280` (`"e.g., 9846012345"`)
  5. Match Status: Green checkmark icon `Check` if matched automatically.

---

## 7. COMPLETE SCREEN-BY-SCREEN SPECIFICATIONS

### 7.1 Frame `D-01-Dashboard`: The Follow-up Command Center
*Viewport: 1440 × 1024 | Scroll Container: Vertical Auto Layout, Padding: 32px, Gap: 28px*

1. **Header Row** (Horizontal Auto Layout, Space Between):
   - Left: Greeting `"Good morning, Shahul 👋"` (`Heading/H1`, 32px Bold) + Subtitle `"You have 18 customers due for follow-up today."` (`Body/Large`, `#6B7280`).
   - Right: Action Buttons:
     - Secondary Button: Icon `Upload`, Label `"Import CSV"`
     - Primary Button: Icon `Plus`, Label `"+ Add Customer"`
2. **KPI Metrics Grid** (Horizontal Auto Layout, 4 columns, Gap: 20px):
   - Card 1: **Overdue** → Count: `13`, Badge: `+3 new`, Color: Red theme, Context: `Oldest: 18 days overdue`.
   - Card 2: **Due Today** → Count: `5`, Badge: `Action required`, Color: Orange theme, Context: `Target for 10 AM calls`.
   - Card 3: **Due This Week** → Count: `41`, Badge: `Upcoming`, Color: Amber theme, Context: `Scheduled follow-ups`.
   - Card 4: **Recovered This Month** → Value: `₹18,400`, Badge: `14 completed`, Color: Green theme, Context: `Direct repeat revenue`.
3. **Queue Section Container** (Fill Container, Auto Layout Vertical, Radius: 12px, Border: 1px `#E5E7EB`, Fill: `#FFFFFF`, Shadow: `shadow/xs`):
   - **Queue Header & Filter Tabs** (Height: 56px, Padding: 12px 20px, Space Between, Border-Bottom: 1px `#E5E7EB`):
     - Tabs (Horizontal Auto Layout, Gap: 8px):
       - Tab `All Due (18)` (Inactive)
       - Tab `🔴 Overdue (13)` (Active: Fill `#FEE2E2`, Text `#DC2626`, SemiBold)
       - Tab `🟠 Due Today (5)` (Inactive)
       - Tab `🟡 This Week (41)` (Inactive)
     - Filter Controls (Right): Search box (`"Search customer or phone..."`, 240px W) + Filter Dropdown (`"Service: All Services"`).
   - **Table Column Headers Bar** (Height: 40px, Fill `#F9FAFB`, Border-Bottom: 1px `#E5E7EB`, Text: `12px Medium`, `#6B7280`):
     - Columns: `[ ]` (Checkbox), `CUSTOMER`, `APPLIANCE / ASSET`, `SERVICE STATUS`, `REVENUE`, `ACTIONS`.
   - **Queue Rows (Vertical Auto Layout)**:
     - 7 × `Row/FollowUp` (Populated with real realistic Kochi AC data: Arun Kumar, Faisal Mohammed, Priya Nair, George Varghese, Nikhil Raj, Anjali Menon, Sneha Paul).
   - **Queue Footer / Pagination**:
     - Height: 48px, Padding: 12px 20px, Left: `"Showing 7 of 18 pending follow-ups"`, Right: `"Page 1 of 3 >"`.

### 7.2 Frame `D-02-Customers`: Customer Directory
*Viewport: 1440 × 1024*
- **Action Bar**: Search input with keyboard shortcut pill (`⌘K`), Service dropdown, Status filter (`Active`, `Overdue`, `Churned`), Sort by (`Next Due Date (Ascending)`).
- **Data Table**:
  - Columns: `Name & Phone`, `Address / Locality`, `Assets (e.g. 2 ACs)`, `Last Service Date`, `Next Due Date`, `Lifecycle Status`, `Actions`.
  - Row Hover: Highlights blue, click opens Customer Detail Drawer.

### 7.3 Frame `D-03-CustomerDrawer`: Customer 360 & Timeline Drawer
*Slide-in Overlay: 540px Width, Anchored Right*
- **Header Section**:
  - Name: `"Arun Kumar"` (`Heading/H2`), Badges: `[Active Customer]`, `[Overdue: 5 Days]`.
  - Direct Actions: `[ WhatsApp Message ]` (Green) `[ Call +91 98460... ]` (Secondary).
- **Tabbed Body**:
  - Tabs: `Overview & Assets` | `Service History Timeline` | `Notes`.
- **Asset Card Block**:
  - Card 1: `"Samsung Inverter Split AC (1.5 Ton)"`, Location: `"Master Bedroom"`, Installed: `"14 Apr 2024"`, Interval: `"6 Months"`.
- **Service Timeline Component**:
  - Node 1 (Upcoming / Overdue): Red dot, `"Scheduled Due: 10 Oct 2026"`, Action: `[Mark Completed]`.
  - Connector line (Gray dashed).
  - Node 2 (Past): Green check, `"10 Apr 2026 — General AC Service"`, Value: `"₹1,200"`, Technician: `"Staff: Biju"`.
  - Node 3 (Past): Green check, `"12 Oct 2025 — Deep Water Jet Cleaning"`, Value: `"₹1,800"`.

### 7.4 Frame `D-04-ImportWizard`: 3-Step CSV Upload
*Viewport: 1440 × 1024 | Modal Container: 760px Width, Center-aligned*

1. **Step Indicator Progress Bar** (3 steps: `1. Upload File` → `2. Map Columns` → `3. Validate & Confirm`).
2. **Step 1 (Upload)**:
   - Drag & Drop Dropzone: 680px × 240px, Dashed Border (2px, `#D1D5DB`), Icon `UploadCloud` (48px, blue), Title `"Click to upload or drag CSV/Excel"`, Subtitle `"Supports .csv, .xlsx, .xls up to 10MB"`.
   - Sample Template Download Link: `"Download clean AC service Excel template (.xlsx)"`.
3. **Step 2 (Column Mapping)**:
   - Mapping Table showing uploaded file columns on left, RenewalDesk fields on right.
4. **Step 3 (Validation Preview)**:
   - Summary Banner (Green/Amber):
     - `✓ 1,211 customers ready to import`
     - `⚠ 24 rows missing valid phone numbers (will be flagged)`
     - `⚠ 8 rows missing last service date (will default to 6-month interval)`
   - CTA: Primary Button `"Confirm & Import 1,211 Customers"`.

### 7.5 Frame `D-05-Templates`: WhatsApp Template Manager
*Viewport: 1440 × 1024*
- **Left Column (560px W)**: Template Configuration.
  - Template Selector Tabs: `[Due Soon (7 Days)]` `[Due Today]` `[Overdue Follow-up]` `[Service Completed & Next Cycle]`.
  - Template Name Input: `"Standard AC Overdue Reminder (Malayalam/English)"`.
  - Dynamic Variable Pills (Clickable tags that insert into textarea):
    - `{{customer_name}}`, `{{service_name}}`, `{{asset_name}}`, `{{last_service_date}}`, `{{business_name}}`, `{{business_phone}}`.
  - Textarea: 200px Height with live character count.
- **Right Column (540px W)**: Live Interactive WhatsApp Device Mockup.
  - Real-time renders the text entered in the left column, replacing `{{customer_name}}` with `"Arun Kumar"`, `{{asset_name}}` with `"Samsung Split AC"`.

### 7.6 Frame `D-06-Results`: Recovered Revenue & ROI Proof
*Viewport: 1440 × 1024*
- **Hero Revenue Card** (Fill Container, Height: 160px, Gradient Subtle Blue Fill, Padding: 28px):
  - Label: `"Total Recovered Repeat Revenue (This Month)"`
  - Big Metric: `"₹34,800"` (`Display/Large`, `#111827`)
  - Subtext: `"29 repeat bookings secured that would have otherwise churned to competitors."`
- **The 5-Stage Conversion Funnel Visualizer**:
  - Horizontal funnel blocks with conversion drop-offs:
    - Stage 1: `142 Due Customers` (100%)
    - Stage 2: `118 Contacted via WhatsApp` (83%)
    - Stage 3: `44 Customer Replies` (37% response rate)
    - Stage 4: `31 Bookings Confirmed` (70% booking rate)
    - Stage 5: `29 Completed Services` (93% realization)
- **Breakdown Table**: Revenue recovered by appliance type (Split AC, Window AC, Water Purifier AMC).

### 7.7 Frame `D-07-Onboarding`: The 5-Minute Setup Wizard
*Clean Viewport (No Sidebar, Centered 640px Card)*
- Step 1: **Business Identity** (Business Name e.g. "Kochi Chill AC Services", Vertical: Dropdown [Air Conditioning, RO Water Purifier, Pest Control, Home Appliances], Phone Number).
- Step 2: **Default Service Cadence** (Service Type: "AC General Service", Repeat Interval: [ 6 ] Months, Average Bill Value: ₹ [ 1,200 ]).
- Step 3: **Import First Data** (Choose: "Upload Customer Spreadsheet" or "Add 3 Sample Customers to Test").
- Step 4: **Aha! Moment Trigger** (Show modal: `"We found 18 customers overdue right now! Let's send your first WhatsApp message."` → Button: `"Go to Today's Follow-ups"`).

---

## 8. INTERACTIVE CLICKABLE PROTOTYPING BLUEPRINT

Configure these Figma Prototype connections in page `🔗 16 — Interactive Prototype Flows`:

### Flow 1: The Core Value Loop ("The 60-Second Recovery")
1. **Start Frame**: `D-01-Dashboard`
2. **Action 1**: User clicks button `[ WhatsApp ]` on row Arun Kumar.
   - *Interaction*: `On click` → `Open Overlay`
   - *Target*: `Drawer/WhatsAppPreview`
   - *Animation*: Slide In from Right (300ms, Ease-out cubic: `[0, 0, 0.2, 1]`)
3. **Action 2**: Inside Drawer, user clicks `[ Open in WhatsApp & Mark Contacted ]`.
   - *Interaction*: `On click` → Close Overlay AND update row badge to `"Contacted"` (`#DBEAFE`).
   - *Toast notification pops up*: `"WhatsApp opened • Arun marked as Contacted"` (Bottom-right, 4s dissolve).
4. **Action 3**: User clicks `[ ⋮ ]` on Arun Kumar → Selects `"Mark Booked"`.
   - *Interaction*: `On click` → `Open Overlay` (`Modal/ConfirmBooking`).
   - *Modal Content*: Date Picker for booking appointment slot (e.g., `"Tomorrow, 11:00 AM"`).
5. **Action 4**: Click `"Confirm Booking"`.
   - *Interaction*: Row moves to tab `"Booked"`.
6. **Action 5**: Inside Customer Drawer, user clicks `[ Mark Service Completed ]`.
   - *Interaction*: `Open Overlay` (`Modal/CompleteService`).
   - *Automated Calculation Preview*:
     ```text
     Current Service Date: 08 Oct 2026
     Configured Interval: 6 Months
     ──────────────────────────────────────────
     Next Service Due Date: 08 Apr 2027
     ```
   - *CTA*: Click `"Complete & Schedule Next Cycle"`.
7. **Destination Result**: Dashboard KPI `Recovered This Month` increments by `+₹1,200` with celebratory micro-animation.

---

## 9. DEVELOPER HANDOFF & DESIGN QA STANDARDS

### 9.1 Tailwind CSS Class Mapping Table for Engineers
Provide this table directly in Figma's Dev Mode / Annotation panel:

| Figma Token | CSS / Tailwind Equivalent |
| :--- | :--- |
| `primitive/blue/600` | `bg-blue-600` / `text-blue-600` (`#2563EB`) |
| `primitive/green/whatsapp` | `bg-[#25D366]` / `hover:bg-[#128C7E]` |
| `color/status/overdue-bg` | `bg-red-100` (`#FEE2E2`) |
| `color/status/overdue-text`| `text-red-700` (`#B91C1C`) |
| `radius/md` (8px) | `rounded-lg` (`0.5rem`) |
| `radius/lg` (12px) | `rounded-xl` (`0.75rem`) |
| `radius/full` | `rounded-full` |
| `shadow/xs` | `shadow-sm` |
| `shadow/xl` | `shadow-2xl` |
| `Body/SemiBold` | `text-sm font-semibold leading-5 text-gray-900` |
| `Heading/H1` | `text-3xl font-bold tracking-tight text-gray-900` |

### 9.2 The 10-Point Pre-Handoff Design QA Checklist
Before handing this Figma file to developers or coding agents, verify:
- [ ] 1. Every frame uses Auto Layout with zero absolute positioning (except floating badges/close icons).
- [ ] 2. All text styles use predefined Figma typography tokens (no raw unstyled fonts).
- [ ] 3. All interactive components have defined `Default`, `Hover`, `Pressed`, and `Disabled` variant states.
- [ ] 4. Responsive constraints set properly: Table rows set to `Fill container`, Sidebars set to `Fixed width`.
- [ ] 5. Contrast ratio checked: All body text passes WCAG AA minimum 4.5:1 against its background.
- [ ] 6. WhatsApp CTA buttons distinctly stand out with `#25D366` green against system blue navigation.
- [ ] 7. Empty states designed for: 0 Overdue, 0 Customers, and 0 Search Results.
- [ ] 8. Date formatting standardized to Indian service business format: `DD MMM YYYY` (e.g., `08 Oct 2026`).
- [ ] 9. Currency formatted with standard Indian Rupee symbol `₹` and comma grouping (e.g., `₹14,400`).
- [ ] 10. Prototype connections verified for the complete Core Recovery Flow.

---

# PART II: THE A TO Z TACTICAL DESIGN ALPHABET

```
┌────────────────────────────────────────────────────────────────────────┐
│                   THE A TO Z ALPHABETICAL REFERENCE                    │
│                                                                        │
│  A – Auto Layout Standards           N – Navigation Responsiveness     │
│  B – Badge Variant System            O – Onboarding Simplicity         │
│  C – Component Architecture          P – Prototyping Curves            │
│  D – Data Density Balance            Q – Queue Urgency Hierarchy       │
│  E – Empty States & Celebrations     R – Revenue Funnel UX             │
│  F – Form Validation & Errors        S – Spacing Consistency           │
│  G – Grid Resizing Behavior          T – Template Variable Tags        │
│  H – Hierarchy of Typography         U – User Identity & Profiles      │
│  I – Iconography Rules               V – Variable Collections          │
│  J – Journey Flow Organization       W – WhatsApp wa.me Link Handling  │
│  K – KPI Calculation Cards           X – eXtreme Edge Cases            │
│  L – Layout Shell Boundaries         Y – Yield & ROI Calculator Widget │
│  M – Modal & Drawer Paradigms        Z – Zero-Debt Dev Mode Handoff    │
└────────────────────────────────────────────────────────────────────────┘
```

- **A — Auto Layout Standards**: Never create a static frame. Every button, card, and row must use Auto Layout with either `Hug contents` (for buttons and badges) or `Fill container` (for responsive table cells and cards).
- **B — Badge Variant System**: Status badges use a uniform height of `24px`, horizontal padding of `10px`, and font size `12px/500`. Color coding is strict: Red = Overdue, Orange = Due Today, Amber = Due This Week, Blue = Contacted, Green = Completed.
- **C — Component Architecture**: Avoid variant explosion. Use Figma Boolean Component Properties for optional elements (e.g., `hasLeadingIcon`, `hasBadge`, `isUrgent`) rather than creating separate variants for every combination.
- **D — Data Density Balance**: Keep desktop row height at `68px–72px`. It provides enough breathing room for two lines of text (Customer Name + Locality) while keeping 10+ rows visible without excessive scrolling.
- **E — Empty States & Celebrations**: When the Overdue queue reaches 0, display an illustrated green celebratory state: `"You're all caught up! 🎉 All due customers have been contacted."` Keep the owner motivated.
- **F — Form Validation & Errors**: Red borders (`#DC2626`) accompanied by an inline warning icon and clear helper copy beneath the input (e.g., `"Please enter a valid 10-digit mobile number"`). Never rely on color alone.
- **G — Grid Resizing Behavior**: Desktop layout uses 12 columns with a 24px gutter. Cards span 3 columns each (4 cards per row). On tablet (8 columns), cards wrap 2×2. On mobile, cards stack vertically (1 column, full width).
- **H — Hierarchy of Typography**: Maintain a clear 3-level visual hierarchy on every page: 1. Big KPI / Metric Number; 2. Customer Name / Action Title; 3. Timestamp / Asset Metadata.
- **I — Iconography Rules**: Stick strictly to Lucide Icons. Never mix outline and solid icons. Icon stroke must remain consistent at 2px. All icons inside buttons must match the label text color.
- **J — Journey Flow Organization**: Group screens on your Figma canvas sequentially from left to right: Acquisition (Landing) → Activation (Onboarding) → Daily Engagement (Dashboard Queue) → Value Realization (Results).
- **K — KPI Calculation Cards**: Keep KPI cards simple. Display only the raw integer count and a secondary tag showing change or urgency. Do not add complex mini-charts or sparklines that clutter the viewport.
- **L — Layout Shell Boundaries**: Sidebar width is locked at `240px` on desktop (collapses to `72px` icon-rail on screens `<1200px`). Top header is locked at `64px` height.
- **M — Modal & Drawer Paradigms**: Use **Drawers** (slide-out from right) for deep contextual inspection like Customer Profiles and WhatsApp Message Previews. Use **Center Modals** for destructive or high-consequence confirmations (e.g., Mark Completed, Delete Record).
- **N — Navigation Responsiveness**: On desktop, the sidebar is persistent. On mobile (`390px`), the sidebar vanishes entirely and transforms into a fixed 4-tab bottom navigation bar (`Today`, `Customers`, `Services`, `Settings`).
- **O — Onboarding Simplicity**: Maximum 3 inputs per onboarding step. Pre-fill sensible defaults for Kochi service businesses (e.g., 6 months for AC service, 3 months for RO filter changes).
- **P — Prototyping Curves**: Use `Ease-out` (300ms) for modal slide-ins and drawer panels. Use instant transitions for tab switches and filter toggles to simulate native web app responsiveness.
- **Q — Queue Urgency Hierarchy**: Sort the queue strictly by chronological urgency:
  1. Overdue (>14 days)
  2. Overdue (1–13 days)
  3. Due Today
  4. Due This Week
- **R — Revenue Funnel UX**: Visual funnel stages must use progressively narrowing rectangular step bars rather than confusing 3D cones. Show absolute customer counts and conversion percentages at each step.
- **S — Spacing Consistency**: Every padding, gap, and margin must divide cleanly by 4. If you catch yourself typing `15px` or `22px`, snap it immediately to `16px` or `24px`.
- **T — Template Variable Tags**: In the template editor, render variable pills (e.g., `{{customer_name}}`) as distinctive rounded pills (`#EFF6FF` background with blue border) so the user immediately understands they are dynamic placeholders.
- **U — User Identity & Profiles**: Display the logged-in business name prominently in the bottom sidebar so owners managing multiple branches can verify their active entity at a glance.
- **V — Variable Collections**: Keep all tokens in Figma Local Variables with two explicit modes: `Default` and `Compact` (for dense view mode).
- **W — WhatsApp wa.me Link Handling**: Include the WhatsApp icon on all direct outreach buttons. The generated URL must strictly follow the format: `https://wa.me/91XXXXXXXXXX?text=URL_ENCODED_TEMPLATE`.
- **X — eXtreme Edge Cases**: Design for:
  - Very long customer names (truncate with ellipsis after 24 characters).
  - Multiple appliances (display "+2 more assets" badge).
  - Unresponsive numbers (flag with amber "No response after 2 messages" tag).
- **Y — Yield & ROI Calculator Widget**: On the landing page, create an interactive slider widget:
  - Input: Number of active customers (e.g., `1,000`)
  - Input: Average service ticket size (e.g., `₹1,200`)
  - Output: `"Recoverable Annual Revenue: ₹4,80,000"`
- **Z — Zero-Debt Dev Mode Handoff**: Every layer must be named descriptively (e.g., `Row-Customer-ArunKumar`, `Btn-WhatsApp-Primary`). Delete all hidden or unused layers before handing over to the engineering team.
