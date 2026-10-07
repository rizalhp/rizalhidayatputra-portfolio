#!/usr/bin/env python3
"""Check HTML href/src file paths and HTML fragment targets without network access.

Run from the repository root: python3 scripts/check_local_links.py
Checks static HTML only; excludes external URLs, CSS, srcset, and JS-built URLs.
"""

from html.parser import HTMLParser
from pathlib import Path
import posixpath
from urllib.parse import unquote, urlsplit


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


def check(paths, contents):
    pages = {name: Page(content) for name, content in contents.items()}
    errors = []
    checked = 0
    for source, page in sorted(pages.items()):
        for line, link in page.links:
            url = urlsplit(link)
            if url.scheme or url.netloc:
                continue
            checked += 1
            raw = unquote(url.path)
            target = (posixpath.normpath(raw.lstrip('/')) if raw.startswith('/')
                      else posixpath.normpath(posixpath.join(posixpath.dirname(source), raw))) if raw else source
            if raw.endswith('/'):
                target = posixpath.normpath(posixpath.join(target, 'index.html'))
            prefix = f'{source}:{line}: {link}'
            if target not in paths:
                errors.append(f'{prefix} -> missing file: {target}')
            elif url.fragment and target in pages:
                fragment = unquote(url.fragment)
                # Text fragments are interpreted by browsers rather than HTML IDs.
                fragment = fragment.split(':~:text=', 1)[0]
                if fragment and fragment not in pages[target].targets:
                    errors.append(f'{prefix} -> missing fragment: {fragment}')
    return checked, errors


def main():
    root = Path(__file__).resolve().parent.parent
    files = [p for p in root.rglob('*') if p.is_file()
             and not any(part in {'.git', 'node_modules', '.venv'}
                         for part in p.relative_to(root).parts)]
    paths = {p.relative_to(root).as_posix() for p in files}
    contents = {p.relative_to(root).as_posix(): p.read_text(encoding='utf-8')
                for p in files if p.suffix == '.html'}
    if not contents:
        print('No HTML pages found; check the repository location.')
        return 1
    count, errors = check(paths, contents)
    for error in errors:
        print(error)
    print(f'Checked {count} local references across {len(contents)} HTML pages; {len(errors)} errors.')
    return int(bool(errors))


if __name__ == '__main__':
    raise SystemExit(main())
