'use strict';

import { expect } from 'chai';
import express from 'express';
import cors from 'cors';
import nock from 'nock';
import supertest from 'supertest';
import bootstrap from '../../controller/bootstrap.js';
import UrlValidationService from '../../service/url-validation-service.js';

// Express 5 uses path-to-regexp v8 which requires named wildcard params ({*name})
// instead of bare `*`. Wrap app.all so bootstrap's `/*` and `/path-variable/*`
// patterns are silently translated to Express 5 syntax.
function createApp() {
    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    const originalAll = app.all.bind(app);
    app.all = function (path, ...handlers) {
        // translate Express 4 wildcard patterns to Express 5 named wildcards
        const fixed = path
            .replace('/path-variable/*', '/path-variable/{*path}')
            .replace(/^\/\*$/, '/{*path}');
        return originalAll(fixed, ...handlers);
    };

    bootstrap(app);

    // restore original method
    app.all = originalAll;

    return app;
}

const app = createApp();

describe('Bootstrap controller integration tests', function () {

    beforeEach(function () {
        UrlValidationService._originalValidate = UrlValidationService.validate;
        UrlValidationService.validate = async () => {};
    });

    afterEach(function () {
        UrlValidationService.validate = UrlValidationService._originalValidate;
        nock.cleanAll();
    });

    // ───────────────────────────── /header ─────────────────────────────

    describe('/header endpoint', function () {

        it('should proxy a GET request using requesturl header', async function () {
            nock('https://example.com')
                .get('/page')
                .reply(200, '<html>test</html>', { 'content-type': 'text/html' });

            const res = await supertest(app)
                .get('/header')
                .set('requesturl', 'https://example.com/page')
                .expect(200);

            expect(res.text).to.include('test');
        });

        it('should proxy a POST request with body', async function () {
            nock('https://example.com')
                .post('/api', 'hello=world')
                .reply(200, '{"ok":true}', { 'content-type': 'application/json' });

            const res = await supertest(app)
                .post('/header')
                .set('requesturl', 'https://example.com/api')
                .set('requestmethod', 'POST')
                .set('requestbody', 'hello=world')
                .expect(200);

            expect(res.text).to.include('"ok":true');
        });

        it('should apply custom response headers', async function () {
            nock('https://example.com')
                .get('/page')
                .reply(200, 'ok', { 'content-type': 'text/plain' });

            const res = await supertest(app)
                .get('/header')
                .set('requesturl', 'https://example.com/page')
                .set('responseheaders', JSON.stringify({ 'X-Custom-Header': 'custom-value' }))
                .expect(200);

            expect(res.headers['x-custom-header']).to.equal('custom-value');
        });

        it('should handle target server 500 error', async function () {
            nock('https://example.com')
                .get('/fail')
                .reply(500, 'Internal Server Error', { 'content-type': 'text/plain' });

            const res = await supertest(app)
                .get('/header')
                .set('requesturl', 'https://example.com/fail');

            expect(res.status).to.equal(500);
        });
    });

    // ───────────────────────────── /queryparam ─────────────────────────────

    describe('/queryparam endpoint', function () {

        it('should proxy a GET request using url query param', async function () {
            nock('https://example.com')
                .get('/data')
                .reply(200, '{"result":"success"}', { 'content-type': 'application/json' });

            const res = await supertest(app)
                .get('/queryparam')
                .query({ url: 'https://example.com/data' })
                .expect(200);

            expect(res.text).to.include('success');
        });

        it('should use custom request method via requestMethod param', async function () {
            nock('https://example.com')
                .put('/resource')
                .reply(200, 'updated', { 'content-type': 'text/plain' });

            const res = await supertest(app)
                .get('/queryparam')
                .query({ url: 'https://example.com/resource', requestMethod: 'PUT' })
                .expect(200);

            expect(res.text).to.include('updated');
        });

        it('should handle target server error', async function () {
            nock('https://example.com')
                .get('/error')
                .reply(503, 'Service Unavailable', { 'content-type': 'text/plain' });

            const res = await supertest(app)
                .get('/queryparam')
                .query({ url: 'https://example.com/error' });

            expect(res.status).to.equal(503);
        });
    });

    // ───────────────────────────── /path-variable/* ─────────────────────────────

    describe('/path-variable/* endpoint', function () {

        it('should proxy a basic GET request', async function () {
            nock('https://example.com')
                .get('/')
                .reply(200, 'path-variable response', { 'content-type': 'text/plain' });

            const res = await supertest(app)
                .get('/path-variable/GET/%7B%7D/false//https://example.com/')
                .expect(200);

            expect(res.text).to.include('path-variable response');
        });

        it('should proxy with custom headers', async function () {
            nock('https://example.com')
                .get('/api')
                .matchHeader('Authorization', 'Bearer token123')
                .reply(200, 'authorized', { 'content-type': 'text/plain' });

            const headers = encodeURIComponent(JSON.stringify({ 'Authorization': 'Bearer token123' }));

            const res = await supertest(app)
                .get(`/path-variable/GET/${headers}/false//https://example.com/api`)
                .expect(200);

            expect(res.text).to.include('authorized');
        });
    });

    // ───────────────────────────── /* fallback ─────────────────────────────

    describe('/* fallback handler', function () {

        it('should return 404 when referer does not contain proxy patterns', async function () {
            const res = await supertest(app)
                .get('/some/random/path')
                .set('referer', 'https://unrelated-site.com/')
                .expect(404);

            expect(res.text).to.include('Not found');
        });

        it('should return 404 when no referer is present', async function () {
            const res = await supertest(app)
                .get('/some/random/path')
                .expect(404);

            expect(res.text).to.include('Not found');
        });

        it('should construct fallback URL from referer with /queryparam pattern', async function () {
            // fallback constructs: referer + requestUri
            // referer ends with '/' so requestUri gets leading '/' sliced
            // result: http://proxy.test/queryparam?url=https://example.com/styles.css
            nock('http://proxy.test')
                .get('/queryparam')
                .query({ url: 'https://example.com/styles.css' })
                .reply(200, 'body { color: red; }', { 'content-type': 'text/css' });

            const res = await supertest(app)
                .get('/styles.css')
                .set('referer', 'http://proxy.test/queryparam?url=https://example.com/');

            expect(res.status).to.equal(200);
            expect(res.text).to.include('body { color: red; }');
        });

        it('should construct fallback URL from referer with /header pattern', async function () {
            // referer ends with '/' so requestUri '/asset.js' becomes 'asset.js'
            // result: http://proxy.test/header/asset.js
            nock('http://proxy.test')
                .get('/header/asset.js')
                .reply(200, 'console.log("hi")', { 'content-type': 'application/javascript' });

            const res = await supertest(app)
                .get('/asset.js')
                .set('referer', 'http://proxy.test/header/');

            expect(res.status).to.equal(200);
            expect(res.text).to.include('console.log("hi")');
        });

        it('should construct fallback URL from referer with /path-variable/ pattern', async function () {
            nock('http://proxy.test')
                .get('/path-variable/GET/%7B%7D/false//https://example.com/style.css')
                .reply(200, '.main { display: flex; }', { 'content-type': 'text/css' });

            const res = await supertest(app)
                .get('/style.css')
                .set('referer', 'http://proxy.test/path-variable/GET/%7B%7D/false//https://example.com/');

            expect(res.status).to.equal(200);
            expect(res.text).to.include('.main { display: flex; }');
        });
    });
});
