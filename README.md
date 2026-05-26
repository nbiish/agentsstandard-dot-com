# agentsstandard.com

> The website for the [Agents Standard](https://github.com/nbiish/agents-standard) — the AGENTS.md hierarchical configuration standard for AI agents.

**Live:** [agentsstandard.com](https://agentsstandard.com)

## What This Is

This is the source for [agentsstandard.com](https://agentsstandard.com), a static site that serves the AGENTS.md specification to humans, bots, crawlers, and agents. It is also the **community hub** for contributing to the standard:

- **[Open an issue](https://github.com/nbiish/agentsstandard-dot-com/issues/new)** to add a new agent, update config paths, or propose spec changes
- Issue templates: `new-agent`, `agent-update`, `spec-change`

## The Standard

The specification itself lives in a separate repo: **[nbiish/agents-standard](https://github.com/nbiish/agents-standard)**

This website repo is for the site + community contributions.

## Site Structure

```
agentsstandard-dot-com/
├── index.html              # The site (pure static HTML, no framework)
├── llms.txt                # Machine-readable summary for agents/crawlers
├── agents.json             # Structured spec data + agent config map
├── setup.sh                # Symlink ~/.agents/AGENTS.md to all agent configs
├── robots.txt              # Crawlability
├── sitemap.xml             # SEO
├── wrangler.toml           # Cloudflare Pages config
├── .github/ISSUE_TEMPLATE/ # Contribution issue templates
│   ├── new-agent.md
│   ├── agent-update.md
│   ├── spec-change.md
│   └── config.yml
└── LICENSE
```

## Design Principles

- **Pure static HTML** — no JavaScript framework, no build step, no Node dependency
- **~25KB total** — loads instantly on any connection
- **Machine-readable** — `llms.txt` and `agents.json` for agents/crawlers/bots
- **SEO-first** — semantic HTML, proper meta tags, sitemap, robots.txt
- **Dark by default** — matches the developer aesthetic

## Deploy

Deployed to [Cloudflare Pages](https://pages.cloudflare.com/). Zero build step — the root directory is the output.

```bash
# Deploy
npx wrangler pages deploy . --project-name agentsstandard-dot-com --branch main
```

## Related

| Repo | Purpose |
|------|---------|
| [nbiish/agents-standard](https://github.com/nbiish/agents-standard) | The specification itself (README, setup.sh, agents.json) |
| [nbiish/doU](https://github.com/nbiish/doU) | Agent skill: iterative goal execution |
| [nbiish/agentsstandard-dot-com](https://github.com/nbiish/agentsstandard-dot-com) | This repo — website + community hub |
| [agentskills.io](https://agentskills.io) | Companion standard for agent capabilities (SKILL.md) |

## License

MIT — see [LICENSE](LICENSE).
