# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Rekindle Pro Reviews Agent - A static HTML/CSS/JS marketing and onboarding platform for a B2B SaaS product. The application handles review automation, lead reactivation, and AI audit services for businesses.

## Development Commands

No build system - static files served directly:
```bash
# Local development server
python -m http.server 8000
# or
npx serve .
```

## Architecture

```
Reviews_Agent/
├── index.html          # Main landing page with terms modal
├── root_index.html     # Alternative landing with WhatsApp integration
├── Onboarding/
│   └── onboarding.html # Chat-based signup flow with Stripe
├── Landing/Landing/
│   ├── index.html      # Comprehensive Tailwind landing page
│   ├── admin.html      # Business admin dashboard
│   ├── dashboard.html  # Analytics/metrics dashboard
│   ├── workflow_builder.html  # Visual workflow configuration
│   ├── roi_calculator.html    # ROI calculation tool
│   ├── revival_dashboard.html # Lead reactivation tools
│   └── app_design/     # Design system documentation
├── Review_Campaign/    # Review campaign management (placeholder)
└── Clients/            # Client data (placeholder)
```

**User Flow:**
1. Landing page → Terms acceptance modal
2. Redirect to Onboarding chat interface
3. Chat collects: name, business details, payment info, POS integrations
4. Form data → n8n webhook (`https://n8n.srv1334356.hstgr.cloud/webhook/ai-onboarding/`)
5. Success confirmation screen

## Tech Stack

- **Frontend**: Vanilla HTML5/CSS3/JavaScript (no framework)
- **Styling**: Tailwind CSS (CDN), custom CSS variables
- **Fonts**: Cormorant Garamond, Manrope, DM Mono, Inter
- **Icons**: Material Design Icons (Material Symbols Outlined)
- **Payments**: Stripe.js (Elements for card tokenization)
- **Video**: Vimeo embeds
- **Backend**: n8n webhooks for automation

## Design System (Aura Interface)

Two visual themes are used:

**Rekindle Pro (Primary):**
- Dark theme with ember orange accents (`#C4622D`, `#D4733E`)

**Aura Interface (Dashboards):**
- Void Black: `#050505`
- Revival Purple: `#7C3AED`
- Signal Blue: `#2563EB`
- Glassmorphism cards: `rgba(255,255,255,0.05)` with `backdrop-filter: blur(10px)`

**Component Patterns:**
- Chat bubbles with typing indicators
- Pill-shaped option buttons
- Glassmorphism effect cards
- CSS `clamp()` for responsive typography
- Dark backgrounds with noise texture overlay

## External Integrations

- **Stripe**: Live payment processing
- **n8n**: Backend automation/webhook processing
- **Vimeo**: Video hosting
- **POS Systems**: Square, Toast, Clover, Resy, OpenTable, and others

## Services Offered

1. **Review Automation** - SMS → Review capture (£2.50/review, no subscription)
2. **Lead Reactivation** - Win back dormant customers via SMS
3. **AI Audit** - Free business gap assessment
