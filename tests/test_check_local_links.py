import unittest

from scripts.check_local_links import Page, check


def document(body='', title='Test page'):
    return (
        '<!doctype html><html lang="en"><head>'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        '<meta name="description" content="Test description">'
        f'<title>{title}</title></head><body>{body}</body></html>'
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


if __name__ == '__main__':
    unittest.main()
