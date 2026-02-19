# Rekindle Pro — n8n Workflows Setup Guide

5 workflows. Import, fill in your credentials, activate. That's it.

---

## Workflows Overview

| File | Webhook Path | Purpose |
|------|-------------|---------|
| `01_client_onboarding.json` | `/webhook/ai-onboarding` | New client signup → Stripe customer → Welcome SMS → Team email |
| `02_send_review_sms.json` | `/webhook/send-review-sms` | Send review request SMS to a customer |
| `03_inbound_sms_billing.json` | `/webhook/sms-inbound` | Twilio reply → detect review → charge £2.50 |
| `04_lead_reactivation.json` | `/webhook/send-reactivation-sms` | Re-engage dormant customers via SMS |
| `05_ai_audit.json` | `/webhook/ai-audit-request` | AI-generated audit report → email prospect |

---

## Step 1 — Google Sheets Setup

Create one Google Sheet with these tabs (exact names matter):

### Tab: `Clients`
| Column | Notes |
|--------|-------|
| name | Owner name |
| business_name | |
| email | **Used as unique key** |
| phone | E.164 format (+447...) |
| industry | |
| pos_system | |
| google_link | Google review URL |
| tripadvisor_link | Optional |
| timing | When to send SMS |
| custom_message | Optional custom SMS text |
| volume | Daily customer count |
| stripe_payment_method_id | From onboarding |
| stripe_customer_id | Filled by WF1 after Stripe call |
| signup_date | ISO timestamp |
| status | active / paused / cancelled |

### Tab: `SentSMS`
| Column | Notes |
|--------|-------|
| client_email | Links to Clients tab |
| stripe_customer_id | For billing lookup |
| stripe_payment_method_id | For billing |
| business_name | |
| customer_name | |
| customer_phone | E.164 — used as lookup key in WF3 |
| google_link | Sent in the SMS |
| sent_at | ISO timestamp |
| status | sent / review_captured / opted_out |

### Tab: `Billing`
| Column | Notes |
|--------|-------|
| date | ISO timestamp |
| client_email | |
| business_name | |
| customer_phone | |
| stripe_pi_id | Stripe PaymentIntent ID |
| amount_gbp | Always 2.50 |
| status | succeeded / failed |

### Tab: `ReactivationLog`
| Column | Notes |
|--------|-------|
| client_email | |
| business_name | |
| customer_name | |
| customer_phone | |
| last_visit_date | |
| sent_at | |
| status | sent / replied / converted |

### Tab: `AuditLeads`
| Column | Notes |
|--------|-------|
| name | |
| business_name | |
| industry | |
| email | |
| phone | |
| current_reviews | |
| main_challenge | |
| submitted_at | |
| status | new / contacted / converted |

---

## Step 2 — n8n Credentials to Add

Go to **n8n → Settings → Credentials** and add:

### Google Sheets OAuth2
- Type: Google Sheets OAuth2
- Follow n8n's Google OAuth setup guide
- Name it exactly: `Google Sheets account`

### Gmail OAuth2
- Type: Gmail OAuth2
- Same Google account or a team inbox
- Name it: `Gmail account`

### Twilio
- Type: Twilio API
- Account SID + Auth Token from twilio.com/console
- Name it: `Twilio account`

### Stripe HTTP Basic Auth (for direct API calls)
- Type: HTTP Basic Auth
- Username: `sk_live_YOUR_KEY` (your Stripe secret key)
- Password: (leave blank)
- Name it: `Stripe API`

### Anthropic API (for WF5 - AI Audit)
- Type: HTTP Header Auth
- Name: `x-api-key`
- Value: your Anthropic API key
- Name it: `Anthropic API`

---

## Step 3 — Import Workflows

1. In n8n, go to **Workflows → Import**
2. Import each JSON file in order (01 → 05)
3. Open each workflow and fill in:
   - `REPLACE_WITH_YOUR_SHEET_ID` → your Google Sheet ID (from the URL)
   - `REPLACE_WITH_YOUR_TWILIO_NUMBER` → your Twilio number (+44...)
   - `REPLACE_WITH_YOUR_TEAM_EMAIL` → your team email
   - Credential dropdowns → select the credentials you created in Step 2

---

## Step 4 — Twilio Inbound Webhook

For WF3 to receive SMS replies, tell Twilio where to send them:

1. Go to twilio.com/console → Phone Numbers → your number
2. Under "Messaging", set the webhook URL to:
   `https://n8n.srv1334356.hstgr.cloud/webhook/sms-inbound`
3. Method: HTTP POST

---

## Step 5 — Activate

Activate workflows in this order:
1. WF1 (always on — handles new signups)
2. WF2 (always on — sends review requests)
3. WF3 (always on — handles inbound SMS + billing)
4. WF4 (activate when running reactivation campaigns)
5. WF5 (always on — handles audit requests from landing page)

---

## Money Flow

```
Customer visits restaurant
    ↓
You POST to /webhook/send-review-sms (via admin panel or POS integration)
    ↓ WF2
Twilio sends SMS: "Leave us a Google review: [link]"
    ↓
Customer replies "Done!" or "Left you 5 stars"
    ↓ WF3
n8n detects positive reply → Stripe charges client £2.50
    ↓
£ in your account
```

---

## Notes

- **Lead Reactivation**: POST customer data to `/webhook/send-reactivation-sms`. Pricing for this service is separate — add billing logic to WF4 when ready.
- **AI Audit**: The landing page form should POST to `/webhook/ai-audit-request`. This is a free lead magnet — no billing in WF5.
- **Stripe off-session charges**: Requires 3DS confirmation on first charge. If charges fail, check Stripe dashboard and set up proper SCA handling.
- **Google Sheets ID**: Found in the sheet URL: `docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit`
