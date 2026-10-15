# Security Policy

## Supported versions

The live site at [https://arnold-rg.github.io/arnold-portfolio/](https://arnold-rg.github.io/arnold-portfolio/) is the supported surface. Report issues against the current `main` branch.

## Reporting a vulnerability

Please report security issues privately:

- Email: [rurangwaarnold32@gmail.com](mailto:rurangwaarnold32@gmail.com)
- Or open a private [GitHub security advisory](https://github.com/Arnold-RG/arnold-portfolio/security/advisories/new) if available

Do not open a public issue for exploitable vulnerabilities.

Include:

1. A short description of the issue
2. Steps to reproduce (or a proof of concept)
3. Impact assessment if known
4. Your preferred contact for follow-up

You should receive an acknowledgement within 7 days. Fixes will be prioritized by severity.

## Scope

In scope:

- Cross-site scripting or injection on this static site
- Sensitive data exposure in repository contents
- Misconfiguration in GitHub Pages / Actions that weakens deployment integrity

Out of scope:

- Social engineering of the maintainer
- Denial-of-service against GitHub Pages infrastructure
- Issues in third-party sites linked from the portfolio

## Hardening notes

This is a static site with no backend forms or auth. External links use `rel="noopener noreferrer"`. Referrer policy is `strict-origin-when-cross-origin`. User-facing copy uses `textContent` in scripts. Secrets must never be committed; see `.gitignore`.
