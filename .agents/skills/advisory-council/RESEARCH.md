# Research: Expanding `advisory-council` Beyond Finance While Preserving Personas

## Goal

Improve [.agents/skills/advisory-council/SKILL.md](file:///Users/nbiish/code/ainish-coder/.agents/skills/advisory-council/SKILL.md) so the council can be used for a broad range of tasks (financial advice, consulting, SEO, remote work, any codebase, general problem-solving) while preserving distinct expert personas and producing a usable consensus output.

## Current State (What Works / What Doesn’t)

- **Works**: Strong identity injection for finance experts; deterministic-ish methodology sections; a clear “append to deliberation file then synthesize” orchestration pattern.
- **Doesn’t scale**: Finance-centric terms (“bullish/bearish”, “Key Metrics”) and selection guidance limit applicability outside investing.
- **Missing**: A domain-agnostic “council core” (skeptic/ethics/execution/synthesis) that should appear in every council regardless of domain.
- **Missing**: A standard domain detection + expert registry mechanism so the orchestrator can reliably pick non-finance specialists (SEO, remote work, software/security, consulting).
- **Risk**: Without explicit guardrails, broad-task coverage increases hallucination, privacy leaks, and “professional advice” liability (finance/legal/medical).

## Proposed Design (Minimal + Extensible)

### 1) Add Domain Detection Up Front

Have the orchestrator classify each query before selecting experts:

```text
Input:  user query string
Output: { domain, subdomain, urgency, complexity }
```

Suggested baseline domain taxonomy (extend as needed):

| Domain | Examples |
|---|---|
| finance | valuation, portfolio, crypto |
| consulting | strategy, ops, pricing, market entry |
| seo | technical SEO, content, links, analytics |
| career | job search, negotiation, promotion |
| remote-work | async, tooling, timezone ops |
| software | architecture, refactor, stack choice |
| security | threat modeling, IR, compliance |
| marketing | positioning, distribution, growth loops |
| product | roadmap, prioritization, research |
| legal | contracts, IP, licensing |
| general | anything else |

### 2) Introduce “Council Core” Personas (Always Included)

Add 4 always-dispatched personas to prevent blind spots across *any* domain:

- **skeptic** (red-team / adversarial): finds failure modes, broken assumptions, downside.
- **ethicist** (values / stakeholder impact): harm/fairness, second-order effects, precedent.
- **implementer** (execution / pragmatism): converts recommendations into steps, dependencies, blockers.
- **synthesist** (systems / reframing): zooms out, reframes, identifies missing info that would change the answer.

These can coexist with existing finance personas; they’re structural coverage, not topic coverage.

### 3) Generalize the Per-Expert Output Template

Replace finance-specific labels with domain-agnostic ones:

- “Key Metrics” → **Key Factors**
- “bullish/bearish/neutral” → **favorable/unfavorable/neutral** (or “n/a” if not applicable)

Recommended per-expert section template:

```markdown
## {Expert Name} — {Archetype}

### Assessment
{2-4 sentence assessment of the problem from this expert’s lens}

### Key Factors
- {Factor 1}: {brief explanation}
- {Factor 2}: {brief explanation}
- {Factor 3}: {brief explanation}

### Signal
{favorable | unfavorable | neutral | n/a}

### Confidence
{0-100}% — {one-line justification}

### Reasoning
{premises → analysis → conclusion}
```

### 4) Add a Domain Specialist Registry (Non-Finance Packs)

Keep the existing finance roster intact, and add non-finance specialist IDs in a small registry table the orchestrator can select from:

| Domain | Specialist IDs (examples) |
|---|---|
| consulting | strategist, operator, market-analyst, cost-optimizer, org-designer |
| seo | technical-seo, content-strategist, link-builder, serp-analyst, analytics |
| remote-work | async-leader, tooling-expert, culture-builder, productivity-coach |
| software | architect, staff-swe, sre, perf-engineer, qa |
| security | red-team, blue-team, incident-responder, compliance, crypto-engineer |
| marketing | brand-strategist, growth-hacker, channel-expert, lifecycle-marketer |
| product | pm, user-researcher, data-analyst, design-lead |
| legal | contract-lawyer, ip-lawyer, compliance-officer |

To keep SKILL.md from ballooning, define **full profiles** for only a few high-utility non-finance personas (e.g., `technical-seo`, `strategist`, `staff-swe`, `incident-responder`) and allow the orchestrator to synthesize other specialists from a schema (next section).

### 5) Standardize a Persona Schema (Identity Injection Data)

The current finance profiles are very rich. To support any domain, standardize the fields so *every* persona (existing or new) can be rendered consistently:

```yaml
id: staff-swe
name: Senior Staff SWE
archetype: Systems Pragmatist
domains: [software]
identity: >
  2-3 sentences: who they are, what they’re known for, what they optimize for.
thinking_framework:
  - bullet mental models / priorities
methodology:
  - steps, checklists, scoring thresholds when applicable
communication_style: >
  tone, length, formatting preferences
evidence_rules:
  - what must be verified / sourced
guardrails:
  - things they must refuse / avoid
```

This preserves “deep persona” behavior while enabling consistent synthesis across domains.

### 6) Upgrade the Selection Guide for Broad Tasks

Replace the current finance-heavy selection table with a broader matrix:

| Task Type | Recommended Personas |
|---|---|
| Any query (baseline) | skeptic, ethicist, implementer, synthesist |
| Investment / valuation | finance pack + skeptic + implementer |
| Strategy / consulting | strategist, operator, market-analyst + core |
| SEO optimization | technical-seo, content-strategist, serp-analyst + core |
| Remote work systems | async-leader, tooling-expert, culture-builder + core |
| Codebase question | staff-swe, architect, qa (and security if relevant) + core |
| Security review | red-team, blue-team, compliance + core |

### 7) Strengthen Synthesis (Consensus + Disagreement + Confidence)

Add a synthesis algorithm that works for any domain:

- **Signal alignment**: count favorable/unfavorable/neutral to compute consensus strength.
- **Factor overlap**: tally repeated Key Factors; treat high-overlap factors as “consensus drivers”.
- **Disagreement clustering**: group by signal, extract the crux (single premise causing divergence), estimate reconciliation potential.
- **Confidence calibration**: apply a disagreement penalty; present confidence as a range; cap confidence if a “fatal flaw” is flagged by any expert.

Recommended synthesis output sections:

```markdown
## Council Synthesis
### Consensus View
### Key Disagreements (with crux + reconciliation potential)
### Risks & Failure Modes
### Execution Plan (first 3 steps)
### Final Recommendation (with confidence range)
### Signal Distribution
| Expert | Signal | Confidence |
```

## Guardrails (Required for Broad-Domain Councils)

### Professional Advice Boundaries

- **Finance**: present as educational/general information; require explicit assumptions; encourage consultation with licensed professionals for personalized plans.
- **Legal/Medical**: provide general info only; avoid jurisdiction-specific directives; prompt user to consult a qualified professional for decisions.

### Evidence / Anti-Hallucination Rules

- Separate **Facts** vs **Assumptions** explicitly.
- If a claim would materially change a recommendation, require a **source** or mark it “unverified”.
- For numerical outputs: show the formula and inputs; avoid invented figures.

### Privacy & Secrets for Codebase Questions

- Never request or echo secrets (API keys, tokens, private keys).
- Redact sensitive strings if encountered.
- When advice depends on repository reality, require file references or explicitly state uncertainty.

### Risk Register Template (Add to Synthesis)

```markdown
### Risk Register
| Risk | Likelihood | Impact | Detectability | Mitigation | Owner |
|---|---:|---:|---:|---|---|
```

## Example Non-Finance Persona Profiles (Seed Set)

These are candidates to add as full profiles in SKILL.md (shortened here; expand to match finance-profile depth as needed).

### `technical-seo` — Technical SEO Lead

- **Archetype**: Crawl/Index Performance Engineer
- **Focus**: crawlability, site architecture, CWV/perf, schema, internal linking, log analysis
- **Methodology**: diagnose → prioritize by impact/effort → implement → measure (GSC + logs)
- **Voice**: metric-first, actionable, implementation-minded

### `strategist` — Management/Strategy Consultant

- **Archetype**: MECE Issue-Tree Builder
- **Focus**: structured problem definition, hypotheses, options, tradeoffs, implementation plan
- **Methodology**: objective → issue tree → analyses → recommendation → plan + owners
- **Voice**: crisp, structured, decision-oriented

### `staff-swe` — Senior Staff Software Engineer

- **Archetype**: Systems Pragmatist
- **Focus**: maintainability, reliability, security, delivery velocity, operational excellence
- **Methodology**: constraints → tradeoffs → incremental plan → verify with tests/metrics
- **Voice**: practical, opinionated about tradeoffs, prefers small safe changes

## Migration Plan (How to Update SKILL.md)

1. Update the prompt template and synthesis template to domain-agnostic labels (Key Factors, favorable/unfavorable).
2. Add the 4 Council Core personas (full profiles).
3. Add domain detection guidance + domain specialist registry table.
4. Add 3-6 full non-finance profiles as a seed set; rely on the persona schema to extend over time without exploding file size.

