# Engineering Portfolio

**Portfolio · Public website** · [Repository](https://github.com/Arnold-RG/arnold-portfolio) · [Open website](https://arnold-rg.github.io/arnold-portfolio/)

## Overview

Personal computer-engineering portfolio and résumé website presenting projects and professional experience. Built as a static website rather than a backend application.

> **Engineering status:** Repository structure reviewed in November 2026. Specific capabilities and platform/device security are not certified by this README. Confirm a behavior with source and tests before making public claims.

## Technology and architecture

**Observed stack:** HTML, CSS, JavaScript; GitHub Pages.

| Location | Purpose |
| --- | --- |
| `index.html` | Main portfolio landing page |
| `resume.html` | Résumé view |
| `assets/` | Styles, media, visual assets |
| `Folio/` | Additional portfolio materials |
| `scripts/` | Supporting project scripts |
| `.github/` | Automation and publishing definitions |

## Quick start

Install Git and the appropriate runtime/SDK first; inspect the configuration and existing scripts before running anything against production. From the repository root:

```sh
python -m http.server 8000
# Visit http://localhost:8000
```

**Development guidance:** Open in a browser or serve the repository root through a local HTTP server. Deployment is via the repository's configured GitHub Pages workflow; verify its status in Actions.

## Product scope and usability

- Portfolio sections and project links should be accurate and up to date.
- Responsive typography, accessible navigation, clear contact actions and honest skills representation.
- A live résumé page should be synchronized with the user's approved career details.

The release experience should support clear labels, accessible focus/keyboard navigation (where applicable), useful errors, and truthful customer-facing information. Preview changes before publishing.

## Security and privacy

- Publish only approved résumé/contact information and photos; avoid credentials or secrets in client-side code.
- Review external scripts and asset licensing, and set appropriate hosting security headers where supported.
- Validate third-party links, keyboard access, image alternatives and performance before release.

Use least privilege, documented trust boundaries and secret scanning. Never include real access tokens in examples. Report vulnerabilities privately through the repository's `SECURITY.md` when available.

## Quality assurance and DevOps

| Release gate | Expected evidence |
| --- | --- |
| Build | Clean, reproducible build using locked dependency versions where available |
| Tests | Unit/integration or relevant command-line tests; passing CI run links |
| Security | Dependency/secret scans and review of authentication and data handling |
| UX | Mobile/desktop and accessibility checks for interactive web interfaces |
| Delivery | Reviewed changes, environment separation, verified deployments and rollback plan |
| Operations | Logs/metrics/alerts for running services; availability/link checks for static websites |

**Important:** This table defines the target quality process, not a claim that every check has passed. Kubernetes is optional and should be introduced only when real backend complexity and scale justify it.

## Working on the project

Keep changes small and reviewable. Update this README when commands or features change, attach test evidence to pull requests, maintain honest limitations and review licenses before adding assets. The repository owner approves release publication.
