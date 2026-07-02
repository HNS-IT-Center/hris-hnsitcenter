---
name: Kinetic Enterprise
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006591'
  on-secondary: '#ffffff'
  secondary-container: '#39b8fd'
  on-secondary-container: '#004666'
  tertiary: '#7e3000'
  on-tertiary: '#ffffff'
  tertiary-container: '#a44100'
  on-tertiary-container: '#ffd2be'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#c9e6ff'
  secondary-fixed-dim: '#89ceff'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#004c6e'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb695'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7b2f00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-label:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '450'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
  table-cell-padding-x: 16px
  table-cell-padding-y: 12px
---

## Brand & Style

The design system is engineered for high-density enterprise environments where clarity, efficiency, and professional trust are paramount. The brand personality is **utilitarian, precise, and unobtrusive**, moving away from decorative elements to focus entirely on data integrity and user workflow.

The aesthetic follows a **refined Corporate Minimalism** approach. It utilizes expansive whitespace, a disciplined monochromatic foundation, and purposeful color application to direct attention. The UI should evoke a sense of organized calm, transforming complex attendance logistics into a streamlined, high-end SaaS experience that feels both powerful and easy to navigate.

## Colors

This design system utilizes a sophisticated palette rooted in the **Slate** neutral scale to provide a high-contrast yet soft-on-the-eyes workspace. 

- **Primary (Indigo):** Used for primary actions, active navigation states, and key interactive focal points.
- **Secondary (Sky):** Reserved for informational callouts, permit status, and secondary data visualizations.
- **Neutral (Slate):** The backbone of the system, used for text, borders, and structural backgrounds.
- **Semantic Accents:** 
    - **Emerald (Success):** Explicitly for "Present" status and positive attendance markers.
    - **Amber (Warning):** For "Late," "Early Departure," or "Action Required" anomalies.
    - **Rose (Error):** For "Absent" or critical system failures.

The background uses a tiered approach: `Slate-50` for the page foundation and `White` for interactive cards and table surfaces to create a clear "layer" effect without heavy shadows.

## Typography

The typography is built on **Inter**, chosen for its exceptional legibility in data-heavy contexts and its neutral, systematic character. 

For high-density tables, `body-md` is the standard for primary data, while `body-sm` is used for supporting metadata. We introduce a `mono-label` using a monospaced font for timestamps and ID numbers to ensure vertical alignment and easy scanning of numerical data. Headers use tighter letter-spacing and heavier weights to maintain a strong hierarchy against the lighter body text.

## Layout & Spacing

The design system employs a **12-column fluid grid** for dashboard layouts, but switches to a **fixed-width container (1440px)** for centralized data views to prevent line lengths from becoming unreadable on ultra-wide monitors.

A strict **8px/4px spatial system** governs all margins and padding. In high-density areas like attendance logs, the vertical rhythm is compressed to `12px` (3 units) to maximize visible information without sacrificing touch targets.

- **Desktop:** Side navigation is fixed at 240px; main content fluidly adjusts.
- **Tablet:** Side navigation collapses to an icon rail (64px).
- **Mobile:** Single column layout with 16px horizontal margins; tables become horizontally scrollable cards or simplified lists.

## Elevation & Depth

To maintain a minimalist SaaS aesthetic, this design system avoids heavy shadows in favor of **Tonal Layers and Low-Contrast Outlines**.

- **Level 0 (Background):** `Slate-50` (#F8FAFC) - The base canvas.
- **Level 1 (Surface):** `White` (#FFFFFF) with a 1px border of `Slate-200` (#E2E8F0). Used for cards, tables, and main content areas.
- **Level 2 (Interaction):** A soft, ambient shadow (0px 4px 6px -1px rgba(0,0,0,0.05)) is applied only to floating elements like dropdowns, modals, and tooltips.
- **State Changes:** Hover states on rows or buttons should use a subtle background shift to `Slate-100` rather than an increase in elevation.

## Shapes

The shape language is **Soft and Precise**. A consistent border radius of `4px` (`roundedness: 1`) is applied to buttons, input fields, and status tags to provide a modern feel that still looks professional and structured. Large layout containers like cards may use `8px` to distinguish them from smaller UI components.

## Components

### Data Tables (Primary Component)
The core of the application. 
- **Header:** Sticky header with `Slate-50` background, `label-md` typography, and a subtle bottom border.
- **Rows:** Alternating zebra stripes are avoided; use 1px `Slate-100` dividers. Hover state: `Slate-50`.
- **Density:** High density (12px Y-padding) by default, with a toggle for "Comfortable" density (16px Y-padding).

### Status Chips
- **Present:** Emerald-50 background, Emerald-700 text, no border.
- **Late:** Amber-50 background, Amber-700 text.
- **Permit:** Sky-50 background, Sky-700 text.

### Buttons
- **Primary:** Solid Indigo-600 with white text.
- **Secondary:** White background, Slate-200 border, Slate-700 text.
- **Ghost:** No border/background; Indigo-600 text for actions within a row.

### Form Inputs
Standardized with a 1px `Slate-300` border. Focus state: `Indigo-600` 1px border with an `Indigo-100` 3px outer glow (ring).

### Pagination
Minimalist controls using icon buttons for arrows and "Page X of Y" text to save horizontal space. Avoid large numerical page button strings.