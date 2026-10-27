import unittest

from scripts.check_local_links import (
    Page,
    check,
    check_public_page_urls,
    check_site_manifest,
)


def document(body='', title='Test page'):
    return (
        '<!doctype html><html lang="en"><head>'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        '<meta name="description" content="Test description">'
        f'<title>{title}</title>'
        '<script type="application/ld+json">'
        '{"@context":"https://schema.org","@type":"WebPage"}'
        '</script></head><body>'
        f'<main><h1>{title}</h1>{body}</main></body></html>'
    )


class PageTests(unittest.TestCase):
    def test_image_metadata_accepts_positive_dimensions(self):
        page = Page(
            '<img src="image.webp" alt="Example" width="640" height="480">'
        )

        self.assertEqual(page.image_issues, [])

    def test_image_metadata_reports_missing_and_invalid_values(self):
        page = Page(
            '<img src="first.webp">\n'
            '<img src="second.webp" alt="" width="0" height="auto">'
        )

        self.assertEqual(
            page.image_issues,
            [
                (1, 'missing alt attribute'),
                (1, 'missing width attribute'),
                (1, 'missing height attribute'),
                (2, "invalid width attribute: '0'"),
                (2, "invalid height attribute: 'auto'"),
            ],
        )


class CheckTests(unittest.TestCase):
    def test_valid_html_and_css_references(self):
        paths = {'index.html', 'about.html', 'asset.webp', 'styles/site.css'}
        contents = {
            'index.html': document(
                '<a href="about.html#bio">About</a>'
                '<img src="asset.webp" alt="Artwork" width="640" height="480">'
            ),
            'about.html': document(
                '<section id="bio">Biography</section>', title='About'
            ),
        }
        styles = {'styles/site.css': 'body { background: url("../asset.webp"); }'}

        checked, errors = check(paths, contents, styles)

        self.assertEqual(checked, 3)
        self.assertEqual(errors, [])

    def test_percent_encoded_and_text_fragments_are_supported(self):
        contents = {
            'index.html': document(
                '<section id="case-study">Case study</section>'
                '<a href="#case%2Dstudy">Encoded fragment</a>\\n'
                '<a href="#case-study:~:text=Case%20study">Text fragment</a>'
            )
        }

        checked, errors = check({'index.html'}, contents)

        self.assertEqual(checked, 2)
        self.assertEqual(errors, [])

    def test_missing_files_and_fragments_are_reported(self):
        paths = {'index.html', 'styles/site.css'}
        contents = {
            'index.html': document(
                '<a href="missing.html">Missing page</a>\n'
                '<a href="#missing-section">Missing section</a>'
            )
        }
        styles = {'styles/site.css': 'body { background: url("../missing.png"); }'}

        checked, errors = check(paths, contents, styles)

        self.assertEqual(checked, 3)
        self.assertTrue(any('missing file: missing.html' in error for error in errors))
        self.assertTrue(
            any('missing fragment: missing-section' in error for error in errors)
        )
        self.assertTrue(any('missing file: missing.png' in error for error in errors))

    def test_duplicate_ids_and_missing_id_references_are_reported(self):
        contents = {
            'index.html': document(
                '<div id="duplicate"></div>\n'
                '<div id="duplicate"></div>\n'
                '<button aria-controls="panel missing-panel"></button>\n'
                '<div id="panel"></div>\n'
                '<label for="missing-field">Field</label>'
            )
        }

        _, errors = check({'index.html'}, contents)

        self.assertTrue(any('duplicate id: duplicate' in error for error in errors))
        self.assertTrue(
            any('aria-controls references missing id: missing-panel' in error
                for error in errors)
        )
        self.assertTrue(
            any('for references missing id: missing-field' in error for error in errors)
        )

    def test_external_and_data_urls_are_ignored(self):
        contents = {
            'index.html': document(
                '<a href="https://example.com">External</a>'
                '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yw=" '
                'alt="Pixel" width="1" height="1">'
            )
        }

        checked, errors = check({'index.html'}, contents)

        self.assertEqual(checked, 0)
        self.assertEqual(errors, [])

    def test_new_tab_links_require_opener_protection(self):
        contents = {
            'index.html': document(
                '<a href="https://safe.example" target="_blank" '
                'rel="noreferrer">Safe</a>\n'
                '<a href="https://unsafe.example" target="_blank">Unsafe</a>'
            )
        }

        _, errors = check({'index.html'}, contents)

        self.assertEqual(
            [error for error in errors if ': link ' in error],
            [
                'index.html:2: link target="_blank" missing noopener '
                'or noreferrer'
            ],
        )

    def test_required_document_metadata_is_reported_when_missing(self):
        contents = {'index.html': '<html><head></head><body></body></html>'}

        _, errors = check({'index.html'}, contents)

        self.assertTrue(
            any('html element missing lang attribute' in error for error in errors)
        )
        self.assertTrue(
            any('expected one title element, found 0' in error for error in errors)
        )
        self.assertTrue(
            any('expected one meta description, found 0' in error for error in errors)
        )
        self.assertTrue(
            any('expected one meta viewport, found 0' in error for error in errors)
        )

    def test_empty_and_duplicate_document_metadata_is_reported(self):
        contents = {
            'index.html': (
                '<html lang="en"><head>'
                '<title> </title><title>Duplicate</title>'
                '<meta name="description" content="">'
                '<meta name="viewport" content="">'
                '</head><body></body></html>'
            )
        }

        _, errors = check({'index.html'}, contents)

        self.assertTrue(
            any('expected one title element, found 2' in error for error in errors)
        )
        self.assertTrue(any('empty title element' in error for error in errors))
        self.assertTrue(any('empty meta description content' in error for error in errors))
        self.assertTrue(any('empty meta viewport content' in error for error in errors))

    def test_missing_landmarks_and_navigation_name_are_reported(self):
        contents = {
            'index.html': (
                '<html lang="en"><head>'
                '<meta name="viewport" content="width=device-width">'
                '<meta name="description" content="Test description">'
                '<title>Test page</title></head><body>'
                '<nav></nav><main><h1> </h1></main><main></main>'
                '</body></html>'
            )
        }

        _, errors = check({'index.html'}, contents)

        self.assertTrue(any('empty h1 element' in error for error in errors))
        self.assertTrue(
            any('expected one main element, found 2' in error for error in errors)
        )
        self.assertTrue(
            any('nav element missing accessible name' in error for error in errors)
        )

    def test_invalid_structured_data_is_reported(self):
        contents = {
            'index.html': document().replace(
                '{"@context":"https://schema.org","@type":"WebPage"}',
                '{"@context":"https://example.com", "name": }',
            )
        }

        _, errors = check({'index.html'}, contents)

        self.assertTrue(any('invalid JSON-LD' in error for error in errors))

    def test_structured_data_requires_context_and_type(self):
        contents = {
            'index.html': document().replace(
                '{"@context":"https://schema.org","@type":"WebPage"}',
                '{"name":"Test page"}',
            )
        }

        _, errors = check({'index.html'}, contents)

        self.assertTrue(
            any('JSON-LD missing schema.org context' in error for error in errors)
        )
        self.assertTrue(any('JSON-LD missing @type' in error for error in errors))


class SiteManifestTests(unittest.TestCase):
    def test_complete_sitemap_and_robots_are_valid(self):
        sitemap = (
            '<?xml version="1.0"?>'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            '<url><loc>https://example.com/</loc></url>'
            '<url><loc>https://example.com/about.html</loc></url>'
            '</urlset>'
        )
        robots = 'User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml\n'

        errors = check_site_manifest(
            {'index.html', 'about.html'}, sitemap, robots
        )

        self.assertEqual(errors, [])

    def test_sitemap_and_robots_mismatches_are_reported(self):
        sitemap = (
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            '<url><loc>https://example.com/</loc></url>'
            '<url><loc>https://example.com/</loc></url>'
            '<url><loc>https://other.example/legacy.html</loc></url>'
            '</urlset>'
        )
        robots = 'Sitemap: https://example.com/wrong.xml\n'

        errors = check_site_manifest(
            {'index.html', 'about.html'}, sitemap, robots
        )

        self.assertTrue(any('duplicate path: /' in error for error in errors))
        self.assertTrue(any('mixed origin: https://other.example' in error
                            for error in errors))
        self.assertTrue(any('missing page: /about.html' in error for error in errors))
        self.assertTrue(any('unknown page: /legacy.html' in error for error in errors))
        self.assertTrue(any('Sitemap points to' in error for error in errors))

    def test_sitemap_requires_protocol_root_and_namespace(self):
        sitemap_cases = {
            'missing namespace': (
                '<urlset><url><loc>https://example.com/</loc></url></urlset>'
            ),
            'wrong namespace': (
                '<urlset xmlns="https://example.com/sitemap">'
                '<url><loc>https://example.com/</loc></url></urlset>'
            ),
            'wrong root': (
                '<sitemap xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
                '<url><loc>https://example.com/</loc></url></sitemap>'
            ),
        }
        robots = 'Sitemap: https://example.com/sitemap.xml\n'
        expected_error = (
            'sitemap.xml: expected urlset root in the Sitemap protocol namespace'
        )

        for label, sitemap in sitemap_cases.items():
            with self.subTest(case=label):
                errors = check_site_manifest({'index.html'}, sitemap, robots)
                self.assertIn(expected_error, errors)

    def test_sitemap_locations_require_https_without_query_or_fragment(self):
        invalid_locations = [
            'http://example.com/about.html',
            'https://example.com/search.html?source=nav',
            'https://example.com/about.html#details',
        ]
        entries = '<url><loc>https://example.com/</loc></url>' + ''.join(
            f'<url><loc>{location}</loc></url>'
            for location in invalid_locations
        )
        sitemap = (
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            f'{entries}</urlset>'
        )
        robots = 'Sitemap: https://example.com/sitemap.xml\n'

        errors = check_site_manifest({'index.html'}, sitemap, robots)

        for location in invalid_locations:
            with self.subTest(location=location):
                self.assertIn(
                    f'sitemap.xml: invalid public URL: {location}',
                    errors,
                )

    def test_malformed_sitemap_is_reported(self):
        errors = check_site_manifest(
            {'index.html'}, '<urlset><url></urlset>', 'User-agent: *\n'
        )

        self.assertTrue(any('invalid XML' in error for error in errors))


class PublicPageUrlTests(unittest.TestCase):
    sitemap = (
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        '<url><loc>https://example.com/</loc></url>'
        '<url><loc>https://example.com/about.html</loc></url>'
        '</urlset>'
    )

    def public_document(self, url, extra=''):
        return (
            '<html lang="en"><head>'
            '<meta name="viewport" content="width=device-width">'
            '<meta name="description" content="Test description">'
            '<title>Test page</title>'
            f'<link rel="canonical" href="{url}">'
            f'<meta property="og:url" content="{url}">'
            '<script type="application/ld+json">'
            f'{{"@context":"https://schema.org","@type":"WebPage",'
            f'"url":"{url}"}}'
            '</script>'
            f'{extra}</head><body></body></html>'
        )

    def test_canonical_and_open_graph_urls_match_public_pages(self):
        contents = {
            'index.html': self.public_document('https://example.com/'),
            'about.html': self.public_document(
                'https://example.com/about.html'
            ),
        }

        errors = check_public_page_urls(contents, self.sitemap)

        self.assertEqual(errors, [])

    def test_missing_duplicate_and_mismatched_urls_are_reported(self):
        contents = {
            'index.html': (
                '<html lang="en"><head><title>Home</title></head></html>'
            ),
            'about.html': self.public_document(
                'https://example.com/wrong.html',
                '<link rel="canonical" href="https://example.com/about.html">',
            ),
        }

        errors = check_public_page_urls(contents, self.sitemap)

        self.assertTrue(
            any('index.html:1: expected one canonical link, found 0' in error
                for error in errors)
        )
        self.assertTrue(
            any('index.html:1: expected one og:url, found 0' in error
                for error in errors)
        )
        self.assertTrue(
            any('about.html:1: expected one canonical link, found 2' in error
                for error in errors)
        )
        self.assertTrue(
            any("og:url points to 'https://example.com/wrong.html'" in error
                for error in errors)
        )
        self.assertTrue(
            any("JSON-LD url points to 'https://example.com/wrong.html'" in error
                for error in errors)
        )


if __name__ == '__main__':
    unittest.main()
