#!/usr/bin/env python3
"""Check local HTML and CSS references without network access.

Run from the repository root: python3 scripts/check_local_links.py
Checks HTML href/src paths, HTML fragments, image metadata, and CSS url() paths.
External URLs, srcset, and references assembled by JavaScript are intentionally
excluded.
"""

from html.parser import HTMLParser
from pathlib import Path
import posixpath
import re
from urllib.parse import unquote, urlsplit


CSS_URL = re.compile(r"url\(\s*(['\"]?)(.*?)\1\s*\)", re.IGNORECASE)
POSITIVE_INTEGER = re.compile(r'[1-9]\d*')
ID_REFERENCE_ATTRIBUTES = (
    'aria-activedescendant',
    'aria-controls',
    'aria-describedby',
    'aria-labelledby',
    'aria-owns',
    'for',
    'form',
    'list',
)


class Page(HTMLParser):
    def __init__(self, content):
        super().__init__(convert_charrefs=True)
        self.targets = set()
        self.id_lines = {}
        self.duplicate_ids = []
        self.document_issues = []
        self.html_elements = []
        self.id_references = []
        self.image_issues = []
        self.links = []
        self.meta_descriptions = []
        self.titles = []
        self.viewports = []
        self._active_title = None
        self.feed(content)
        self._validate_document()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        line = self.getpos()[0]
        if tag == 'html':
            self.html_elements.append((line, attrs.get('lang')))
        elif tag == 'title':
            self._active_title = [line, []]
            self.titles.append(self._active_title)
        elif tag == 'meta':
            name = (attrs.get('name') or '').lower()
            entry = (line, attrs.get('content'))
            if name == 'description':
                self.meta_descriptions.append(entry)
            elif name == 'viewport':
                self.viewports.append(entry)
        if attrs.get('id'):
            identifier = attrs['id']
            if identifier in self.id_lines:
                self.duplicate_ids.append((line, identifier, self.id_lines[identifier]))
            else:
                self.id_lines[identifier] = line
            self.targets.add(identifier)
        if tag == 'a' and attrs.get('name'):
            self.targets.add(attrs['name'])
        if tag == 'img':
            line = self.getpos()[0]
            if 'alt' not in attrs:
                self.image_issues.append((line, 'missing alt attribute'))
            for dimension in ('width', 'height'):
                value = attrs.get(dimension)
                if value is None:
                    self.image_issues.append(
                        (line, f'missing {dimension} attribute')
                    )
                elif not POSITIVE_INTEGER.fullmatch(value.strip()):
                    self.image_issues.append(
                        (line, f'invalid {dimension} attribute: {value!r}')
                    )
        for attr in ID_REFERENCE_ATTRIBUTES:
            if attrs.get(attr):
                for identifier in attrs[attr].split():
                    self.id_references.append(
                        (self.getpos()[0], attr, identifier)
                    )
        for attr in ('href', 'src'):
            if attrs.get(attr):
                self.links.append((self.getpos()[0], attrs[attr]))

    def handle_data(self, data):
        if self._active_title is not None:
            self._active_title[1].append(data)

    def handle_endtag(self, tag):
        if tag == 'title':
            self._active_title = None

    def _validate_document(self):
        if len(self.html_elements) != 1:
            self.document_issues.append(
                (1, f'expected one html element, found {len(self.html_elements)}')
            )
        elif not (self.html_elements[0][1] or '').strip():
            self.document_issues.append(
                (self.html_elements[0][0], 'html element missing lang attribute')
            )

        if len(self.titles) != 1:
            self.document_issues.append(
                (1, f'expected one title element, found {len(self.titles)}')
            )
        for line, chunks in self.titles:
            if not ''.join(chunks).strip():
                self.document_issues.append((line, 'empty title element'))

        for label, entries in (
            ('meta description', self.meta_descriptions),
            ('meta viewport', self.viewports),
        ):
            if len(entries) != 1:
                self.document_issues.append(
                    (1, f'expected one {label}, found {len(entries)}')
                )
            for line, content in entries:
                if not (content or '').strip():
                    self.document_issues.append((line, f'empty {label} content'))


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
        for line, issue in page.document_issues:
            errors.append(f'{source}:{line}: document {issue}')
        for line, issue in page.image_issues:
            errors.append(f'{source}:{line}: image {issue}')
        for line, identifier, first_line in page.duplicate_ids:
            errors.append(
                f'{source}:{line}: duplicate id: {identifier} '
                f'(first declared on line {first_line})'
            )
        for line, attribute, identifier in page.id_references:
            if identifier not in page.targets:
                errors.append(
                    f'{source}:{line}: {attribute} references missing id: '
                    f'{identifier}'
                )
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
