# Rekindle Pro - Tactical Execution Blueprint

## Phase 1: Hero & Homepage Restructure (Week 1)

### Priority Tasks
| Task | Owner | Timeline | Status |
|------|-------|----------|--------|
| Restructure hero to lead with Ghost Lead Recovery | Dev | Day 1-2 | [ ] |
| Move reviews to secondary position below recovery | Dev | Day 1-2 | [ ] |
| Hide enterprise tier behind login/auth | Dev | Day 2 | [ ] |
| Update hero copy to lead with "Win back lost customers" | Content | Day 1 | [ ] |

### Hero Copy V2
```
OLD: [Hero: Reviews automation]
NEW: [Hero: Ghost Lead Recovery - Win back 40% of lost customers via SMS]
```

---

## Phase 2: Demo Flow Optimization (Week 1-2)

### Priority Tasks
| Task | Owner | Timeline | Status |
|------|-------|----------|--------|
| Move ROI calculator to start of demo (Aha moment first) | Dev | Day 3-4 | [ ] |
| Make SMS demo optional toggle, not required step | Dev | Day 3-4 | [ ] |
| Add "Book Free Audit" CTA above fold, prominent | Dev | Day 4-5 | [ ] |
| Remove friction from demo - reduce form fields | Dev | Day 4 | [ ] |

### Demo Flow V2
```
Landing → ROI Calculator (immediate) → Book Audit CTA
                              ↓ (optional)
                         SMS Demo
```

---

## Phase 3: Pricing & Tier Structure (Week 2)

### Priority Tasks
| Task | Owner | Timeline | Status |
|------|-------|----------|--------|
| Lead pricing page with Tier 1 (Lead Recovery) | Content/Dev | Day 6-7 | [ ] |
| Position Review Agent as entry-level product | Content | Day 6 | [ ] |
| Create Enterprise tier (hidden/contact sales) | Dev | Day 7-8 | [ ] |
| Add comparison table: DIY vs Rekindle | Content | Day 7 | [ ] |

### Pricing Tiers
```
Tier 1: Lead Recovery - £99/mo
  - SMS outreach to dormant customers
  - 2 campaigns/mo
  - Basic analytics

Tier 2: Review Agent - £149/mo (ENTRY)
  - Automated review requests
  - SMS + Email
  - Response handling
  - 500 reviews/mo

Tier 3: Full Suite - £299/mo
  - Everything in T2
  - Unlimited reviews
  - AI audit
  - Priority support

Enterprise: [Hidden] - Contact Sales
  - Custom integrations
  - Dedicated account manager
```

---

## Phase 4: Copy & Authority (Week 2-3)

### Priority Tasks
| Task | Owner | Timeline | Status |
|------|-------|----------|--------|
| Write founder story - Riccardo's background | Content | Day 8-9 | [ ] |
| Add "How it works" section with real metrics | Content | Day 9 | [ ] |
| Create 3 case studies (placeholders OK) | Content | Day 10-11 | [ ] |
| Remove any fake review indicators | Content | Day 8 | [ ] |
| Add trust badges: security, GDPR, testimonials | Dev/Content | Day 10 | [ ] |

### Authority Building Blocks
1. **Founder Authority**
   - Riccardo's background in hospitality/tech
   - Personal stake in outcome

2. **Social Proof (Real)**
   - Case studies with real numbers
   - No fake 5-star reviews
   - Customer logos (anonymized OK)

3. **Technical Authority**
   - Security certifications
   - GDPR compliance
   - Uptime guarantees

---

## Phase 5: Technical Execution Checklist

### n8n Workflows
- [ ] Import and activate `ai_ops_agent_web.json` → `/agent-web`
- [ ] Import and activate `ai_ops_agent_sms.json` → `/agent-sms`
- [ ] Import and activate `ai_ops_agent_voice.json` → `/agent-voice`
- [ ] Test webhook endpoints
- [ ] Set up error logging/DLQ

### Frontend
- [ ] Deploy updated landing to Netlify
- [ ] Test chat widget end-to-end
- [ ] Verify all CTAs track to correct webhooks
- [ ] Mobile responsive audit

### Analytics
- [ ] Set up conversion tracking (demo → signup)
- [ ] Add UTM parameters to all CTAs
- [ ] Create funnel dashboard

---

## Immediate Action Items (Today)

1. **Hero Copy** - Change to lead with Ghost Lead Recovery
2. **ROI Calculator** - Move to top of demo flow
3. **Book Audit CTA** - Add above fold, no scroll required
4. **n8n Activation** - Import and activate 3 agent workflows

---

## Success Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Demo conversion rate | 15% → 25% | 30 days |
| Audit bookings/week | 10 | 30 days |
| Lead recovery signups | 5/mo | 60 days |
| Average session duration | 2min → 4min | 30 days |

---

*Blueprint created: 2026-02-21*
*Owner: Nathan (AI Assistant)*
*Stakeholder: Riccardo*
