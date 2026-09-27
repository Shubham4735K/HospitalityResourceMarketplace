# ResShare AI — Nugen Domain Alignment & Integration

## Overview

This directory documents the AI capability integrated into **ResShare — Hospitality Resource Exchange**.

The AI Resource Finder allows hospitality businesses (restaurants, caterers, hotels, venues, cloud kitchens) to express complex, unformatted resource needs in conversational plain English. A domain-aligned language model then extracts structured hospitality intent, which is fed directly into ResShare's verified marketplace database and deterministic matching engine.

---

## Model Specifications

| Parameter | Specification |
| :--- | :--- |
| **Base Model** | `Qwen-V2p5-0p5b-Instruct` |
| **Nugen Alignment** | `reshare-hospitality-requests-qwen-v2p5-0p5b-instruct-aligned` |
| **Domain** | Hospitality Resource Discovery and Requirement Extraction |
| **Domain Data** | • Hospitality domain knowledge<br>• Resource taxonomy (kitchens, prep areas, venues, commercial equipment, decor/supplies)<br>• Hospitality request examples |
| **Benchmark** | ResShare Nugen hospitality benchmark |
| **Integration** | Natural language → structured requirement → ResShare matching → actual availability |

---

## Architectural Principle: Truth Separation

> [!IMPORTANT]
> **The AI must NOT determine actual availability.**
> The existing ResShare database remains the sole source of truth for:
> - Resources and host businesses
> - Availability schedules and operating windows
> - Bookings and confirmations
> - Scheduling conflicts and calendar exports
> - Financial rates and transactions

The AI's single responsibility is **requirement extraction and intent structuring**. Matching and availability verification are handled strictly by ResShare's deterministic backend logic.

---

## End-to-End Integration Flow

```
React UI (AI Resource Finder)
   │
   │  Natural Language Text
   ▼
POST /api/ai/analyze
   │
   │  Proxy & Credential Protection
   ▼
Express Backend (`server/routes/ai.js`)
   │
   │  Service Abstraction (`server/services/nugenService.js`)
   ▼
Nugen Aligned Model (`reshare-hospitality-requests-qwen-v2p5-0p5b-instruct-aligned`)
   │
   │  Structured Hospitality Intent JSON
   ▼
ResShare Matching & Database Filtering (`src/utils/matching.js`, `src/utils/nugenAI.js`)
   │
   │  Deterministic Rule Scoring & Verified "Why This Matches" Justification
   ▼
Verified Resource Cards & Operating Availability
```

---

## Structured Output Schema

The Nugen-aligned model converts natural language requests into the following structured JSON schema:

```json
{
  "intent": "FIND_RESOURCE",
  "category": "Commercial Kitchen",
  "capacity": 80,
  "date": "next Saturday",
  "location": "Navi Mumbai",
  "requirements": [
    "ovens",
    "refrigeration",
    "prep space"
  ]
}
```

### Example

**User Input:**
> *"I need a commercial kitchen for 80 guests next Saturday evening near Navi Mumbai. We need ovens, refrigeration and prep space."*

**AI Extraction:**
- **Intent**: `FIND_RESOURCE`
- **Category**: `Commercial Kitchen` (maps to ResShare's `Commercial Kitchen & Prep`)
- **Capacity**: `80`
- **Date**: `next Saturday`
- **Location**: `Navi Mumbai`
- **Requirements**: `["ovens", "refrigeration", "prep space"]`

---

## Configuration & Environment Variables

Credentials and model identifiers are configured **strictly on the Express backend** (`server/`). They are **never** exposed to Vite/React client bundles.

| Environment Variable | Description | Default / Example Value |
| :--- | :--- | :--- |
| `NUGEN_API_KEY` | API Key for Nugen inference service | `nug_live_...` |
| `NUGEN_MODEL_ID` | Fine-tuned aligned model identifier | `reshare-hospitality-requests-qwen-v2p5-0p5b-instruct-aligned` |
| `NUGEN_API_ENDPOINT` | Inference API URL | `https://api.nugen.in/api/v3/inference/chat/completions` |
| `NUGEN_ALIGNMENT_STATUS` | Alignment readiness flag (`completed`) | `completed` |
| `NUGEN_FALLBACK_MODE` | Force demo fallback adapter (optional) | `false` |

---

## Fallback / Demo Adapter Isolation

While domain alignment training is running (or in environments without active credentials), the backend includes an **isolated fallback demo adapter** (`analyzeWithFallbackAdapter` in `server/services/nugenService.js`).

- The fallback adapter uses deterministic rule and keyword parsing to simulate model inference for rapid local frontend testing.
- The adapter response explicitly returns `source: "fallback_demo_adapter"` and `isFallback: true` with a clear disclaimer.
- It does **not** pretend to be the customized Nugen model.
- Once `NUGEN_API_KEY` is provided, `nugenService.js` automatically routes calls to the live aligned model without code changes.

---

## Verified "Why This Matches" Justification

When the AI criteria are fed into the marketplace, ResShare presents a **"Why this matches"** breakdown for every candidate resource.

This breakdown is generated based **only on actual database and resource attributes**:
1. **Category Match**: Validates `resource.category` against the mapped requirement.
2. **Location Proximity**: Validates `resource.location` against the seeker's target area (e.g., Bandra West, Mumbai for Navi Mumbai/Mumbai region).
3. **Equipment Specs**: Cross-references parsed requirements against verified lines in `resource.specs` (e.g. *3-Deck Roto-Deck Stone Hearth Oven* satisfies *ovens*).
4. **Operating Window**: Cross-references `resource.availability` and schedule from the database.

---

## Exact Remaining Steps After Alignment Completes

When the Nugen alignment project completes training for `reshare-hospitality-requests-qwen-v2p5-0p5b-instruct-aligned`:

1. **Obtain API Key & Model ID**:
   - Confirm the deployed model ID: `reshare-hospitality-requests-qwen-v2p5-0p5b-instruct-aligned`.
   - Generate your Nugen inference API key from the Nugen dashboard.

2. **Configure Backend Environment**:
   - Add the following to your `server/.env` (or server hosting environment):
     ```env
     NUGEN_API_KEY="your-nugen-api-key-here"
     NUGEN_MODEL_ID="reshare-hospitality-requests-qwen-v2p5-0p5b-instruct-aligned"
     ```

3. **Verify Live Inference**:
   - Send a test request to `POST http://localhost:5000/api/ai/analyze` with:
     ```json
     { "prompt": "I need a commercial kitchen for 80 guests next Saturday evening near Navi Mumbai. We need ovens, refrigeration and prep space." }
     ```
   - Verify that the response returns:
     - `"source": "nugen_aligned_model"`
     - `"isFallback": false`
     - `"model": "reshare-hospitality-requests-qwen-v2p5-0p5b-instruct-aligned"`

4. **Zero Frontend Changes Required**:
   - The React UI and service abstraction will immediately use the aligned model seamlessly.
