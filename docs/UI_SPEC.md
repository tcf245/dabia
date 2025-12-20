# Dabia UI Design Specification

**Role:** Lead UI Designer for "Dabia" (Japanese vocabulary learning app).
**Design Philosophy:** "Warm Minimalist" & "Intellectual".
**Visual Reference:** Inspired by Claude.ai, Notion, and printed stationery. The interface should feel like a high-quality, warm-white paper notebook—calm, focused, and typographic.

## 1. Color Palette (Strict Adherence)
*Do not invent new colors. Use these exact hex codes and semantic roles.*

### Base Layer (Backgrounds)
- **Canvas (Page Bg):** `#F9F9F8` (Warm off-white, not pure white. Essential for the "paper" feel.)
- **Surface (Card Bg):** `#FFFFFF` (Pure white. Used for cards to create lift.)
- **Overlay/Empty:** `#F2F0EF` (Light warm gray. Used for empty states, placeholders, or secondary backgrounds.)

### Content Layer (Text & Borders)
- **Primary Text:** `#2A2A29` (Soft Charcoal. NEVER use pure black #000000.)
- **Secondary Text:** `#888888` (Warm Gray. Used for subtitles, captions.)
- **Tertiary/Meta:** `#999999` (Light Gray. Used for timestamps, romaji.)
- **Border:** `#E6E6E3` (Subtle Warm Gray. Key for the card outlines.)

### Brand Layer (Terracotta Series)
- **Brand Primary:** `#D97757` (Terracotta/Burnt Orange. Used for CTAs, active states, key highlights.)
- **Brand Light:** `#F2DCD6` (Pale Apricot. Used for low-intensity heatmaps, secondary tags.)
- **Brand Dark:** `#B05030` (Deep Earth. Used for hover states or high-intensity data points.)

## 2. Typography System
### Font Family
- **Headings / Japanese / Decorative:** `Noto Serif JP` (Serif). Adds the intellectual/literary feel.
- **UI / Body / Data:** `Inter` or system sans-serif. Ensures readability.

### Text Styles (Tailwind Classes)
- **H1 (Page Title):** `font-serif text-5xl text-[#1A1A1A] tracking-tight`
- **H2 (Section/Card Title):** `font-serif text-2xl text-[#333333]`
- **Body:** `font-sans text-base text-[#2A2A29]`
- **Caption/Subtitles:** `font-sans text-sm text-[#888888] font-light tracking-wide`
- **Romaji (Special Style):** `font-sans text-[10px] tracking-[0.2em] uppercase text-[#999999]` (Must be uppercase and wide spacing).

## 3. Shapes & Components (The "Dabia Look")
### The Card Container (Core Component)
*Everything (Calendar, Word Cloud, Lists) must live inside this container style:*
- **Shape:** `rounded-[20px]` (Large, soft corners).
- **Border:** `border border-[#E6E6E3]` (1px solid).
- **Shadow:** `shadow-[0_4px_20px_rgba(0,0,0,0.02)]` (Very diffuse, subtle lift).
- **Background:** `bg-white`.
- **Padding:** Generous padding (`p-6` to `p-10`).

### Interactive Elements
- **Buttons (Primary):** `bg-[#D97757] text-white rounded-full px-6 py-2 hover:bg-[#B05030] transition-colors font-medium`.
- **Buttons (Secondary):** `bg-transparent text-[#2A2A29] border border-[#E6E6E3] rounded-full px-6 py-2 hover:bg-[#F9F9F8]`.
- **Badges/Tags:** `px-3 py-1 rounded-md text-xs font-medium`.
  - **Active:** `bg-[#F2DCD6] text-[#D97757]`.
  - **Neutral:** `bg-[#F2F0EF] text-[#888888]`.

### Heatmap / Grid Items
- **Shape:** `rounded-[3px]` (Small border radius, distinct from container).
- **Spacing:** `gap-[4px]` or `gap-[6px]`.

## 4. Layout & Spacing Principles
- **Max Width:** `max-w-3xl` (Keep content narrow and focused like a book).
- **Whitespace:** Use generous vertical spacing (`space-y-10` or `py-12`). Avoid dense, cluttered layouts.
- **Alignment:** Center-aligned layouts are preferred for landing/profile pages. Left-aligned text within cards.

## 5. Do's and Don'ts (Strict Rules)
- ✅ **DO** use `Noto Serif JP` for all Japanese characters and major English headings.
- ✅ **DO** keep the background `#F9F9F8` visible around the white cards.
- ✅ **DO** use "Romaji" in Uppercase with wide tracking (`tracking-widest`).
- ❌ **DON'T** use pure black (`#000`) or pure gray (`#CCC`). Always use the warm grays defined above.
- ❌ **DON'T** use standard `rounded-md` or `rounded-lg` for main containers. Use `rounded-[20px]` or `rounded-2xl`.
- ❌ **DON'T** use bright primary colors (Blue, Green, Red). Only use the Terracotta palette.

## 6. Technical Stack (Output Format)
- **Framework:** React (Next.js App Router preferred).
- **Styling:** Tailwind CSS.
- **Icons:** Lucide React (stroke width: 1.5px or 2px, subtle).
- **Fonts:** Assume `next/font` is set up. Use `font-serif` for Noto Serif and `font-sans` for Inter.
