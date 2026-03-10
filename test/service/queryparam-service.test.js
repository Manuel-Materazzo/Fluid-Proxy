'use strict';

import { expect } from 'chai';
import QueryparamService from '../../service/queryparam-service.js';

describe('QueryparamService', function () {

    describe('extractRequestEdits', function () {

        it('should parse valid JSON requestHeaders', function () {
            const params = { requestHeaders: '{"Content-Type":"application/json"}' };
            const result = QueryparamService.extractRequestEdits(params, 'GET');
            expect(result.headers).to.deep.equal({ 'Content-Type': 'application/json' });
        });

        it('should fallback to empty object on invalid JSON requestHeaders', function () {
            const params = { requestHeaders: 'not-json' };
            const result = QueryparamService.extractRequestEdits(params, 'GET');
            expect(result.headers).to.deep.equal({});
        });

        it('should leave headers undefined when requestHeaders is absent', function () {
            const params = {};
            const result = QueryparamService.extractRequestEdits(params, 'GET');
            expect(result.headers).to.be.undefined;
        });

        it('should extract requestBody as-is', function () {
            const params = { requestBody: '{"key":"value"}' };
            const result = QueryparamService.extractRequestEdits(params, 'GET');
            expect(result.body).to.equal('{"key":"value"}');
        });

        it('should leave body undefined when requestBody is absent', function () {
            const params = {};
            const result = QueryparamService.extractRequestEdits(params, 'GET');
            expect(result.body).to.be.undefined;
        });

        it('should use requestMethod when provided', function () {
            const params = { requestMethod: 'POST' };
            const result = QueryparamService.extractRequestEdits(params, 'GET');
            expect(result.method).to.equal('POST');
        });

        it('should fall back to defaultMethod when requestMethod is absent', function () {
            const params = {};
            const result = QueryparamService.extractRequestEdits(params, 'GET');
            expect(result.method).to.equal('GET');
        });

        it('should use requestMethod even if it is an empty string (nullish coalescing)', function () {
            const params = { requestMethod: '' };
            const result = QueryparamService.extractRequestEdits(params, 'GET');
            expect(result.method).to.equal('');
        });

        it('should fall back to defaultMethod when requestMethod is null', function () {
            const params = { requestMethod: null };
            const result = QueryparamService.extractRequestEdits(params, 'GET');
            expect(result.method).to.equal('GET');
        });

        it('should fall back to defaultMethod when requestMethod is undefined', function () {
            const params = { requestMethod: undefined };
            const result = QueryparamService.extractRequestEdits(params, 'GET');
            expect(result.method).to.equal('GET');
        });

        it('should extract all fields together', function () {
            const params = {
                requestHeaders: '{"Authorization":"Bearer tok"}',
                requestBody: 'hello',
                requestMethod: 'PUT'
            };
            const result = QueryparamService.extractRequestEdits(params, 'GET');
            expect(result).to.deep.equal({
                headers: { Authorization: 'Bearer tok' },
                body: 'hello',
                method: 'PUT'
            });
        });

        it('should not extract a url field', function () {
            const params = { url: 'http://example.com' };
            const result = QueryparamService.extractRequestEdits(params, 'GET');
            expect(result).to.not.have.property('url');
        });
    });

    describe('extractResponseEdits', function () {

        const baseUrl = 'http://proxy.local';

        it('should include baseUrl in the result', function () {
            const result = QueryparamService.extractResponseEdits(baseUrl, {});
            expect(result.baseUrl).to.equal(baseUrl);
        });

        it('should parse valid JSON responseHeaders', function () {
            const params = { responseHeaders: '{"X-Custom":"val"}' };
            const result = QueryparamService.extractResponseEdits(baseUrl, params);
            expect(result.headers).to.deep.equal({ 'X-Custom': 'val' });
        });

        it('should fallback to empty object on invalid JSON responseHeaders', function () {
            const params = { responseHeaders: '{bad' };
            const result = QueryparamService.extractResponseEdits(baseUrl, params);
            expect(result.headers).to.deep.equal({});
        });

        it('should leave headers undefined when responseHeaders is absent', function () {
            const result = QueryparamService.extractResponseEdits(baseUrl, {});
            expect(result.headers).to.be.undefined;
        });

        it('should parse valid JSON responseBodyHtmlAppend', function () {
            const params = { responseBodyHtmlAppend: '{"selector":"body","html":"<p>hi</p>"}' };
            const result = QueryparamService.extractResponseEdits(baseUrl, params);
            expect(result.body.htmlAppend).to.deep.equal({ selector: 'body', html: '<p>hi</p>' });
        });

        it('should fallback to empty object on invalid JSON responseBodyHtmlAppend', function () {
            const params = { responseBodyHtmlAppend: 'nope' };
            const result = QueryparamService.extractResponseEdits(baseUrl, params);
            expect(result.body.htmlAppend).to.deep.equal({});
        });

        it('should leave htmlAppend undefined when absent', function () {
            const result = QueryparamService.extractResponseEdits(baseUrl, {});
            expect(result.body.htmlAppend).to.be.undefined;
        });

        it('should parse valid JSON responseBodyHtmlPrepend', function () {
            const params = { responseBodyHtmlPrepend: '{"selector":"head","html":"<meta>"}' };
            const result = QueryparamService.extractResponseEdits(baseUrl, params);
            expect(result.body.htmlPrepend).to.deep.equal({ selector: 'head', html: '<meta>' });
        });

        it('should fallback to empty object on invalid JSON responseBodyHtmlPrepend', function () {
            const params = { responseBodyHtmlPrepend: '%%%' };
            const result = QueryparamService.extractResponseEdits(baseUrl, params);
            expect(result.body.htmlPrepend).to.deep.equal({});
        });

        it('should leave htmlPrepend undefined when absent', function () {
            const result = QueryparamService.extractResponseEdits(baseUrl, {});
            expect(result.body.htmlPrepend).to.be.undefined;
        });

        it('should parse valid JSON responseBodyRegexReplace', function () {
            const params = { responseBodyRegexReplace: '{"pattern":"foo","replacement":"bar"}' };
            const result = QueryparamService.extractResponseEdits(baseUrl, params);
            expect(result.body.regexReplace).to.deep.equal({ pattern: 'foo', replacement: 'bar' });
        });

        it('should fallback to empty object on invalid JSON responseBodyRegexReplace', function () {
            const params = { responseBodyRegexReplace: '[broken' };
            const result = QueryparamService.extractResponseEdits(baseUrl, params);
            expect(result.body.regexReplace).to.deep.equal({});
        });

        it('should leave regexReplace undefined when absent', function () {
            const result = QueryparamService.extractResponseEdits(baseUrl, {});
            expect(result.body.regexReplace).to.be.undefined;
        });

        it('should pass responseRewriteUrls as-is to body.rewriteUrls', function () {
            const params = { responseRewriteUrls: 'true' };
            const result = QueryparamService.extractResponseEdits(baseUrl, params);
            expect(result.body.rewriteUrls).to.equal('true');
        });

        it('should leave rewriteUrls undefined when absent', function () {
            const result = QueryparamService.extractResponseEdits(baseUrl, {});
            expect(result.body.rewriteUrls).to.be.undefined;
        });

        it('should default proxyUrlsAttributeOnly to true when param is absent', function () {
            const result = QueryparamService.extractResponseEdits(baseUrl, {});
            expect(result.body.proxyUrlsAttributeOnly).to.be.true;
        });

        it('should set proxyUrlsAttributeOnly to true when param is any truthy string', function () {
            const params = { responseProxyUrlsAttributeOnly: 'true' };
            const result = QueryparamService.extractResponseEdits(baseUrl, params);
            expect(result.body.proxyUrlsAttributeOnly).to.be.true;
        });

        it('should set proxyUrlsAttributeOnly to false only when param is exactly "false"', function () {
            const params = { responseProxyUrlsAttributeOnly: 'false' };
            const result = QueryparamService.extractResponseEdits(baseUrl, params);
            expect(result.body.proxyUrlsAttributeOnly).to.be.false;
        });

        it('should keep proxyUrlsAttributeOnly true for "False" (case-sensitive)', function () {
            const params = { responseProxyUrlsAttributeOnly: 'False' };
            const result = QueryparamService.extractResponseEdits(baseUrl, params);
            expect(result.body.proxyUrlsAttributeOnly).to.be.true;
        });

        it('should keep proxyUrlsAttributeOnly true for "0"', function () {
            const params = { responseProxyUrlsAttributeOnly: '0' };
            const result = QueryparamService.extractResponseEdits(baseUrl, params);
            expect(result.body.proxyUrlsAttributeOnly).to.be.true;
        });

        it('should return full response edits with all fields populated', function () {
            const params = {
                responseHeaders: '{"X-A":"1"}',
                responseBodyHtmlAppend: '{"a":1}',
                responseBodyHtmlPrepend: '{"b":2}',
                responseBodyRegexReplace: '{"c":3}',
                responseRewriteUrls: 'yes',
                responseProxyUrlsAttributeOnly: 'false'
            };
            const result = QueryparamService.extractResponseEdits(baseUrl, params);
            expect(result).to.deep.equal({
                baseUrl: 'http://proxy.local',
                headers: { 'X-A': '1' },
                body: {
                    rewriteUrls: 'yes',
                    proxyUrlsAttributeOnly: false,
                    htmlAppend: { a: 1 },
                    htmlPrepend: { b: 2 },
                    regexReplace: { c: 3 }
                }
            });
        });
    });

    describe('extractErrorEdits', function () {

        it('should extract errorStatusAlwaysOk as alwaysok', function () {
            const params = { errorStatusAlwaysOk: 'true' };
            const result = QueryparamService.extractErrorEdits(params);
            expect(result.alwaysok).to.equal('true');
        });

        it('should extract errorResponseType as responseType', function () {
            const params = { errorResponseType: 'json' };
            const result = QueryparamService.extractErrorEdits(params);
            expect(result.responseType).to.equal('json');
        });

        it('should return undefined fields when params are empty', function () {
            const result = QueryparamService.extractErrorEdits({});
            expect(result.alwaysok).to.be.undefined;
            expect(result.responseType).to.be.undefined;
        });

        it('should return both fields together', function () {
            const params = { errorStatusAlwaysOk: 'yes', errorResponseType: 'xml' };
            const result = QueryparamService.extractErrorEdits(params);
            expect(result).to.deep.equal({ alwaysok: 'yes', responseType: 'xml' });
        });
    });
});
