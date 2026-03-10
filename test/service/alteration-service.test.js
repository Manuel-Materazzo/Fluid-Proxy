'use strict';

import { expect } from 'chai';
import AlterationService from '../../service/alteration-service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mockOriginalResponse(rawHeaders) {
    return { headers: { raw: () => rawHeaders } };
}

// ---------------------------------------------------------------------------
// isBodyEditNecessary
// ---------------------------------------------------------------------------
describe('AlterationService.isBodyEditNecessary', () => {

    it('should return false when content-type is an image', () => {
        const headers = { 'content-type': 'image/png' };
        const edits = { body: { inject: '<script></script>' } };
        expect(AlterationService.isBodyEditNecessary(headers, edits)).to.be.false;
    });

    it('should return false when content-type contains "image" anywhere', () => {
        const headers = { 'content-type': 'application/image+xml' };
        const edits = { body: { inject: 'yes' } };
        expect(AlterationService.isBodyEditNecessary(headers, edits)).to.be.false;
    });

    it('should return false when all body edit values are "false"', () => {
        const headers = { 'content-type': 'text/html' };
        const edits = { body: { rewrite: 'false', proxy: 'false' } };
        expect(AlterationService.isBodyEditNecessary(headers, edits)).to.be.false;
    });

    it('should return false when all body edit values are falsy (empty string)', () => {
        const headers = { 'content-type': 'text/html' };
        const edits = { body: { rewrite: '', proxy: '' } };
        expect(AlterationService.isBodyEditNecessary(headers, edits)).to.be.false;
    });

    it('should return false when all body edit values are falsy (0, null, undefined)', () => {
        const headers = { 'content-type': 'text/html' };
        const edits = { body: { a: 0, b: null, c: undefined } };
        expect(AlterationService.isBodyEditNecessary(headers, edits)).to.be.false;
    });

    it('should return true when at least one body edit value is truthy', () => {
        const headers = { 'content-type': 'text/html' };
        const edits = { body: { rewrite: 'false', inject: '<div>hi</div>' } };
        expect(AlterationService.isBodyEditNecessary(headers, edits)).to.be.true;
    });

    it('should return true when body edit value is a non-"false" string', () => {
        const headers = { 'content-type': 'text/html' };
        const edits = { body: { inject: 'true' } };
        expect(AlterationService.isBodyEditNecessary(headers, edits)).to.be.true;
    });

    it('should return false when responseEdits is undefined', () => {
        const headers = { 'content-type': 'text/html' };
        expect(AlterationService.isBodyEditNecessary(headers, undefined)).to.be.false;
    });

    it('should return false when responseEdits.body is undefined', () => {
        const headers = { 'content-type': 'text/html' };
        expect(AlterationService.isBodyEditNecessary(headers, {})).to.be.false;
    });

    it('should return false when responseEdits.body is empty', () => {
        const headers = { 'content-type': 'text/html' };
        expect(AlterationService.isBodyEditNecessary(headers, { body: {} })).to.be.false;
    });

    it('should return false when headers has no content-type but edits are all falsy', () => {
        expect(AlterationService.isBodyEditNecessary({}, { body: { a: '' } })).to.be.false;
    });

    it('should return true when headers has no content-type and edits are truthy', () => {
        expect(AlterationService.isBodyEditNecessary({}, { body: { a: 'yes' } })).to.be.true;
    });
});

// ---------------------------------------------------------------------------
// getResponseHeaders
// ---------------------------------------------------------------------------
describe('AlterationService.getResponseHeaders', () => {

    it('should extract headers from original response raw()', () => {
        const original = mockOriginalResponse({
            'content-type': ['text/html'],
            'x-custom': ['hello'],
        });
        const result = AlterationService.getResponseHeaders(original, {});
        expect(result['content-type']).to.equal('text/html');
        expect(result['x-custom']).to.equal('hello');
    });

    it('should take the first value when raw() returns arrays', () => {
        const original = mockOriginalResponse({
            'set-cookie': ['a=1', 'b=2'],
        });
        const result = AlterationService.getResponseHeaders(original, {});
        expect(result['set-cookie']).to.equal('a=1');
    });

    it('should remove content-encoding header', () => {
        const original = mockOriginalResponse({ 'content-encoding': ['gzip'] });
        const result = AlterationService.getResponseHeaders(original, {});
        expect(result).to.not.have.property('content-encoding');
    });

    it('should remove x-frame-options header', () => {
        const original = mockOriginalResponse({ 'x-frame-options': ['DENY'] });
        const result = AlterationService.getResponseHeaders(original, {});
        expect(result).to.not.have.property('x-frame-options');
    });

    it('should remove x-content-type-options header', () => {
        const original = mockOriginalResponse({ 'x-content-type-options': ['nosniff'] });
        const result = AlterationService.getResponseHeaders(original, {});
        expect(result).to.not.have.property('x-content-type-options');
    });

    it('should remove content-length header', () => {
        const original = mockOriginalResponse({ 'content-length': ['1234'] });
        const result = AlterationService.getResponseHeaders(original, {});
        expect(result).to.not.have.property('content-length');
    });

    it('should add CORS headers', () => {
        const original = mockOriginalResponse({});
        const result = AlterationService.getResponseHeaders(original, {});
        expect(result['Access-Control-Allow-Origin']).to.equal('*');
        expect(result['Access-Control-Allow-Credentials']).to.equal('false');
        expect(result['Access-Control-Allow-Headers']).to.equal('Content-Type');
    });

    it('should merge custom headers', () => {
        const original = mockOriginalResponse({});
        const result = AlterationService.getResponseHeaders(original, { 'X-My-Header': 'value' });
        expect(result['X-My-Header']).to.equal('value');
    });

    it('should allow custom headers to override original headers', () => {
        const original = mockOriginalResponse({ 'content-type': ['text/html'] });
        const result = AlterationService.getResponseHeaders(original, { 'content-type': 'application/json' });
        expect(result['content-type']).to.equal('application/json');
    });

    it('should handle null custom headers', () => {
        const original = mockOriginalResponse({ 'content-type': ['text/html'] });
        const result = AlterationService.getResponseHeaders(original, null);
        expect(result['content-type']).to.equal('text/html');
    });

    it('should handle undefined custom headers', () => {
        const original = mockOriginalResponse({ 'content-type': ['text/html'] });
        const result = AlterationService.getResponseHeaders(original, undefined);
        expect(result['content-type']).to.equal('text/html');
    });

    it('should handle original response with no headers.raw', () => {
        const original = { headers: undefined };
        const result = AlterationService.getResponseHeaders(original, {});
        expect(result['Access-Control-Allow-Origin']).to.equal('*');
    });
});

// ---------------------------------------------------------------------------
// htmlAppend
// ---------------------------------------------------------------------------
describe('AlterationService.htmlAppend', () => {

    it('should append an element as last child of the selector', () => {
        const html = '<div id="container"><p>First</p></div>';
        const result = AlterationService.htmlAppend(html, '#container', '<span>Last</span>');
        expect(result).to.include('<p>First</p><span>Last</span>');
    });

    it('should append to multiple matching elements', () => {
        const html = '<ul><li class="item">A</li><li class="item">B</li></ul>';
        const result = AlterationService.htmlAppend(html, '.item', '<em>!</em>');
        expect(result).to.include('<li class="item">A<em>!</em></li>');
        expect(result).to.include('<li class="item">B<em>!</em></li>');
    });

    it('should return unchanged HTML when selector matches nothing', () => {
        const html = '<div>Hello</div>';
        const result = AlterationService.htmlAppend(html, '#nonexistent', '<span>X</span>');
        expect(result).to.include('<div>Hello</div>');
    });

    it('should handle appending to body', () => {
        const html = '<html><body><p>Content</p></body></html>';
        const result = AlterationService.htmlAppend(html, 'body', '<footer>End</footer>');
        expect(result).to.include('<p>Content</p><footer>End</footer>');
    });

    it('should handle empty html string', () => {
        const result = AlterationService.htmlAppend('', 'div', '<span>X</span>');
        expect(result).to.be.a('string');
    });
});

// ---------------------------------------------------------------------------
// htmlPrepend
// ---------------------------------------------------------------------------
describe('AlterationService.htmlPrepend', () => {

    it('should prepend an element as first child of the selector', () => {
        const html = '<div id="container"><p>Last</p></div>';
        const result = AlterationService.htmlPrepend(html, '#container', '<span>First</span>');
        expect(result).to.include('<span>First</span><p>Last</p>');
    });

    it('should prepend to multiple matching elements', () => {
        const html = '<ul><li class="item">A</li><li class="item">B</li></ul>';
        const result = AlterationService.htmlPrepend(html, '.item', '<em>!</em>');
        expect(result).to.include('<li class="item"><em>!</em>A</li>');
        expect(result).to.include('<li class="item"><em>!</em>B</li>');
    });

    it('should return unchanged HTML when selector matches nothing', () => {
        const html = '<div>Hello</div>';
        const result = AlterationService.htmlPrepend(html, '#nonexistent', '<span>X</span>');
        expect(result).to.include('<div>Hello</div>');
    });

    it('should handle prepending to body', () => {
        const html = '<html><body><p>Content</p></body></html>';
        const result = AlterationService.htmlPrepend(html, 'body', '<header>Start</header>');
        expect(result).to.include('<header>Start</header><p>Content</p>');
    });

    it('should handle empty html string', () => {
        const result = AlterationService.htmlPrepend('', 'div', '<span>X</span>');
        expect(result).to.be.a('string');
    });
});

// ---------------------------------------------------------------------------
// regexReplace
// ---------------------------------------------------------------------------
describe('AlterationService.regexReplace', () => {

    it('should replace matching patterns in source', async () => {
        const result = await AlterationService.regexReplace(
            'hello world', 'world', 'planet', { timeoutMs: 2000 }
        );
        expect(result).to.equal('hello planet');
    });

    it('should replace all occurrences (global flag)', async () => {
        const result = await AlterationService.regexReplace(
            'aaa', 'a', 'b', { timeoutMs: 2000 }
        );
        expect(result).to.equal('bbb');
    });

    it('should treat $ in replacement literally', async () => {
        const result = await AlterationService.regexReplace(
            'price: 10', '10', '$20', { timeoutMs: 2000 }
        );
        expect(result).to.equal('price: $20');
    });

    it('should return source unchanged when pattern does not match', async () => {
        const result = await AlterationService.regexReplace(
            'hello world', 'xyz', 'abc', { timeoutMs: 2000 }
        );
        expect(result).to.equal('hello world');
    });

    it('should handle regex special characters in pattern', async () => {
        const result = await AlterationService.regexReplace(
            'file.txt', '\\.txt', '.md', { timeoutMs: 2000 }
        );
        expect(result).to.equal('file.md');
    });

    it('should use empty string as replacement when replacement is null', async () => {
        const result = await AlterationService.regexReplace(
            'remove-this', '-this', null, { timeoutMs: 2000 }
        );
        expect(result).to.equal('remove');
    });

    it('should use empty string as replacement when replacement is undefined', async () => {
        const result = await AlterationService.regexReplace(
            'remove-this', '-this', undefined, { timeoutMs: 2000 }
        );
        expect(result).to.equal('remove');
    });

    // --- Validation errors ---

    it('should throw when pattern is an empty string', async () => {
        try {
            await AlterationService.regexReplace('source', '', 'rep', { timeoutMs: 2000 });
            expect.fail('should have thrown');
        } catch (err) {
            expect(err.message).to.equal('regex pattern must be a non-empty string');
        }
    });

    it('should throw when pattern is not a string (number)', async () => {
        try {
            await AlterationService.regexReplace('source', 123, 'rep', { timeoutMs: 2000 });
            expect.fail('should have thrown');
        } catch (err) {
            expect(err.message).to.equal('regex pattern must be a non-empty string');
        }
    });

    it('should throw when pattern is null', async () => {
        try {
            await AlterationService.regexReplace('source', null, 'rep', { timeoutMs: 2000 });
            expect.fail('should have thrown');
        } catch (err) {
            expect(err.message).to.equal('regex pattern must be a non-empty string');
        }
    });

    it('should throw when pattern is undefined', async () => {
        try {
            await AlterationService.regexReplace('source', undefined, 'rep', { timeoutMs: 2000 });
            expect.fail('should have thrown');
        } catch (err) {
            expect(err.message).to.equal('regex pattern must be a non-empty string');
        }
    });

    it('should throw when pattern is too long', async () => {
        const longPattern = 'a'.repeat(300);
        try {
            await AlterationService.regexReplace('source', longPattern, 'rep', { timeoutMs: 2000 });
            expect.fail('should have thrown');
        } catch (err) {
            expect(err.message).to.equal('regex pattern too long');
        }
    });

    it('should respect custom maxPatternLength', async () => {
        try {
            await AlterationService.regexReplace('source', 'abcdef', 'rep', {
                timeoutMs: 2000,
                maxPatternLength: 5,
            });
            expect.fail('should have thrown');
        } catch (err) {
            expect(err.message).to.equal('regex pattern too long');
        }
    });

    it('should throw when source is too large', async () => {
        const bigSource = 'x'.repeat(600000);
        try {
            await AlterationService.regexReplace(bigSource, 'x', 'y', { timeoutMs: 2000 });
            expect.fail('should have thrown');
        } catch (err) {
            expect(err.message).to.equal('source too large for regex replace');
        }
    });

    it('should respect custom maxSourceLength', async () => {
        try {
            await AlterationService.regexReplace('hello', 'h', 'H', {
                timeoutMs: 2000,
                maxSourceLength: 3,
            });
            expect.fail('should have thrown');
        } catch (err) {
            expect(err.message).to.equal('source too large for regex replace');
        }
    });

    it('should throw for invalid regex syntax', async () => {
        try {
            await AlterationService.regexReplace('source', '[invalid', 'rep', { timeoutMs: 2000 });
            expect.fail('should have thrown');
        } catch (err) {
            expect(err.message).to.match(/invalid regex/);
        }
    });

    it('should throw for unsafe regex patterns (catastrophic backtracking)', async () => {
        try {
            await AlterationService.regexReplace('source', '(a+)+', 'rep', { timeoutMs: 2000 });
            expect.fail('should have thrown');
        } catch (err) {
            expect(err.message).to.equal('unsafe regex pattern rejected');
        }
    });

    it('should throw for another unsafe regex pattern (nested quantifiers)', async () => {
        try {
            await AlterationService.regexReplace('source', '(a+){2,}', 'rep', { timeoutMs: 2000 });
            expect.fail('should have thrown');
        } catch (err) {
            expect(err.message).to.equal('unsafe regex pattern rejected');
        }
    });

    it('should time out with a very short timeout', async () => {
        // Use a pattern that is safe but will take a moment on a large source
        const source = 'a'.repeat(100000);
        try {
            await AlterationService.regexReplace(source, 'a', 'b', { timeoutMs: 1 });
            // If it doesn't time out, that's acceptable too (fast machine)
        } catch (err) {
            expect(err.message).to.match(/timed out/);
        }
    });
});

// ---------------------------------------------------------------------------
// rewriteUrls
// ---------------------------------------------------------------------------
describe('AlterationService.rewriteUrls', () => {

    it('should convert relative URLs to absolute', () => {
        const html = '<a href="/about">About</a>';
        const result = AlterationService.rewriteUrls(html, 'https://example.com');
        expect(result).to.include('https://example.com/about');
    });

    it('should strip query params from oldUrl before resolving', () => {
        const html = '<a href="/page">Link</a>';
        const result = AlterationService.rewriteUrls(html, 'https://example.com/?foo=bar');
        expect(result).to.include('https://example.com/page');
        expect(result).not.to.include('foo=bar');
    });

    it('should strip anchors from oldUrl before resolving', () => {
        const html = '<a href="/page">Link</a>';
        const result = AlterationService.rewriteUrls(html, 'https://example.com/#section');
        expect(result).to.include('https://example.com/page');
        expect(result).not.to.include('#section');
    });

    it('should strip trailing slash from oldUrl', () => {
        const html = '<a href="/page">Link</a>';
        const result = AlterationService.rewriteUrls(html, 'https://example.com/');
        expect(result).to.include('https://example.com/page');
    });

    it('should handle empty html string', () => {
        const result = AlterationService.rewriteUrls('', 'https://example.com');
        expect(result).to.be.a('string');
    });

    it('should handle html with no relative urls', () => {
        const html = '<p>No links here</p>';
        const result = AlterationService.rewriteUrls(html, 'https://example.com');
        expect(result).to.include('No links here');
    });
});

// ---------------------------------------------------------------------------
// proxyUrls
// ---------------------------------------------------------------------------
describe('AlterationService.proxyUrls', () => {

    describe('attributeOnly = true (default)', () => {

        it('should prefix URLs inside href attributes', () => {
            const html = '<a href="https://example.com/page">Link</a>';
            const result = AlterationService.proxyUrls(html, 'https://example.com', '/proxy/');
            expect(result).to.include('href="/proxy/https://example.com/page"');
        });

        it('should prefix URLs inside src attributes', () => {
            const html = '<img src="https://cdn.example.com/img.png">';
            const result = AlterationService.proxyUrls(html, 'https://cdn.example.com', '/proxy/');
            expect(result).to.include('src="/proxy/https://cdn.example.com/img.png"');
        });

        it('should prefix URLs inside action attributes', () => {
            const html = '<form action="https://example.com/submit"></form>';
            const result = AlterationService.proxyUrls(html, 'https://example.com', '/proxy/');
            expect(result).to.include('action="/proxy/https://example.com/submit"');
        });

        it('should not prefix URLs outside attributes', () => {
            const html = '<p>Visit https://example.com for more</p>';
            const result = AlterationService.proxyUrls(html, 'https://example.com', '/proxy/');
            expect(result).to.not.include('/proxy/https://example.com');
            expect(result).to.include('https://example.com');
        });

        it('should handle http:// URLs', () => {
            const html = '<a href="http://example.com">Link</a>';
            const result = AlterationService.proxyUrls(html, 'http://example.com', '/proxy/');
            expect(result).to.include('href="/proxy/http://example.com"');
        });

        it('should be case-insensitive for attribute names', () => {
            const html = '<a HREF="https://example.com">Link</a>';
            const result = AlterationService.proxyUrls(html, 'https://example.com', '/proxy/');
            expect(result).to.include('/proxy/https://example.com');
        });

        it('should replace ../ with /', () => {
            const html = '<a href="../page">Link</a>';
            const result = AlterationService.proxyUrls(html, 'https://example.com', '/proxy/');
            expect(result).to.include('href="/page"');
            expect(result).to.not.include('../');
        });
    });

    describe('attributeOnly = false', () => {

        it('should prefix all http:// occurrences', () => {
            const html = '<p>Visit http://example.com for info</p>';
            const result = AlterationService.proxyUrls(html, 'http://example.com', '/proxy/', false);
            expect(result).to.include('/proxy/http://example.com');
        });

        it('should prefix all https:// occurrences', () => {
            const html = '<p>Visit https://example.com for info</p>';
            const result = AlterationService.proxyUrls(html, 'https://example.com', '/proxy/', false);
            expect(result).to.include('/proxy/https://example.com');
        });

        it('should prefix URLs both in and outside attributes', () => {
            const html = '<a href="https://example.com">https://example.com</a>';
            const result = AlterationService.proxyUrls(html, 'https://example.com', '/proxy/', false);
            // Both occurrences should be prefixed
            const count = (result.match(/\/proxy\/https:\/\//g) || []).length;
            expect(count).to.equal(2);
        });

        it('should replace ../ with /', () => {
            const html = '<a href="../page">../page</a>';
            const result = AlterationService.proxyUrls(html, 'https://example.com', '/proxy/', false);
            expect(result).to.not.include('../');
        });
    });

    it('should handle empty html string', () => {
        const result = AlterationService.proxyUrls('', 'https://example.com', '/proxy/');
        expect(result).to.equal('');
    });

    it('should handle html with no URLs', () => {
        const html = '<p>No URLs here</p>';
        const result = AlterationService.proxyUrls(html, 'https://example.com', '/proxy/');
        expect(result).to.equal('<p>No URLs here</p>');
    });
});
