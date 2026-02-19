/**
 * Rekindle Pro — n8n Workflow Deployment Script
 *
 * Does NOT touch the ClickSend demo workflows.
 * Creates 5 new production workflows (Twilio + Postgres).
 *
 * Run: node deploy.mjs
 */

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3OWZiYzkzNi1lMjM4LTQ5N2UtOTgxMy04NTM5Mzc3ZGI4MzEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZDlkMWE3ODQtZDgwMy00OGYyLTgzYTUtZmJkM2E5ZjIyOWZjIiwiaWF0IjoxNzcxNDQxMzQxfQ.l04pTAy9sYX2FQutPwnodZHuhv7FbkM5NtqxdjYMrK8";
const BASE = "https://n8n.srv1334356.hstgr.cloud/api/v1";
const HEADERS = { "X-N8N-API-KEY": API_KEY, "Content-Type": "application/json" };

// ─── Known credential IDs ───────────────────────────────────────────────────
const PG   = { id: "iNd3pXEEaSrJVoEW", name: "Postgres account" };
const CS   = { id: "9CcnKL7uI6GrC0rJ", name: "ClickSend account 2" };

// Twilio: add once Twilio bundle is approved → replace "TWILIO_CRED_ID"
const TW   = { id: "TWILIO_CRED_ID", name: "Twilio account" };

const CS_FROM_BIZ  = "+447903573675";  // client-facing ClickSend number
const RICCARDO     = "+447901903384";  // Riccardo's personal number for all internal alerts
const TWILIO_FROM  = "REPLACE_WITH_TWILIO_NUMBER"; // e.g. +447...

// ─── Helpers ────────────────────────────────────────────────────────────────
function webhook(id, name, path, pos) {
  return {
    parameters: { httpMethod: "POST", path, options: {} },
    id, name,
    type: "n8n-nodes-base.webhook",
    typeVersion: 1,
    position: pos,
    webhookId: `prod-${path}-webhook`
  };
}

function pgNode(id, name, query, pos) {
  return {
    parameters: { operation: "executeQuery", query, options: {} },
    id, name,
    type: "n8n-nodes-base.postgres",
    typeVersion: 2.5,
    position: pos,
    credentials: { postgres: PG }
  };
}

function clickSend(id, name, from, to, body, pos) {
  return {
    parameters: {
      method: "POST",
      url: "https://rest.clicksend.com/v3/sms/send",
      authentication: "predefinedCredentialType",
      nodeCredentialType: "clickSendApi",
      sendBody: true,
      specifyBody: "json",
      jsonBody: `={"messages":[{"source":"n8n","from":"${from}","body":${body},"to":"${to}"}]}`,
      options: {}
    },
    id, name,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.1,
    position: pos,
    credentials: { clickSendApi: CS }
  };
}

function twilioSMS(id, name, to, body, pos) {
  return {
    parameters: {
      from: TWILIO_FROM,
      to,
      message: body
    },
    id, name,
    type: "n8n-nodes-base.twilio",
    typeVersion: 1,
    position: pos,
    credentials: { twilioApi: TW }
  };
}

function setNode(id, name, assignments, pos) {
  return {
    parameters: {
      assignments: { assignments },
      options: {}
    },
    id, name,
    type: "n8n-nodes-base.set",
    typeVersion: 3.4,
    position: pos
  };
}

function ifNode(id, name, leftValue, operation, rightValue, pos) {
  return {
    parameters: {
      conditions: {
        string: [{ value1: leftValue, operation, value2: rightValue }]
      }
    },
    id, name,
    type: "n8n-nodes-base.if",
    typeVersion: 1,
    position: pos
  };
}

function codeNode(id, name, jsCode, pos) {
  return {
    parameters: { jsCode, mode: "runOnceForAllItems" },
    id, name,
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: pos
  };
}

function link(from, to) {
  return { [from]: { main: [[{ node: to, type: "main", index: 0 }]] } };
}

function mergeLinks(links) {
  return Object.assign({}, ...links);
}

// ─── API ────────────────────────────────────────────────────────────────────
async function createWF(body) {
  const r = await fetch(`${BASE}/workflows`, {
    method: "POST", headers: HEADERS,
    body: JSON.stringify(body)
  });
  return r.json();
}

async function activateWF(id) {
  const r = await fetch(`${BASE}/workflows/${id}/activate`, {
    method: "POST", headers: HEADERS
  });
  return r.json();
}

// ════════════════════════════════════════════════════════════════════════════
// WF1 — CLIENT ONBOARDING (PROD) — Active immediately (ClickSend until Twilio)
// Receives: name, business_name, email, phone, industry, pos_system,
//           google_link, stripe_payment_method_id, timing, custom_message, volume
// Path: /ai-onboarding  (matches onboarding.html frontend)
// ════════════════════════════════════════════════════════════════════════════
const wf1 = {
  name: "Rekindle - Client Onboarding (Prod)",
  nodes: [
    webhook("wf1-01", "Webhook: Onboarding", "ai-onboarding", [-400, 300]),
    pgNode("wf1-02", "DB: Insert Client",
      `INSERT INTO clients (business_name, owner_name, email, phone, review_link, stripe_customer_id, status)
VALUES (
  '{{ $json.body.business_name }}',
  '{{ $json.body.name }}',
  '{{ $json.body.email }}',
  '{{ $json.body.phone.startsWith(''+'') ? $json.body.phone : ''+44'' + $json.body.phone.slice(1) }}',
  '{{ $json.body.google_link }}',
  '{{ $json.body.stripe_payment_method_id }}',
  ''active''
)
RETURNING id;`,
      [-180, 300]
    ),
    clickSend("wf1-03", "SMS: Welcome Client",
      CS_FROM_BIZ,
      "={{ $('Webhook: Onboarding').item.json.body.phone.startsWith('+') ? $('Webhook: Onboarding').item.json.body.phone : '+44' + $('Webhook: Onboarding').item.json.body.phone.slice(1) }}",
      `"Welcome to Rekindle Pro, {{ $('Webhook: Onboarding').item.json.body.name }}! 🔥 Your review automation is being set up for {{ $('Webhook: Onboarding').item.json.body.business_name }}. Live within 24 hours. Questions? Reply here."`,
      [60, 200]
    ),
    clickSend("wf1-04", "SMS: Notify Riccardo",
      CS_FROM_BIZ,
      RICCARDO,
      `"🔥 New client signed up!\\nName: {{ $('Webhook: Onboarding').item.json.body.name }}\\nBusiness: {{ $('Webhook: Onboarding').item.json.body.business_name }}\\nPhone: {{ $('Webhook: Onboarding').item.json.body.phone }}\\nEmail: {{ $('Webhook: Onboarding').item.json.body.email }}\\nPOS: {{ $('Webhook: Onboarding').item.json.body.pos_system }}\\nVolume: {{ $('Webhook: Onboarding').item.json.body.volume }}/day\\nReview link: {{ $('Webhook: Onboarding').item.json.body.google_link }}\\n\\nSet up their campaign ✅"`,
      [60, 420]
    )
  ],
  connections: mergeLinks([
    link("Webhook: Onboarding", "DB: Insert Client"),
    {
      "DB: Insert Client": {
        main: [[
          { node: "SMS: Welcome Client", type: "main", index: 0 },
          { node: "SMS: Notify Riccardo", type: "main", index: 0 }
        ]]
      }
    }
  ]),
  active: true,
  settings: { executionOrder: "v1" }
};

// ════════════════════════════════════════════════════════════════════════════
// WF2 — SEND REVIEW REQUEST SMS (PROD, TWILIO) — Inactive until bundle approved
// POST /send-review-sms
// Body: { client_email, customer_name, customer_phone }
// ════════════════════════════════════════════════════════════════════════════
const wf2 = {
  name: "Rekindle - Send Review Request SMS [TWILIO — activate after bundle]",
  nodes: [
    webhook("wf2-01", "Webhook: Send Review SMS", "send-review-sms", [-600, 300]),
    pgNode("wf2-02", "DB: Lookup Client",
      `SELECT id, business_name, review_link, custom_message
FROM clients
WHERE email = '{{ $json.body.client_email }}' AND status = 'active'
LIMIT 1;`,
      [-380, 300]
    ),
    setNode("wf2-03", "Format SMS Body", [
      {
        id: "sms", name: "sms_text", type: "string",
        value: "={{ $json.custom_message ? $json.custom_message.replace('{name}', $('Webhook: Send Review SMS').item.json.body.customer_name).replace('{business}', $json.business_name).replace('{link}', $json.review_link) : 'Hi ' + $('Webhook: Send Review SMS').item.json.body.customer_name + '! Thanks for visiting ' + $json.business_name + '. We\\'d love your review — takes 30 seconds: ' + $json.review_link + ' Reply STOP to opt out.' }}"
      },
      { id: "cid",   name: "client_id",       type: "string", value: "={{ $json.id }}" },
      { id: "cph",   name: "customer_phone",  type: "string", value: "={{ $('Webhook: Send Review SMS').item.json.body.customer_phone }}" },
      { id: "cnm",   name: "customer_name",   type: "string", value: "={{ $('Webhook: Send Review SMS').item.json.body.customer_name }}" }
    ], [-160, 300]),
    twilioSMS("wf2-04", "Twilio: Send Review SMS",
      "={{ $json.customer_phone }}",
      "={{ $json.sms_text }}",
      [60, 300]
    ),
    pgNode("wf2-05", "DB: Log Outbound SMS",
      `INSERT INTO sms_logs (client_id, customer_phone, direction, body)
VALUES (
  {{ $('Format SMS Body').item.json.client_id }},
  '{{ $('Format SMS Body').item.json.customer_phone }}',
  'outbound',
  '{{ $('Format SMS Body').item.json.sms_text }}'
);`,
      [280, 300]
    )
  ],
  connections: mergeLinks([
    link("Webhook: Send Review SMS", "DB: Lookup Client"),
    link("DB: Lookup Client", "Format SMS Body"),
    link("Format SMS Body", "Twilio: Send Review SMS"),
    link("Twilio: Send Review SMS", "DB: Log Outbound SMS")
  ]),
  active: false,
  settings: { executionOrder: "v1" }
};

// ════════════════════════════════════════════════════════════════════════════
// WF3 — INBOUND REVIEW DETECTION + STRIPE BILLING (PROD, TWILIO)
// Twilio inbound URL to set in Twilio console:
//   https://n8n.srv1334356.hstgr.cloud/webhook/twilio-inbound
// Twilio sends: From, Body, To
// ════════════════════════════════════════════════════════════════════════════
const wf3 = {
  name: "Rekindle - Inbound Review + Billing [TWILIO — activate after bundle]",
  nodes: [
    webhook("wf3-01", "Webhook: Twilio Inbound", "twilio-inbound", [-800, 300]),
    pgNode("wf3-02", "DB: Lookup Campaign",
      `SELECT sl.client_id, c.business_name, c.owner_name, c.stripe_customer_id
FROM sms_logs sl
JOIN clients c ON c.id = sl.client_id
WHERE sl.customer_phone = '{{ $json.body.From }}'
  AND sl.direction = 'outbound'
ORDER BY sl.id DESC
LIMIT 1;`,
      [-580, 300]
    ),
    pgNode("wf3-03", "DB: Log Inbound SMS",
      `INSERT INTO sms_logs (client_id, customer_phone, direction, body)
VALUES (
  {{ $json.client_id || 0 }},
  '{{ $('Webhook: Twilio Inbound').item.json.body.From }}',
  'inbound',
  '{{ $('Webhook: Twilio Inbound').item.json.body.Body }}'
);`,
      [-360, 300]
    ),
    codeNode("wf3-04", "Detect Reply Type",
      `const body = $('Webhook: Twilio Inbound').item.json.body.Body.toLowerCase().trim();
const campaign = $('DB: Lookup Campaign').item.json;

const positive = ['done','left','review','rated','stars','posted','gave','submitted','great','good','amazing','yes','sure','written'];
const optout   = ['stop','unsubscribe','opt out','optout','remove','cancel','no thanks'];

let action = 'other';
if (optout.some(k => body.includes(k)))    action = 'optout';
else if (positive.some(k => body.includes(k))) action = 'positive';

return [{ json: {
  action,
  client_id:   campaign.client_id,
  business_name: campaign.business_name,
  owner_name:  campaign.owner_name,
  stripe_customer_id: campaign.stripe_customer_id,
  customer_phone: $('Webhook: Twilio Inbound').item.json.body.From
}}];`,
      [-140, 300]
    ),
    ifNode("wf3-05", "IF: Positive Review?",
      "={{ $json.action }}", "equals", "positive",
      [80, 300]
    ),
    pgNode("wf3-06", "DB: Log Review",
      `INSERT INTO reviews (client_id, customer_phone, billed)
VALUES (
  {{ $json.client_id }},
  '{{ $json.customer_phone }}',
  false
)
RETURNING id;`,
      [300, 160]
    ),
    {
      // Stripe: charge £2.50 — requires Stripe HTTP Basic Auth credential
      parameters: {
        method: "POST",
        url: "https://api.stripe.com/v1/payment_intents",
        authentication: "genericCredentialType",
        genericAuthType: "httpBasicAuth",
        sendBody: true,
        contentType: "form-urlencoded",
        bodyParameters: {
          parameters: [
            { name: "amount",         value: "250" },
            { name: "currency",       value: "gbp" },
            { name: "customer",       value: "={{ $('Detect Reply Type').item.json.stripe_customer_id }}" },
            { name: "payment_method", value: "={{ $('Detect Reply Type').item.json.stripe_customer_id }}" },
            { name: "off_session",    value: "true" },
            { name: "confirm",        value: "true" },
            { name: "description",    value: "={{ 'Review captured — ' + $('Detect Reply Type').item.json.business_name }}" }
          ]
        },
        options: {}
      },
      id: "wf3-07", name: "Stripe: Charge £2.50",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.1,
      position: [520, 160],
      credentials: { httpBasicAuth: { id: "STRIPE_CRED_ID", name: "Stripe API Key" } }
    },
    pgNode("wf3-08", "DB: Mark Review Billed",
      `UPDATE reviews SET billed = true
WHERE client_id = {{ $('Detect Reply Type').item.json.client_id }}
  AND customer_phone = '{{ $('Detect Reply Type').item.json.customer_phone }}'
  AND billed = false;`,
      [740, 160]
    ),
    clickSend("wf3-09", "SMS: Revenue Alert to Riccardo",
      CS_FROM_BIZ,
      RICCARDO,
      `"💰 £2.50 earned! Review captured for {{ $('Detect Reply Type').item.json.business_name }}\\nCustomer: {{ $('Detect Reply Type').item.json.customer_phone }}"`,
      [960, 160]
    ),
    ifNode("wf3-10", "IF: Opt-Out?",
      "={{ $json.action }}", "equals", "optout",
      [300, 440]
    ),
    pgNode("wf3-11", "DB: Log Opt-Out",
      `INSERT INTO sms_logs (client_id, customer_phone, direction, body)
VALUES (
  {{ $json.client_id || 0 }},
  '{{ $json.customer_phone }}',
  'optout',
  'STOP received'
);`,
      [520, 340]
    ),
    clickSend("wf3-12", "SMS: Alert Riccardo Unhandled Reply",
      CS_FROM_BIZ,
      RICCARDO,
      `"❓ Unhandled SMS reply for {{ $json.business_name }}\\nFrom: {{ $json.customer_phone }}\\nReply: {{ $('Webhook: Twilio Inbound').item.json.body.Body }}"`,
      [520, 540]
    )
  ],
  connections: {
    "Webhook: Twilio Inbound": { main: [[{ node: "DB: Lookup Campaign",    type: "main", index: 0 }]] },
    "DB: Lookup Campaign":      { main: [[{ node: "DB: Log Inbound SMS",   type: "main", index: 0 }]] },
    "DB: Log Inbound SMS":      { main: [[{ node: "Detect Reply Type",     type: "main", index: 0 }]] },
    "Detect Reply Type":        { main: [[{ node: "IF: Positive Review?",  type: "main", index: 0 }]] },
    "IF: Positive Review?": {
      main: [
        [{ node: "DB: Log Review",        type: "main", index: 0 }],
        [{ node: "IF: Opt-Out?",          type: "main", index: 0 }]
      ]
    },
    "DB: Log Review":         { main: [[{ node: "Stripe: Charge £2.50",           type: "main", index: 0 }]] },
    "Stripe: Charge £2.50":   { main: [[{ node: "DB: Mark Review Billed",         type: "main", index: 0 }]] },
    "DB: Mark Review Billed": { main: [[{ node: "SMS: Revenue Alert to Riccardo", type: "main", index: 0 }]] },
    "IF: Opt-Out?": {
      main: [
        [{ node: "DB: Log Opt-Out",                 type: "main", index: 0 }],
        [{ node: "SMS: Alert Riccardo Unhandled Reply", type: "main", index: 0 }]
      ]
    }
  },
  active: false,
  settings: { executionOrder: "v1" }
};

// ════════════════════════════════════════════════════════════════════════════
// WF4 — LEAD REACTIVATION (PROD, TWILIO) — Inactive until bundle
// POST /send-reactivation-sms
// Body: { client_email, customer_name, customer_phone, offer? }
// ════════════════════════════════════════════════════════════════════════════
const wf4 = {
  name: "Rekindle - Lead Reactivation [TWILIO — activate after bundle]",
  nodes: [
    webhook("wf4-01", "Webhook: Reactivation", "send-reactivation-sms", [-600, 300]),
    pgNode("wf4-02", "DB: Lookup Client",
      `SELECT id, business_name, review_link
FROM clients
WHERE email = '{{ $json.body.client_email }}' AND status = 'active'
LIMIT 1;`,
      [-380, 300]
    ),
    setNode("wf4-03", "Format Reactivation SMS", [
      {
        id: "sms", name: "sms_text", type: "string",
        value: "={{ 'Hi ' + $('Webhook: Reactivation').item.json.body.customer_name + '! We miss you at ' + $json.business_name + ' 👋' + ($('Webhook: Reactivation').item.json.body.offer ? ' ' + $('Webhook: Reactivation').item.json.body.offer : '') + ' Book again or leave us a review: ' + $json.review_link + ' Reply STOP to opt out.' }}"
      },
      { id: "cid", name: "client_id",      type: "string", value: "={{ $json.id }}" },
      { id: "cph", name: "customer_phone", type: "string", value: "={{ $('Webhook: Reactivation').item.json.body.customer_phone }}" }
    ], [-160, 300]),
    twilioSMS("wf4-04", "Twilio: Send Reactivation SMS",
      "={{ $json.customer_phone }}",
      "={{ $json.sms_text }}",
      [60, 300]
    ),
    pgNode("wf4-05", "DB: Log Reactivation SMS",
      `INSERT INTO sms_logs (client_id, customer_phone, direction, body)
VALUES (
  {{ $('Format Reactivation SMS').item.json.client_id }},
  '{{ $('Format Reactivation SMS').item.json.customer_phone }}',
  'reactivation',
  '{{ $('Format Reactivation SMS').item.json.sms_text }}'
);`,
      [280, 300]
    )
  ],
  connections: mergeLinks([
    link("Webhook: Reactivation", "DB: Lookup Client"),
    link("DB: Lookup Client", "Format Reactivation SMS"),
    link("Format Reactivation SMS", "Twilio: Send Reactivation SMS"),
    link("Twilio: Send Reactivation SMS", "DB: Log Reactivation SMS")
  ]),
  active: false,
  settings: { executionOrder: "v1" }
};

// ════════════════════════════════════════════════════════════════════════════
// WF5 — AI AUDIT LEAD CAPTURE — Active immediately (no Twilio needed)
// POST /ai-audit-request
// Body: { name, business_name, industry, email, phone?, current_reviews?, main_challenge? }
// Uses OpenRouter (Llama 3.3 70B) to generate personalised audit
// Notifies Riccardo via ClickSend SMS with a brief summary
// ════════════════════════════════════════════════════════════════════════════
const wf5 = {
  name: "Rekindle - AI Audit Lead Capture",
  nodes: [
    webhook("wf5-01", "Webhook: Audit Request", "ai-audit-request", [-800, 300]),
    pgNode("wf5-02", "DB: Save Audit Lead",
      `INSERT INTO clients (business_name, owner_name, email, phone, review_link, stripe_customer_id, status)
VALUES (
  '{{ $json.body.business_name }}',
  '{{ $json.body.name }}',
  '{{ $json.body.email }}',
  '{{ $json.body.phone || '''' }}',
  '{{ $json.body.website || '''' }}',
  '''' ,
  ''audit_lead''
)
ON CONFLICT (email) DO UPDATE SET status = ''audit_lead''
RETURNING id;`,
      [-580, 300]
    ),
    setNode("wf5-03", "Build AI Prompt", [
      {
        id: "prompt", name: "prompt", type: "string",
        value: "={{ 'Generate a concise, personalised business gap assessment for this Rekindle Pro prospect:\\n\\nBusiness: ' + $(\\'Webhook: Audit Request\\').item.json.body.business_name + '\\nOwner: ' + $(\\'Webhook: Audit Request\\').item.json.body.name + '\\nIndustry: ' + $(\\'Webhook: Audit Request\\').item.json.body.industry + '\\nCurrent reviews: ' + ($(\\'Webhook: Audit Request\\').item.json.body.current_reviews || \\'unknown\\') + '\\nMain challenge: ' + ($(\\'Webhook: Audit Request\\').item.json.body.main_challenge || \\'not specified\\') + '\\n\\nFocus on: (1) Revenue being lost now, with a rough GBP estimate, (2) The single biggest gap, (3) What Rekindle Pro fixes specifically. Max 200 words, direct tone, end with a clear CTA.' }}"
      }
    ], [-360, 300]),
    {
      parameters: {
        method: "POST",
        url: "https://openrouter.ai/api/v1/chat/completions",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "HTTP-Referer", value: "https://rekindlepro.com" },
            { name: "X-Title", value: "Rekindle Pro AI Audit" }
          ]
        },
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        sendBody: true,
        contentType: "json",
        body: `={"model":"meta-llama/llama-3.3-70b-instruct","max_tokens":400,"messages":[{"role":"user","content":"{{ $json.prompt }}"}]}`,
        options: {}
      },
      id: "wf5-04", name: "OpenRouter: Generate Audit",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.1,
      position: [-140, 300],
      credentials: {
        httpHeaderAuth: { id: "REPLACE_WITH_OPENROUTER_HEADER_CRED_ID", name: "OpenRouter Header Auth" }
      }
    },
    setNode("wf5-05", "Extract Report", [
      { id: "r", name: "report", type: "string", value: "={{ $json.choices[0].message.content }}" }
    ], [80, 300]),
    clickSend("wf5-06", "SMS: Notify Riccardo of Audit Lead",
      CS_FROM_BIZ,
      RICCARDO,
      `"🔍 New audit lead!\\nName: {{ $('Webhook: Audit Request').item.json.body.name }}\\nBusiness: {{ $('Webhook: Audit Request').item.json.body.business_name }}\\nIndustry: {{ $('Webhook: Audit Request').item.json.body.industry }}\\nEmail: {{ $('Webhook: Audit Request').item.json.body.email }}\\nPhone: {{ $('Webhook: Audit Request').item.json.body.phone || 'n/a' }}\\n\\nAI says: {{ $('Extract Report').item.json.report.slice(0, 200) }}..."`,
      [300, 200]
    ),
    {
      // Only fires if prospect provided a phone number
      parameters: {
        conditions: {
          string: [{ value1: "={{ $('Webhook: Audit Request').item.json.body.phone }}", operation: "isNotEmpty" }]
        }
      },
      id: "wf5-07", name: "IF: Has Phone?",
      type: "n8n-nodes-base.if",
      typeVersion: 1,
      position: [300, 420]
    },
    clickSend("wf5-08", "SMS: Tease Prospect",
      CS_FROM_BIZ,
      "={{ $('Webhook: Audit Request').item.json.body.phone.startsWith('+') ? $('Webhook: Audit Request').item.json.body.phone : '+44' + $('Webhook: Audit Request').item.json.body.phone.slice(1) }}",
      `"Hi {{ $('Webhook: Audit Request').item.json.body.name }}, your Rekindle Pro audit for {{ $('Webhook: Audit Request').item.json.body.business_name }} is ready. Check your inbox — Riccardo will be in touch shortly 🔥"`,
      [520, 340]
    )
  ],
  connections: {
    "Webhook: Audit Request":       { main: [[{ node: "DB: Save Audit Lead",             type: "main", index: 0 }]] },
    "DB: Save Audit Lead":          { main: [[{ node: "Build AI Prompt",                 type: "main", index: 0 }]] },
    "Build AI Prompt":              { main: [[{ node: "OpenRouter: Generate Audit",       type: "main", index: 0 }]] },
    "OpenRouter: Generate Audit":   { main: [[{ node: "Extract Report",                  type: "main", index: 0 }]] },
    "Extract Report": {
      main: [[
        { node: "SMS: Notify Riccardo of Audit Lead", type: "main", index: 0 },
        { node: "IF: Has Phone?",                     type: "main", index: 0 }
      ]]
    },
    "IF: Has Phone?": {
      main: [
        [{ node: "SMS: Tease Prospect", type: "main", index: 0 }],
        []
      ]
    }
  },
  active: true,
  settings: { executionOrder: "v1" }
};

// ════════════════════════════════════════════════════════════════════════════
// DEPLOY
// ════════════════════════════════════════════════════════════════════════════
const workflows = [
  { def: wf1, label: "Client Onboarding (Prod)" },
  { def: wf2, label: "Send Review SMS (Twilio)" },
  { def: wf3, label: "Inbound + Billing (Twilio)" },
  { def: wf4, label: "Lead Reactivation (Twilio)" },
  { def: wf5, label: "AI Audit Lead Capture" }
];

console.log("Deploying Rekindle Pro production workflows...\n");

for (const { def, label } of workflows) {
  try {
    const shouldActivate = def.active;
    const body = { ...def };
    delete body.active; // active is read-only on create; activate separately

    const result = await createWF(body);
    if (result.id) {
      let activeTag = "⏸  inactive (needs Twilio/Stripe creds)";
      if (shouldActivate) {
        const act = await activateWF(result.id);
        activeTag = act.active ? "✅ ACTIVE" : "⚠ activate failed";
      }
      console.log(`✓ ${label}`);
      console.log(`  ID: ${result.id} | ${activeTag}`);
      console.log(`  Webhook: https://n8n.srv1334356.hstgr.cloud/webhook/${def.nodes[0].parameters.path}\n`);
    } else {
      console.error(`✗ ${label} — FAILED:`, JSON.stringify(result).slice(0, 300));
    }
  } catch (e) {
    console.error(`✗ ${label} — ERROR:`, e.message);
  }
}

console.log("Done.\n");
console.log("Next steps:");
console.log("1. Add Twilio credential in n8n → Credentials → Twilio API");
console.log("   Then update TWILIO_CRED_ID in WF2/3/4 and set TWILIO_FROM number");
console.log("2. Add Stripe HTTP Basic Auth credential (sk_live_... as username, blank password)");
console.log("   Then update STRIPE_CRED_ID in WF3");
console.log("3. For WF5 AI Audit: add OpenRouter Header Auth credential (Authorization: Bearer sk-or-...)");
console.log("   Then update REPLACE_WITH_OPENROUTER_HEADER_CRED_ID in WF5");
console.log("4. Once Twilio bundle approved → activate WF2, WF3, WF4");
console.log("5. Set Twilio inbound webhook URL to: https://n8n.srv1334356.hstgr.cloud/webhook/twilio-inbound");
