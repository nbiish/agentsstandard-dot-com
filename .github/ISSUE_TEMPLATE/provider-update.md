---
name: "📋 Provider Update"
about: Update or add LLM provider/model entries to providers.txt
title: "[PROVIDER] "
labels: provider
assignees: ''
---

**Provider namespace** (lowercase, hyphen-separated):
`example-provider`

**Change type:**
- [ ] New provider
- [ ] New model(s) for existing provider
- [ ] Update existing model metadata (context window, capabilities, etc.)
- [ ] Deprecate/remove model or provider
- [ ] Fix incorrect information

**API endpoint:**
```
https://api.example.com/v1
```

**Environment variable:**
`EXAMPLE_API_KEY`

**Models affected:**

| Model ID (API) | Display Name | Context | Output | Tools | Img | Cache | Reasoning |
|----------------|--------------|---------|--------|-------|-----|-------|-----------|
| `model-v1` | prefix:model-v1 | 128,000 | 8,192 | YES | NO | NO | NO |

**Zed custom provider prefix** (2-5 chars, if applicable):
`exmp`

**Cross-tool compatibility:**
Which agents have you verified this provider with?
- [ ] Hermes
- [ ] Zed
- [ ] kilo / crush
- [ ] pi / goose
- [ ] dcode / cline
- [ ] qwen-code
- [ ] Other: ___

**Source/documentation:**
- API docs URL:
- Model card URL:
- Pricing URL:

**Referral code** (optional):
```
```

**Notes:**
<!-- Any special behavior, compatibility issues, or caveats -->
