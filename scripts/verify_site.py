#!/usr/bin/env python3
"""Dependency-free quality checks for the published static entrypoint."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import sys

ROOT = Path(__file__).resolve().parents[1]


class PageInspector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.lang = False
        self.viewport = False
        self.description = False
        self.charset = False
        self.in_title = False
        self.title = ""
        self.local_assets = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html":
            self.lang = bool(a.get("lang", "").strip())
        if tag == "title":
            self.in_title = True
        if tag == "meta":
            self.viewport |= a.get("name", "").lower() == "viewport" and bool(a.get("content", ""))
            self.description |= a.get("name", "").lower() == "description" and bool(a.get("content", "").strip())
            self.charset |= bool(a.get("charset", ""))
        if tag == "script" and a.get("src"):
            self.local_assets.append(a["src"])
        if tag == "link" and "stylesheet" in a.get("rel", "").split() and a.get("href"):
            self.local_assets.append(a["href"])

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data


def main():
    document = ROOT / "index.html"
    if not document.is_file():
        raise SystemExit("FAIL: Missing index.html")
    parser = PageInspector()
    parser.feed(document.read_text(encoding="utf-8-sig"))
    checks = {
        "document language": parser.lang,
        "page title": bool(parser.title.strip()),
        "description": parser.description,
        "responsive viewport": parser.viewport,
        "character encoding": parser.charset,
    }
    failed = [name for name, passed in checks.items() if not passed]
    for link in parser.local_assets:
        parsed = urlsplit(link)
        if parsed.scheme or parsed.netloc or link.startswith(("//", "data:", "#")):
            continue
        path = unquote(parsed.path)
        if not path:
            continue
        # GitHub Pages may prefix absolute asset links with the repository name.
        if path.startswith("/" + ROOT.name + "/"):
            path = path[len(ROOT.name) + 2:]
        elif path.startswith("/"):
            path = path[1:]
        target = (ROOT / path).resolve()
        if not target.is_relative_to(ROOT) or not target.is_file():
            failed.append("missing local script/stylesheet: " + link)
    if failed:
        for item in failed:
            print("FAIL:", item, file=sys.stderr)
        raise SystemExit(1)
    print("PASS: HTML metadata, responsive entrypoint, and local scripts/styles")


if __name__ == "__main__":
    main()
