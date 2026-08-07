# API Mart for game-art experiments under MXN 100

**Research date:** 2026-08-07
**Scope:** Official API Mart pages/documentation and Banco de México only. No account was funded, no API call was made, and no asset was generated. Prices and terms are a point-in-time snapshot and must be rechecked immediately before any spend.

## Bottom line

API Mart is inexpensive enough at the published inference rates to compare several image models and one audio model well below MXN 100. It is **not yet safe to fund for a commercial game**, however, because two gating facts are not reliably established in public materials:

1. A recent API Mart article says paid access starts with a USD 1 top-up, but the public Terms/FAQ do not set a platform-wide minimum and the unauthenticated site does not expose the checkout. The actual minimum and all-in MXN authorization therefore still require verification before funding; the Terms also allow Credit requirements to change dynamically.
2. API Mart says users retain rights to outputs, but also requires compliance with every upstream model provider's terms. The public model/pricing pages do not identify the exact upstream contract or license that governs each `-ext`/API Mart channel. API Mart's generic output-rights clause alone is therefore insufficient commercial-clearance evidence.

**Recommendation:** proceed only as a private, non-production evaluation, and only if the checkout screen allows a top-up of **no more than USD 4.00** and shows an all-in card authorization of **MXN 100 or less**. Do not ship, publish, sell, or place an output in the game until API Mart support confirms the upstream provider and applicable commercial-use terms in writing for the exact model ID/channel used.

## What is available and relevant

API Mart advertises one API/platform for 500+ models and lists image and audio categories in its current [model marketplace](https://apimart.ai/model) and [pricing table](https://apimart.ai/es/pricing). The following are the most relevant current offerings for concept art, tiles/backgrounds, characters, UI illustrations, iterative edits, music, and sound design. This is a focused shortlist, not the entire catalog.

### Image generation and editing

All dollar figures below are the site's displayed USD equivalents. The site currently displays **10 Credits = USD 1.00** across these rows, but the Terms define Credits as non-fiat, non-withdrawable platform units whose required amount may change dynamically ([pricing](https://apimart.ai/es/pricing), [Terms §§6–7](https://apimart.ai/es/terms)).

| Model ID / channel shown | Relevant use | Current API Mart price |
|---|---|---:|
| `gpt-image-2` (`gpt-image-2-ext`) | Cheap text-to-image exploration | 0.085 Credits/image (1K/default) ≈ **USD 0.0085**; 0.14 at 2K; 0.21 at 4K |
| `z-image-turbo` | Fast concept thumbnails | 0.10 Credits/image ≈ **USD 0.010**; prompt extension 0.20 ≈ USD 0.020 |
| `nano-banana-ext` / `nano-banana-2-lite-ext` | Low-cost drafts | 0.125 Credits/image ≈ **USD 0.0125** |
| `grok-imagine-1.5-apimart` | Concepts and visual variants | 0.15 Credits/image ≈ **USD 0.015** |
| `grok-imagine-1.5-edit-apimart` | Editing an existing draft/reference | 0.15 Credits/image ≈ **USD 0.015** |
| `qwen-image-2.0` | Alternative style/text rendering comparison | 0.20 Credits/image ≈ **USD 0.020** |
| `flux-2-pro` | Higher-fidelity concepts; resolution-based | 0.24/0.36/0.48/0.60 Credits per 1/2/3/4 MP image ≈ **USD 0.024/0.036/0.048/0.060** |
| `nano-banana-2-ext` | Resolution-controlled generation/editing | 0.15 Credits at 0.5K or 1K; 0.20 at 2K; 0.25 at 4K ≈ **USD 0.015–0.025/image** |
| `nano-banana-pro-ext` | Higher-quality refinement | 0.30 Credits default ≈ **USD 0.030/image**; 0.40 at 4K ≈ USD 0.040 |
| `dall-e-3` | General illustration benchmark | 0.32 Credits/image ≈ **USD 0.032** |
| `flux-kontext-pro` | Controlled image edits/iteration | 0.32 Credits/image ≈ **USD 0.032** |
| `imagen-4.0-apimart` | General polished illustration benchmark | 0.40 Credits/image ≈ **USD 0.040** |
| `midjourney` | Stylized concept benchmark; Niji variants listed | 0.4504 Credits/generation ≈ **USD 0.04504** default; common edit/variation actions 0.5504 ≈ USD 0.05504 |
| `gpt-image-1-official`, `gpt-image-1.5-official`, `gpt-image-2-official` | Official-channel image generation/editing | Token-metered; the table warns costs are estimates and billing follows actual token use. Example `gpt-image-1.5-official` 1024×1024: low 0.0576 Credits ≈ USD 0.00576, medium 0.2176 ≈ USD 0.02176, high/auto 0.8512 ≈ USD 0.08512 |

Source for every rate: API Mart's live [Spanish pricing page](https://apimart.ai/es/pricing). Rates are per image or per generation as labeled; a “generation” may not mean one final usable asset. Token-metered models can exceed a nominal example.

These models are useful for **drafts and source material**, not direct engine-ready spritesheets. The public pages do not promise pixel-perfect sprite consistency, tileability, alpha-channel quality, deterministic character identity, exact output formats, or reproducible seeds for every model. Those properties must be tested per endpoint.

### Audio

| API/model | Relevant use | Current published price/status |
|---|---|---:|
| `Suno` | Complete music, instrumental tracks, lyrics, stems, editing, **sound effects**, MIDI/WAV export | Marketplace related-model card shows 0.68 Credits ≈ **USD 0.068**; the model page warns actual cost depends on final output ([Suno page](https://apimart.ai/es/model/suno)) |
| `Flow Music` | Instrumental background themes/loops, songs, stems, 1–240 second duration control | API and commercial-use label are published, but **no numeric rate rendered in the public pricing details**; it says pricing appears when available and actual cost depends on output ([Flow Music page](https://apimart.ai/es/model/flow-music)) |

**Unknown:** whether USD 0.068 for Suno is per requested operation, per returned track, or a starting/default price, and whether sound-effect/export/edit operations use different rates. Flow Music cannot enter a strict budget until the dashboard shows a firm maximum charge. For this reason, audio is an optional last-stage test with its own stop condition.

## Currency, Credits, minimum funding, and payment caveats

- API Mart prices in Credits with approximate **USD** equivalents; it does not publish MXN inference prices. Credits are not cash, cannot be withdrawn, bear no interest, and their model/channel redemption rate may change dynamically ([Terms §6](https://apimart.ai/es/terms)). Consumed and promotional Credits are generally non-refundable; successful requests are billed, while the Terms say failed generations are not billed ([Terms §7](https://apimart.ai/es/terms)).
- The home-page FAQ says pay-as-you-go has no monthly minimum and supports Antom (Visa/Mastercard/Alipay), crypto, PayPal, and Creem, subject to regional availability ([API Mart FAQ](https://apimart.ai/es)). “No monthly minimum” does **not** establish the smallest top-up.
- A recent official API Mart article says paid access starts with a **USD 1 minimum top-up** ([Kimi K3 API guide](https://apimart.ai/blog/kimi-k3-api-features-pricing-how-to-access)). That statement appears in a model tutorial rather than the platform Terms or billing documentation, and the authenticated checkout was not accessed. Treat USD 1 as a published claim, not a guaranteed Mexican-account minimum. The checkout amount is the authority for the experiment; if it requires more than USD 4.00, stop.
- Banco de México explains that FIX is a wholesale-market reference determined on banking days, not a promise of the rate a card, PayPal, crypto venue, or payment processor will apply ([Banxico exchange-rate methodology](https://www.banxico.org.mx/tipcamb/tipCamMIAction.do)). Processor spread, foreign-transaction fees, VAT/tax treatment, crypto network fees, and a temporary card authorization could make the actual MXN debit higher.
- For planning only, use a deliberately conservative **MXN 18.00/USD** reference, near the recent official Banxico observations visible during this research, but accept the transaction only on the payment provider's final MXN amount. At that planning rate, MXN 100 ≈ USD 5.56; the experiment deliberately caps funding at USD 4.00 to leave MXN 28 for FX/payment uncertainty.

## Licensing and commercial-use assessment

API Mart's Terms say:

- the user retains all rights to input data and generated outputs;
- the user grants API Mart a limited processing and temporary-storage license to provide the service;
- API Mart does not use the data to train models or share it except as needed to provide the service;
- users must not infringe intellectual-property or third-party rights; and
- users **must comply with the terms of the underlying AI model providers** and review/validate outputs before production ([Terms §§4–5, 13](https://apimart.ai/es/terms)).

The Flow Music page explicitly labels the API “Uso comercial” ([Flow Music](https://apimart.ai/es/model/flow-music)). API Mart's first-party Suno article, however, explains that Suno's free-plan outputs are noncommercial and rights depend on the plan active at generation time; it does not clearly prove which Suno plan/license covers an API Mart request ([API Mart Suno pricing article](https://apimart.ai/blog/suno-pricing-access-free-songs-pro-plans-commercial-rights-developer)).

**Commercial conclusion:** API Mart's generic “retain all rights” clause is favorable but not a complete warranty of copyright, exclusivity, non-infringement, or model-specific commercial permission. For each candidate intended for the shipped game, obtain written answers from API Mart identifying (1) the upstream provider/channel, (2) the incorporated provider terms/version, (3) whether commercial game distribution and sublicensing through storefronts are allowed, and (4) whether attribution or AI disclosure is required. Keep the response, exact model ID, timestamp, prompt, input provenance, invoice, and output hash in the asset record.

Do not prompt for living artists' styles, copyrighted characters, trademarks, or unlicensed reference images/audio. Human art direction and substantial editing are still prudent because copyright protection for purely AI-generated material varies by jurisdiction; API Mart makes the customer responsible for local law and AI labeling/disclosure ([Terms §15](https://apimart.ai/es/terms)). This report is a risk screen, not legal advice.

## Data and privacy assessment

API Mart's [Privacy Policy](https://apimart.ai/es/privacy) (last updated 2025-10-15) says it may collect identity/contact/technical/usage data; API keys, request logs, metrics, and billing data; Credit/transaction history; and **prompts, inputs, and generated outputs**. It uses these to deliver requests, calculate billing, improve service/API performance, provide support, and detect abuse. It states access is limited to personnel/contractors/third parties with a business need.

The [Terms](https://apimart.ai/es/terms) add that generated outputs may be stored temporarily, data is not used to train AI models, sharing occurs where necessary to provide the service, and some responses may be cached for performance.

Important unknowns not answered by the public documents:

- exact prompt/input/output retention and cache duration;
- deletion timing and backup retention after an erasure request;
- subprocessors and which upstream model provider receives each request;
- storage/processing countries and cross-border transfer mechanism;
- encryption specifics for content in transit/at rest (the FAQ only says API keys are encrypted);
- enterprise DPA, breach-notice commitment, audit reports/certifications, or opt-out controls;
- whether upstream providers independently retain or train on submitted content.

For the experiment, use only synthetic/nonconfidential prompts and project-owned references. Do not submit personal data, unreleased story/script material, credentials, client assets, voice samples, or any source art/audio whose license does not permit processing by API Mart and its upstream providers. Download accepted results promptly rather than treating result URLs as durable storage.

## Concrete MXN-100 experiment

### Funding gate

1. Recheck the live pricing page and Terms on the day of testing.
2. In checkout, attempt **USD 4.00 / 40 Credits maximum**. Do not complete payment unless the provider shows the final authorization, including fees/tax, at **≤ MXN 100**.
3. If the minimum is above USD 4.00, the charge is presented only in USD without a reliable all-in MXN authorization, there is an auto-recharge/subscription, or a temporary authorization could push total exposure above MXN 100: **stop with zero spend**.
4. Disable auto-recharge. Create a dedicated key, server-side only, and revoke it after the test.
5. Run any API client, prompt harness, downloader, or result-analysis helper **inside Docker**. Do not install SDKs or packages on the host. Pass the dedicated key at container runtime through an environment variable or Docker secret (never bake it into an image, commit it, or expose it to browser/client-side code), mount only a dedicated output directory, and remove the test container after exporting the billing log and accepted outputs.

### Planned calls (maximum 37.056 Credits ≈ USD 3.7056)

Use one fixed, rights-safe brief (for example, an original fantasy roadside shrine with no named artist/franchise) and record the returned billed amount after every batch.

| Stage | Calls | Published maximum for planned settings |
|---|---|---:|
| Breadth: thumbnails | 10 `z-image-turbo` + 10 Grok Imagine 1.5 + 10 Qwen Image 2.0 + 10 `flux-2-pro` at 1 MP | 6.9 Credits = USD 0.69 |
| Breadth: polished alternatives | 5 Nano Banana Pro default + 5 Imagen 4.0 + 5 Midjourney default | 5.752 Credits = USD 0.5752 |
| Editing/control | 10 Grok Imagine edit + 10 Flux Kontext Pro | 4.7 Credits = USD 0.47 |
| Refinement of winners | 20 `flux-2-pro` at 1 MP + 20 Nano Banana 2 at 1K + 10 Imagen 4.0 + 10 Midjourney default | 16.304 Credits = USD 1.6304 |
| Optional audio, only after the license/rate gates below | up to 5 Suno default generations | 3.4 Credits = USD 0.34 |
| **Planned total** | **135 image calls/generations + up to 5 audio generations** | **37.056 Credits = USD 3.7056 ≈ MXN 66.70 at 18.00/USD** |

The remaining 2.944 Credits (USD 0.2944) are an unused in-account buffer; approximately MXN 28 of the original cap is reserved outside API Mart for payment/FX uncertainty. Never “use up” either buffer merely because it exists.

### Stop conditions

Stop immediately if any one occurs:

- checkout exposure would exceed MXN 100, minimum funding exceeds USD 4.00, or auto-recharge cannot be disabled;
- actual balance deduction for any call exceeds the listed rate by more than 10%, a batch has variable/token billing without a reliable pre-call cap, or remaining balance falls below the maximum cost of the next call;
- cumulative API deductions reach **37.056 Credits**, regardless of remaining balance;
- any external debit/authorization plus the MXN value of planned remaining calls could exceed MXN 100;
- the model ID/channel or live rate differs from this report;
- two consecutive outputs are unusable for the measured criterion (composition adherence, edit fidelity, character consistency, tile seams, alpha/background cleanup, or audio loopability); do not burn more calls on that model;
- an endpoint returns multiple billable outputs unexpectedly, retries automatically, or billing is unclear;
- the experiment would require a host-installed runtime/package or a non-containerized helper; containerize it first or stop;
- a prompt/reference would expose confidential, personal, or third-party-restricted material;
- for audio: the UI does not show a firm ≤0.68-Credit maximum **and** API Mart has not confirmed in writing that the exact Suno API channel grants commercial game-use rights. If either is missing, skip audio entirely;
- any asset is being considered for release before upstream commercial terms are documented. Evaluation may continue privately, but production use stops.

## Questions that must be resolved before production

1. What is today's exact minimum top-up for a Mexican account and each available payment channel, including all fees/taxes?
2. Does the dashboard support a hard account/API-key spending cap (not merely an alert), and is auto-recharge off by default?
3. Which upstream provider and terms govern every shortlisted `-ext`, `-apimart`, and `official` channel?
4. Are outputs from each exact channel licensed for commercial video-game distribution, promotional use, storefront sublicensing, and derivative editing? Any attribution or AI-label requirement?
5. What is the exact price unit and worst-case charge for Suno sound effects/music and Flow Music, including number/duration of outputs?
6. What are the retention period, cache duration, subprocessor list, processing locations, deletion SLA, and upstream training/retention rules?

Until these are answered, API Mart is suitable only for a tightly capped, nonconfidential evaluation—not a cleared production-art pipeline.
