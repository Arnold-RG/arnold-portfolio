# Arnold Rurangwa

Personal site for Arnold Rurangwa, computer engineer in Kraków.

**Live:** [https://arnold-rg.github.io/arnold-portfolio/](https://arnold-rg.github.io/arnold-portfolio/)

The repository homepage also points at [https://arnold-rg.github.io/](https://arnold-rg.github.io/). This project publishes the portfolio at the address above.

## Preview locally

From the repository root:

```bash
python3 -m http.server 8000
```

Open [http://127.0.0.1:8000/](http://127.0.0.1:8000/).

## Publish

GitHub Pages currently builds this site from the `main` branch, which is what serves the live URL.

`.github/workflows/pages.yml` can publish the same files through GitHub Actions. After that workflow is on `main`, switch the source:

1. Open **Settings → Pages → Build and deployment**.
2. Set **Source** to **GitHub Actions**.

Until that setting is changed, publishing from the `main` branch keeps the site up to date. The Actions deploy step will fail while Pages is still set to deploy from a branch.

## In this repository

| Path | What it is |
| --- | --- |
| `index.html` | The site |
| `assets/` | Styles, scripts, fonts, portrait, logo, resume |

The opening view is a brass armillary drawn in the page, and the eight projects sit on a ring you can drag. Both fall back to a still layout when motion is reduced.
| `Folio/` | Earlier version, kept for reference |

## Contact

- Kraków, Poland
- +48 575 217 930
- [GitHub](https://github.com/Arnold-RG)
- [LinkedIn](https://www.linkedin.com/in/rurangwa-arnold-53b90520b/)
- [rurangwaarnold32@gmail.com](mailto:rurangwaarnold32@gmail.com)
