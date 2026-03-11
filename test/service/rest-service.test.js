'use strict';

import { expect } from 'chai';
import nock from 'nock';
import RestService from '../../service/rest-service.js';

async function streamToString(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks.map(c => typeof c === 'string' ? Buffer.from(c) : c)).toString();
}

describe('RestService', function () {

    afterEach(function () {
        nock.cleanAll();
    });

    // ───────────────────────────── fetchAndEdit ─────────────────────────────

    describe('fetchAndEdit', function () {

        it('should proxy successfully with no body edits (image content-type)', async function () {
            nock('https://example.com')
                .get('/image.png')
                .reply(200, 'fake-png-data', {
                    'content-type': 'image/png',
                });

            const requestEdits = { method: 'GET', headers: {} };
            const responseEdits = { headers: {}, body: {} };
            const errorEdits = {};

            const result = await RestService.fetchAndEdit(
                'https://example.com/image.png',
                requestEdits,
                responseEdits,
                errorEdits,
            );

            expect(result.status).to.equal(200);
            expect(result.headers).to.have.property('content-type');
            expect(result.headers['content-type']).to.include('image/png');
            // body should be the original stream (not converted to text)
            const body = await streamToString(result.body);
            expect(body).to.include('fake-png-data');
        });

        it('should proxy successfully with body edits (html with rewriteUrls, htmlAppend, htmlPrepend, regexReplace)', async function () {
            const html = '<html><head></head><body><a href="/page">link</a></body></html>';
            nock('https://example.com')
                .get('/page.html')
                .reply(200, html, {
                    'content-type': 'text/html; charset=utf-8',
                });

            const requestEdits = { method: 'GET', headers: {} };
            const responseEdits = {
                headers: {},
                baseUrl: 'http://localhost:3000',
                body: {
                    rewriteUrls: 'true',
                    htmlAppend: { body: '<footer>appended</footer>' },
                    htmlPrepend: { body: '<header>prepended</header>' },
                    regexReplace: { 'link': 'LINK' },
                },
            };
            const errorEdits = {};

            const result = await RestService.fetchAndEdit(
                'https://example.com/page.html',
                requestEdits,
                responseEdits,
                errorEdits,
            );

            expect(result.status).to.equal(200);
            const body = await streamToString(result.body);
            expect(body).to.include('appended');
            expect(body).to.include('prepended');
            expect(body).to.include('LINK');
        });

        it('should handle network errors and return status 500', async function () {
            nock('https://example.com')
                .get('/fail')
                .replyWithError('connection refused');

            const requestEdits = { method: 'GET', headers: {} };
            const responseEdits = { headers: {} };
            const errorEdits = {};

            const result = await RestService.fetchAndEdit(
                'https://example.com/fail',
                requestEdits,
                responseEdits,
                errorEdits,
            );

            expect(result.status).to.equal(500);
            expect(result.headers['Access-Control-Allow-Origin']).to.equal('*');
            const body = await streamToString(result.body);
            expect(body).to.include('connection refused');
        });

        it('should return status 200 when alwaysok is set on error', async function () {
            nock('https://example.com')
                .get('/fail')
                .replyWithError('something broke');

            const requestEdits = { method: 'GET', headers: {} };
            const responseEdits = { headers: {} };
            const errorEdits = { alwaysok: true };

            const result = await RestService.fetchAndEdit(
                'https://example.com/fail',
                requestEdits,
                responseEdits,
                errorEdits,
            );

            expect(result.status).to.equal(200);
        });

        it('should merge responseEdits.headers into error response headers', async function () {
            nock('https://example.com')
                .get('/fail')
                .replyWithError('oops');

            const requestEdits = { method: 'GET', headers: {} };
            const responseEdits = { headers: { 'X-Custom': 'value' } };
            const errorEdits = {};

            const result = await RestService.fetchAndEdit(
                'https://example.com/fail',
                requestEdits,
                responseEdits,
                errorEdits,
            );

            expect(result.headers['X-Custom']).to.equal('value');
        });

        it('should forward upstream non-200 status (e.g. 404)', async function () {
            nock('https://example.com')
                .get('/missing')
                .reply(404, 'Not Found', { 'content-type': 'text/plain' });

            const requestEdits = { method: 'GET', headers: {} };
            const responseEdits = { headers: {}, body: {} };
            const errorEdits = {};

            const result = await RestService.fetchAndEdit(
                'https://example.com/missing',
                requestEdits,
                responseEdits,
                errorEdits,
            );

            expect(result.status).to.equal(404);
            const body = await streamToString(result.body);
            expect(body).to.include('Not Found');
        });

        it('should use provided method, headers, and body in the fetch call', async function () {
            nock('https://example.com')
                .post('/api', 'request-body')
                .matchHeader('X-Token', 'abc')
                .reply(200, '{"ok":true}', { 'content-type': 'application/json' });

            const requestEdits = {
                method: 'POST',
                headers: { 'X-Token': 'abc' },
                body: 'request-body',
            };
            const responseEdits = { headers: {}, body: {} };
            const errorEdits = {};

            const result = await RestService.fetchAndEdit(
                'https://example.com/api',
                requestEdits,
                responseEdits,
                errorEdits,
            );

            expect(result.status).to.equal(200);
        });
    });

    // ───────────────────────────── _rewriteUrls ─────────────────────────────

    describe('_rewriteUrls', function () {

        it('should skip rewriting when content-type is not html', function () {
            const headers = { 'content-type': 'application/json' };
            const body = '<a href="/page">link</a>';

            const result = RestService._rewriteUrls(
                'https://example.com/api',
                {},
                { body: { rewriteUrls: 'true' } },
                headers,
                body,
            );

            expect(result).to.equal(body);
        });

        it('should rewrite urls when content-type is html and rewriteUrls is false', function () {
            const headers = { 'content-type': 'text/html' };
            const body = '<a href="/page">link</a>';

            const result = RestService._rewriteUrls(
                'https://example.com',
                {},
                { body: { rewriteUrls: 'false' } },
                headers,
                body,
            );

            // rewriteUrls (rel-to-abs) still runs, but proxyUrls does not
            expect(result).to.include('https://example.com/page');
        });

        it('should rewrite and proxy urls when content-type is html and rewriteUrls is true', function () {
            const headers = { 'content-type': 'text/html' };
            const body = '<a href="/page">link</a>';
            const requestEdits = { method: 'GET', headers: {} };
            const responseEdits = {
                baseUrl: 'http://localhost:3000',
                body: { rewriteUrls: 'true' },
            };

            const result = RestService._rewriteUrls(
                'https://example.com',
                requestEdits,
                responseEdits,
                headers,
                body,
            );

            expect(result).to.include('http://localhost:3000');
        });

        it('should skip rewriting when content-type header is missing', function () {
            const headers = {};
            const body = '<a href="/page">link</a>';

            const result = RestService._rewriteUrls(
                'https://example.com',
                {},
                { body: { rewriteUrls: 'true' } },
                headers,
                body,
            );

            expect(result).to.equal(body);
        });
    });

    // ───────────────────────────── _htmlAppend ─────────────────────────────

    describe('_htmlAppend', function () {

        it('should append html to matching selectors', function () {
            const responseEdits = {
                body: {
                    htmlAppend: { body: '<footer>appended</footer>' },
                },
            };
            const body = '<html><body><p>hello</p></body></html>';

            const result = RestService._htmlAppend(responseEdits, body);

            expect(result).to.include('<footer>appended</footer>');
            // original content preserved
            expect(result).to.include('<p>hello</p>');
        });

        it('should return body unchanged when htmlAppend is empty', function () {
            const responseEdits = { body: { htmlAppend: {} } };
            const body = '<html><body>content</body></html>';

            const result = RestService._htmlAppend(responseEdits, body);

            expect(result).to.equal(body);
        });

        it('should return body unchanged when htmlAppend is undefined', function () {
            const responseEdits = { body: {} };
            const body = '<p>content</p>';

            const result = RestService._htmlAppend(responseEdits, body);

            expect(result).to.equal(body);
        });

        it('should return body unchanged when body is undefined', function () {
            const responseEdits = {};
            const body = '<p>content</p>';

            const result = RestService._htmlAppend(responseEdits, body);

            expect(result).to.equal(body);
        });
    });

    // ───────────────────────────── _htmlPrepend ─────────────────────────────

    describe('_htmlPrepend', function () {

        it('should prepend html to matching selectors', function () {
            const responseEdits = {
                body: {
                    htmlPrepend: { body: '<header>prepended</header>' },
                },
            };
            const body = '<html><body><p>hello</p></body></html>';

            const result = RestService._htmlPrepend(responseEdits, body);

            expect(result).to.include('<header>prepended</header>');
            expect(result).to.include('<p>hello</p>');
            // prepended content should appear before existing content
            const prependedIdx = result.indexOf('<header>prepended</header>');
            const existingIdx = result.indexOf('<p>hello</p>');
            expect(prependedIdx).to.be.lessThan(existingIdx);
        });

        it('should return body unchanged when htmlPrepend is empty', function () {
            const responseEdits = { body: { htmlPrepend: {} } };
            const body = '<html><body>content</body></html>';

            const result = RestService._htmlPrepend(responseEdits, body);

            expect(result).to.equal(body);
        });

        it('should return body unchanged when htmlPrepend is undefined', function () {
            const responseEdits = { body: {} };
            const body = '<p>content</p>';

            const result = RestService._htmlPrepend(responseEdits, body);

            expect(result).to.equal(body);
        });

        it('should return body unchanged when body is undefined', function () {
            const responseEdits = {};
            const body = '<p>content</p>';

            const result = RestService._htmlPrepend(responseEdits, body);

            expect(result).to.equal(body);
        });
    });

    // ───────────────────────────── _regexReplace ─────────────────────────────

    describe('_regexReplace', function () {

        it('should replace matching patterns', async function () {
            const responseEdits = {
                body: {
                    regexReplace: { 'foo': 'bar' },
                },
            };
            const body = 'foo is foo';

            const result = await RestService._regexReplace(responseEdits, body);

            expect(result).to.include('bar');
            expect(result).to.not.include('foo');
        });

        it('should apply multiple regex replacements', async function () {
            const responseEdits = {
                body: {
                    regexReplace: { 'hello': 'hi', 'world': 'earth' },
                },
            };
            const body = 'hello world';

            const result = await RestService._regexReplace(responseEdits, body);

            expect(result).to.equal('hi earth');
        });

        it('should return body unchanged when regexReplace is empty', async function () {
            const responseEdits = { body: { regexReplace: {} } };
            const body = 'no changes here';

            const result = await RestService._regexReplace(responseEdits, body);

            expect(result).to.equal(body);
        });

        it('should return body unchanged when regexReplace is undefined', async function () {
            const responseEdits = { body: {} };
            const body = 'no changes here';

            const result = await RestService._regexReplace(responseEdits, body);

            expect(result).to.equal(body);
        });

        it('should return body unchanged when body is undefined', async function () {
            const responseEdits = {};
            const body = 'no changes here';

            const result = await RestService._regexReplace(responseEdits, body);

            expect(result).to.equal(body);
        });
    });

    // ───────────────────────────── _formatError ─────────────────────────────

    describe('_formatError', function () {

        it('should format error as JSON when responseType is "json"', async function () {
            const errorEdits = { responseType: 'json' };

            const stream = await RestService._formatError(404, 'Not Found', errorEdits);
            const body = await streamToString(stream);
            const parsed = JSON.parse(body);

            expect(parsed.status).to.equal(404);
            expect(parsed.message).to.include('404');
            expect(parsed.errorMessage).to.equal('Not Found');
        });

        it('should format error as text when responseType is "text"', async function () {
            const errorEdits = { responseType: 'text' };

            const stream = await RestService._formatError(500, 'Server Error', errorEdits);
            const body = await streamToString(stream);

            expect(body).to.equal('Server Error');
        });

        it('should fetch from http.cat when responseType is "httpcats"', async function () {
            const catImage = Buffer.from('cat-image-data');
            nock('https://http.cat')
                .get('/404')
                .reply(200, catImage, { 'content-type': 'image/jpeg' });

            const errorEdits = { responseType: 'httpcats' };

            const stream = await RestService._formatError(404, 'Not Found', errorEdits);
            const body = await streamToString(stream);

            expect(body).to.equal('cat-image-data');
        });

        it('should fall back to text when httpcats fetch fails', async function () {
            nock('https://http.cat')
                .get('/500')
                .replyWithError('unreachable');

            const errorEdits = { responseType: 'httpcats' };

            const stream = await RestService._formatError(500, 'Server Error', errorEdits);
            const body = await streamToString(stream);

            expect(body).to.equal('Server Error');
        });

        it('should format error with default message when responseType is unknown', async function () {
            const errorEdits = { responseType: 'unknown' };

            const stream = await RestService._formatError(503, 'Unavailable', errorEdits);
            const body = await streamToString(stream);

            expect(body).to.include('Fluid proxy encountered an error');
            expect(body).to.include('503');
            expect(body).to.include('Unavailable');
        });

        it('should format error with default message when responseType is undefined', async function () {
            const errorEdits = {};

            const stream = await RestService._formatError(500, 'fail', errorEdits);
            const body = await streamToString(stream);

            expect(body).to.include('Fluid proxy encountered an error');
            expect(body).to.include('500');
            expect(body).to.include('fail');
        });
    });

    // ───────────────────────────── _toReadableStream ─────────────────────────────

    describe('_toReadableStream', function () {

        it('should convert a string to a readable stream', async function () {
            const stream = RestService._toReadableStream('hello world');
            const result = await streamToString(stream);

            expect(result).to.equal('hello world');
        });

        it('should handle an empty string', async function () {
            const stream = RestService._toReadableStream('');
            const result = await streamToString(stream);

            expect(result).to.equal('');
        });

        it('should handle a string with special characters', async function () {
            const input = '<html>café & résumé — "quotes"</html>';
            const stream = RestService._toReadableStream(input);
            const result = await streamToString(stream);

            expect(result).to.equal(input);
        });
    });
});
