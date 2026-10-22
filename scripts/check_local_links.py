#!/usr/bin/env python3
"""Check local HTML and CSS references without network access.

Run from the repository root: python3 scripts/check_local_links.py
Checks HTML href/src paths, HTML fragments, image metadata, and CSS url() paths.
External URLs, srcset, and references assembled by JavaScript are intentionally
excluded.
"""

from html.parser import HTMLParser
import json
from pathlib import Path
import posixpath
import re
from urllib.parse import unquote, urlsplit
from xml.etree import ElementTree


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
        self.canonicals = []
        self.html_elements = []
        self.h1_elements = []
        self.id_references = []
        self.image_issues = []
        self.links = []
        self.link_security_issues = []
        self.main_elements = []
        self.meta_descriptions = []
        self.nav_elements = []
        self.og_urls = []
        self.structured_data = []
        self.structured_data_scripts = []
        self.titles = []
        self.viewports = []
        self._active_h1 = None
        self._active_structured_data = None
        self._active_title = None
        self.feed(content)
        self._validate_document()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        line = self.getpos()[0]
        if tag == 'html':
            self.html_elements.append((line, attrs.get('lang')))
        elif tag == 'h1':
            self._active_h1 = [line, []]
            self.h1_elements.append(self._active_h1)
        elif tag == 'main':
            self.main_elements.append(line)
        elif tag == 'nav':
            self.nav_elements.append((
                line,
                attrs.get('aria-label'),
                attrs.get('aria-labelledby'),
            ))
        elif tag == 'title':
            self._active_title = [line, []]
            self.titles.append(self._active_title)
        elif (tag == 'script'
              and (attrs.get('type') or '').lower()
              == 'application/ld+json'):
            self._active_structured_data = [line, []]
            self.structured_data_scripts.append(
                self._active_structured_data
            )
        elif tag == 'meta':
            name = (attrs.get('name') or '').lower()
            entry = (line, attrs.get('content'))
            if name == 'description':
                self.meta_descriptions.append(entry)
            elif name == 'viewport':
                self.viewports.append(entry)
            if (attrs.get('property') or '').lower() == 'og:url':
                self.og_urls.append(entry)
        elif tag == 'link':
            rel = (attrs.get('rel') or '').lower().split()
            if 'canonical' in rel:
                self.canonicals.append((line, attrs.get('href')))
        if attrs.get('id'):
            identifier = attrs['id']
            if identifier in self.id_lines:
                self.duplicate_ids.append((line, identifier, self.id_lines[identifier]))
            else:
                self.id_lines[identifier] = line
            self.targets.add(identifier)
        if tag == 'a' and attrs.get('name'):
            self.targets.add(attrs['name'])
        if tag == 'a' and (attrs.get('target') or '').lower() == '_blank':
            rel = {value.lower() for value in (attrs.get('rel') or '').split()}
            if not rel.intersection({'noopener', 'noreferrer'}):
                self.link_security_issues.append((
                    line,
                    'target="_blank" missing noopener or noreferrer',
                ))
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
        if self._active_h1 is not None:
            self._active_h1[1].append(data)
        if self._active_structured_data is not None:
            self._active_structured_data[1].append(data)
        if self._active_title is not None:
            self._active_title[1].append(data)

    def handle_endtag(self, tag):
        if tag == 'h1':
            self._active_h1 = None
        elif tag == 'script':
            self._active_structured_data = None
        elif tag == 'title':
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

        if not self.h1_elements:
            self.document_issues.append((1, 'missing h1 element'))
        for line, chunks in self.h1_elements:
            if not ''.join(chunks).strip():
                self.document_issues.append((line, 'empty h1 element'))

        if len(self.main_elements) != 1:
            self.document_issues.append(
                (1, f'expected one main element, found {len(self.main_elements)}')
            )

        for line, aria_label, aria_labelledby in self.nav_elements:
            if not ((aria_label or '').strip()
                    or (aria_labelledby or '').strip()):
                self.document_issues.append(
                    (line, 'nav element missing accessible name')
                )

        if len(self.structured_data_scripts) != 1:
            self.document_issues.append((
                1,
                'expected one JSON-LD script, '
                f'found {len(self.structured_data_scripts)}',
            ))
        for line, chunks in self.structured_data_scripts:
            try:
                data = json.loads(''.join(chunks))
            except json.JSONDecodeError as error:
                self.document_issues.append(
                    (line, f'invalid JSON-LD: {error.msg}')
                )
                continue
            if not isinstance(data, dict):
                self.document_issues.append(
                    (line, 'JSON-LD root must be an object')
                )
                continue
            self.structured_data.append((line, data))
            if data.get('@context') != 'https://schema.org':
                self.document_issues.append(
                    (line, 'JSON-LD missing schema.org context')
                )
            if not str(data.get('@type') or '').strip():
                self.document_issues.append(
                    (line, 'JSON-LD missing @type')
                )


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
        for line, issue in page.link_security_issues:
            errors.append(f'{source}:{line}: link {issue}')
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


def check_site_manifest(html_paths, sitemap_content, robots_content):
    errors = []
    if sitemap_content is None:
        return ['sitemap.xml: missing file']
    if robots_content is None:
        errors.append('robots.txt: missing file')

    try:
        root = ElementTree.fromstring(sitemap_content)
    except ElementTree.ParseError as error:
        errors.append(f'sitemap.xml: invalid XML: {error}')
        return errors

    locations = [(element.text or '').strip()
                 for element in root.findall('.//{*}loc')]
    if not locations:
        errors.append('sitemap.xml: no URL locations found')

    origin = None
    sitemap_paths = set()
    for location in locations:
        url = urlsplit(location)
        if (url.scheme != 'https' or not url.netloc or url.query
                or url.fragment):
            errors.append(f'sitemap.xml: invalid public URL: {location}')
            continue
        current_origin = f'{url.scheme}://{url.netloc}'
        if origin is None:
            origin = current_origin
        elif current_origin != origin:
            errors.append(
                f'sitemap.xml: mixed origin: {current_origin} '
                f'(expected {origin})'
            )
        public_path = url.path or '/'
        if public_path in sitemap_paths:
            errors.append(f'sitemap.xml: duplicate path: {public_path}')
        sitemap_paths.add(public_path)

    expected_paths = set()
    for path in html_paths:
        if path == 'index.html':
            expected_paths.add('/')
        elif path.endswith('/index.html'):
            expected_paths.add('/' + path[:-len('index.html')])
        else:
            expected_paths.add('/' + path)

    for path in sorted(expected_paths - sitemap_paths):
        errors.append(f'sitemap.xml: missing page: {path}')
    for path in sorted(sitemap_paths - expected_paths):
        errors.append(f'sitemap.xml: unknown page: {path}')

    if robots_content is not None:
        directives = re.findall(
            r'^\s*Sitemap:\s*(\S+)\s*$',
            robots_content,
            flags=re.IGNORECASE | re.MULTILINE,
        )
        if len(directives) != 1:
            errors.append(
                f'robots.txt: expected one Sitemap directive, '
                f'found {len(directives)}'
            )
        elif origin and directives[0] != f'{origin}/sitemap.xml':
            errors.append(
                f'robots.txt: Sitemap points to {directives[0]} '
                f'(expected {origin}/sitemap.xml)'
            )
    return errors


def check_public_page_urls(contents, sitemap_content):
    try:
        root = ElementTree.fromstring(sitemap_content)
    except (ElementTree.ParseError, TypeError):
        return []

    origin = None
    for element in root.findall('.//{*}loc'):
        url = urlsplit((element.text or '').strip())
        if url.scheme == 'https' and url.netloc:
            origin = f'{url.scheme}://{url.netloc}'
            break
    if origin is None:
        return []

    errors = []
    for source, content in sorted(contents.items()):
        page = Page(content)
        public_path = ('/' if source == 'index.html'
                       else '/' + source[:-len('index.html')]
                       if source.endswith('/index.html')
                       else '/' + source)
        expected = origin + public_path
        for label, entries in (
            ('canonical link', page.canonicals),
            ('og:url', page.og_urls),
            ('JSON-LD url', [
                (line, data.get('url'))
                for line, data in page.structured_data
            ]),
        ):
            if len(entries) != 1:
                errors.append(
                    f'{source}:1: expected one {label}, found {len(entries)}'
                )
            for line, value in entries:
                if value != expected:
                    errors.append(
                        f'{source}:{line}: {label} points to {value!r} '
                        f'(expected {expected})'
                    )
    return errors


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
    sitemap_path = root / 'sitemap.xml'
    robots_path = root / 'robots.txt'
    sitemap_content = (sitemap_path.read_text(encoding='utf-8')
                       if sitemap_path.is_file() else None)
    robots_content = (robots_path.read_text(encoding='utf-8')
                      if robots_path.is_file() else None)
    errors.extend(check_site_manifest(
        contents,
        sitemap_content,
        robots_content,
    ))
    errors.extend(check_public_page_urls(contents, sitemap_content))
    for error in errors:
        print(error)
    print(f'Checked {count} local references across {len(contents)} HTML pages and {len(styles)} stylesheets; {len(errors)} errors.')
    return int(bool(errors))


if __name__ == '__main__':
    raise SystemExit(main())
