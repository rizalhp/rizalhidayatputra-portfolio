#!/usr/bin/env python3
"""Check local HTML and CSS references without network access.

Run from the repository root: python3 scripts/check_local_links.py
Checks HTML href/src paths, HTML fragments, and CSS url() paths. External URLs,
srcset, and references assembled by JavaScript are intentionally excluded.
"""

from html.parser import HTMLParser
from pathlib import Path
import posixpath
import re
from urllib.parse import unquote, urlsplit


CSS_URL = re.compile(r"url\(\s*(['\"]?)(.*?)\1\s*\)", re.IGNORECASE)


class Page(HTMLParser):
    def __init__(self, content):
        super().__init__(convert_charrefs=True)
        self.targets = set()
        self.links = []
        self.feed(content)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.targets.add(attrs['id'])
        if tag == 'a' and attrs.get('name'):
            self.targets.add(attrs['name'])
        for attr in ('href', 'src'):
            if attrs.get(attr):
                self.links.append((self.getpos()[0], attrs[attr]))


def check(paths, contents, styles=None):
    pages = {name: Page(content) for name, content in contents.items()}
    errors = []
    checked = 0

    def check_link(source, line, link, fragment_targets=None):
        nonlocal checked
        url = urlsplit(link)
        if url.scheme or url.netloc or link.startswith('data:'):
            return
        checked += 1
        raw = unquote(url.path)
        target = (posixpath.normpath(raw.lstrip('/')) if raw.startswith('/')
                  else posixpath.normpath(posixpath.join(posixpath.dirname(source), raw))) if raw else source
        if raw.endswith('/'):
            target = posixpath.normpath(posixpath.join(target, 'index.html'))
        prefix = f'{source}:{line}: {link}'
        if target not in paths:
            errors.append(f'{prefix} -> missing file: {target}')
        elif url.fragment and fragment_targets is not None:
            fragment = unquote(url.fragment)
            # Text fragments are interpreted by browsers rather than HTML IDs.
            fragment = fragment.split(':~:text=', 1)[0]
            if fragment and fragment not in fragment_targets:
                errors.append(f'{prefix} -> missing fragment: {fragment}')

    for source, page in sorted(pages.items()):
        for line, link in page.links:
            target_path = unquote(urlsplit(link).path)
            target = (posixpath.normpath(target_path.lstrip('/')) if target_path.startswith('/')
                      else posixpath.normpath(posixpath.join(posixpath.dirname(source), target_path))) if target_path else source
            targets = pages[target].targets if target in pages else None
            check_link(source, line, link, targets)

    for source, content in sorted((styles or {}).items()):
        for match in CSS_URL.finditer(content):
            line = content.count('\n', 0, match.start()) + 1
            check_link(source, line, match.group(2))
    return checked, errors


def main():
    root = Path(__file__).resolve().parent.parent
    files = [p for p in root.rglob('*') if p.is_file()
             and not any(part in {'.git', 'node_modules', '.venv'}
                         for part in p.relative_to(root).parts)]
    paths = {p.relative_to(root).as_posix() for p in files}
    contents = {p.relative_to(root).as_posix(): p.read_text(encoding='utf-8')
                for p in files if p.suffix == '.html'}
    styles = {p.relative_to(root).as_posix(): p.read_text(encoding='utf-8')
              for p in files if p.suffix == '.css'}
    if not contents:
        print('No HTML pages found; check the repository location.')
        return 1
    count, errors = check(paths, contents, styles)
    for error in errors:
        print(error)
    print(f'Checked {count} local references across {len(contents)} HTML pages and {len(styles)} stylesheets; {len(errors)} errors.')
    return int(bool(errors))


if __name__ == '__main__':
    raise SystemExit(main())
