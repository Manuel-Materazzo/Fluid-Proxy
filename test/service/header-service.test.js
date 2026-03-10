'use strict';

import { expect } from 'chai';
import HeaderService from '../../service/header-service.js';

// ---------------------------------------------------------------------------
// extractRequestEdits
// ---------------------------------------------------------------------------
describe('HeaderService.extractRequestEdits', () => {

    it('should extract all fields when all headers are present', () => {
        const headers = {
            requesturl: 'https://example.com/api',
            requestheaders: '{"Authorization":"Bearer token"}',
            requestbody: '{"key":"value"}',
            requestmethod: 'POST',
        };
        const result = HeaderService.extractRequestEdits(headers, 'GET');
        expect(result.url).to.equal('https://example.com/api');
        expect(result.headers).to.deep.equal({ Authorization: 'Bearer token' });
        expect(result.body).to.equal('{"key":"value"}');
        expect(result.method).to.equal('POST');
    });

    it('should use defaultMethod when requestmethod header is missing', () => {
        const headers = {};
        const result = HeaderService.extractRequestEdits(headers, 'GET');
        expect(result.method).to.equal('GET');
    });

    it('should use defaultMethod when requestmethod header is undefined', () => {
        const headers = { requestmethod: undefined };
        const result = HeaderService.extractRequestEdits(headers, 'PUT');
        expect(result.method).to.equal('PUT');
    });

    it('should use defaultMethod when requestmethod header is null', () => {
        const headers = { requestmethod: null };
        const result = HeaderService.extractRequestEdits(headers, 'DELETE');
        expect(result.method).to.equal('DELETE');
    });

    it('should prefer requestmethod over defaultMethod when both are present', () => {
        const headers = { requestmethod: 'PATCH' };
        const result = HeaderService.extractRequestEdits(headers, 'GET');
        expect(result.method).to.equal('PATCH');
    });

    it('should return undefined url when requesturl header is missing', () => {
        const headers = {};
        const result = HeaderService.extractRequestEdits(headers, 'GET');
        expect(result.url).to.be.undefined;
    });

    it('should return undefined headers when requestheaders header is missing', () => {
        const headers = {};
        const result = HeaderService.extractRequestEdits(headers, 'GET');
        expect(result.headers).to.be.undefined;
    });

    it('should return undefined body when requestbody header is missing', () => {
        const headers = {};
        const result = HeaderService.extractRequestEdits(headers, 'GET');
        expect(result.body).to.be.undefined;
    });

    it('should return all fields undefined (except method) when headers object is empty', () => {
        const result = HeaderService.extractRequestEdits({}, 'GET');
        expect(result.url).to.be.undefined;
        expect(result.headers).to.be.undefined;
        expect(result.body).to.be.undefined;
        expect(result.method).to.equal('GET');
    });

    it('should fall back to {} when requestheaders contains invalid JSON', () => {
        const headers = { requestheaders: 'not-valid-json' };
        const result = HeaderService.extractRequestEdits(headers, 'GET');
        expect(result.headers).to.deep.equal({});
    });

    it('should fall back to {} when requestheaders contains a bare string', () => {
        const headers = { requestheaders: '{broken' };
        const result = HeaderService.extractRequestEdits(headers, 'GET');
        expect(result.headers).to.deep.equal({});
    });

    it('should parse valid JSON in requestheaders with multiple keys', () => {
        const headers = {
            requestheaders: '{"Content-Type":"application/json","Accept":"text/html"}',
        };
        const result = HeaderService.extractRequestEdits(headers, 'GET');
        expect(result.headers).to.deep.equal({
            'Content-Type': 'application/json',
            Accept: 'text/html',
        });
    });

    it('should not parse requestbody – it is returned as a raw string', () => {
        const headers = { requestbody: '{"foo":"bar"}' };
        const result = HeaderService.extractRequestEdits(headers, 'GET');
        expect(result.body).to.equal('{"foo":"bar"}');
    });

    it('should not set url when requesturl is an empty string', () => {
        const headers = { requesturl: '' };
        const result = HeaderService.extractRequestEdits(headers, 'GET');
        expect(result.url).to.be.undefined;
    });

    it('should not set headers when requestheaders is an empty string', () => {
        const headers = { requestheaders: '' };
        const result = HeaderService.extractRequestEdits(headers, 'GET');
        expect(result.headers).to.be.undefined;
    });

    it('should not set body when requestbody is an empty string', () => {
        const headers = { requestbody: '' };
        const result = HeaderService.extractRequestEdits(headers, 'GET');
        expect(result.body).to.be.undefined;
    });
});

// ---------------------------------------------------------------------------
// extractResponseEdits
// ---------------------------------------------------------------------------
describe('HeaderService.extractResponseEdits', () => {

    it('should extract all fields when all headers are present', () => {
        const headers = {
            responseheaders: '{"X-Custom":"value"}',
            responsebodyhtmlappend: '{"selector":"body","html":"<p>appended</p>"}',
            responsebodyhtmlprepend: '{"selector":"body","html":"<p>prepended</p>"}',
            responsebodyregexreplace: '{"pattern":"foo","replacement":"bar"}',
            responserewriteurls: 'true',
            responseproxyurlsattributeonly: 'true',
        };
        const result = HeaderService.extractResponseEdits('https://example.com', headers);
        expect(result.baseUrl).to.equal('https://example.com');
        expect(result.headers).to.deep.equal({ 'X-Custom': 'value' });
        expect(result.body.htmlAppend).to.deep.equal({ selector: 'body', html: '<p>appended</p>' });
        expect(result.body.htmlPrepend).to.deep.equal({ selector: 'body', html: '<p>prepended</p>' });
        expect(result.body.regexReplace).to.deep.equal({ pattern: 'foo', replacement: 'bar' });
        expect(result.body.rewriteUrls).to.equal('true');
        expect(result.body.proxyUrlsAttributeOnly).to.be.true;
    });

    it('should pass through baseUrl as-is', () => {
        const result = HeaderService.extractResponseEdits('http://my-site.org', {});
        expect(result.baseUrl).to.equal('http://my-site.org');
    });

    it('should return undefined headers when responseheaders is missing', () => {
        const result = HeaderService.extractResponseEdits('https://example.com', {});
        expect(result.headers).to.be.undefined;
    });

    it('should fall back to {} when responseheaders contains invalid JSON', () => {
        const headers = { responseheaders: 'not json' };
        const result = HeaderService.extractResponseEdits('https://example.com', headers);
        expect(result.headers).to.deep.equal({});
    });

    it('should return undefined htmlAppend when responsebodyhtmlappend is missing', () => {
        const result = HeaderService.extractResponseEdits('https://example.com', {});
        expect(result.body.htmlAppend).to.be.undefined;
    });

    it('should fall back to {} when responsebodyhtmlappend contains invalid JSON', () => {
        const headers = { responsebodyhtmlappend: '{bad' };
        const result = HeaderService.extractResponseEdits('https://example.com', headers);
        expect(result.body.htmlAppend).to.deep.equal({});
    });

    it('should return undefined htmlPrepend when responsebodyhtmlprepend is missing', () => {
        const result = HeaderService.extractResponseEdits('https://example.com', {});
        expect(result.body.htmlPrepend).to.be.undefined;
    });

    it('should fall back to {} when responsebodyhtmlprepend contains invalid JSON', () => {
        const headers = { responsebodyhtmlprepend: 'invalid' };
        const result = HeaderService.extractResponseEdits('https://example.com', headers);
        expect(result.body.htmlPrepend).to.deep.equal({});
    });

    it('should return undefined regexReplace when responsebodyregexreplace is missing', () => {
        const result = HeaderService.extractResponseEdits('https://example.com', {});
        expect(result.body.regexReplace).to.be.undefined;
    });

    it('should fall back to {} when responsebodyregexreplace contains invalid JSON', () => {
        const headers = { responsebodyregexreplace: '%%%' };
        const result = HeaderService.extractResponseEdits('https://example.com', headers);
        expect(result.body.regexReplace).to.deep.equal({});
    });

    it('should return undefined rewriteUrls when responserewriteurls is missing', () => {
        const result = HeaderService.extractResponseEdits('https://example.com', {});
        expect(result.body.rewriteUrls).to.be.undefined;
    });

    it('should return rewriteUrls as a raw string value', () => {
        const headers = { responserewriteurls: 'some-value' };
        const result = HeaderService.extractResponseEdits('https://example.com', headers);
        expect(result.body.rewriteUrls).to.equal('some-value');
    });

    // proxyUrlsAttributeOnly edge cases
    it('should default proxyUrlsAttributeOnly to true when header is missing', () => {
        const result = HeaderService.extractResponseEdits('https://example.com', {});
        expect(result.body.proxyUrlsAttributeOnly).to.be.true;
    });

    it('should default proxyUrlsAttributeOnly to true when header is undefined', () => {
        const headers = { responseproxyurlsattributeonly: undefined };
        const result = HeaderService.extractResponseEdits('https://example.com', headers);
        expect(result.body.proxyUrlsAttributeOnly).to.be.true;
    });

    it('should set proxyUrlsAttributeOnly to false only when header is exactly "false"', () => {
        const headers = { responseproxyurlsattributeonly: 'false' };
        const result = HeaderService.extractResponseEdits('https://example.com', headers);
        expect(result.body.proxyUrlsAttributeOnly).to.be.false;
    });

    it('should keep proxyUrlsAttributeOnly true when header is "true"', () => {
        const headers = { responseproxyurlsattributeonly: 'true' };
        const result = HeaderService.extractResponseEdits('https://example.com', headers);
        expect(result.body.proxyUrlsAttributeOnly).to.be.true;
    });

    it('should keep proxyUrlsAttributeOnly true when header is "FALSE" (uppercase)', () => {
        const headers = { responseproxyurlsattributeonly: 'FALSE' };
        const result = HeaderService.extractResponseEdits('https://example.com', headers);
        expect(result.body.proxyUrlsAttributeOnly).to.be.true;
    });

    it('should keep proxyUrlsAttributeOnly true when header is "False" (mixed case)', () => {
        const headers = { responseproxyurlsattributeonly: 'False' };
        const result = HeaderService.extractResponseEdits('https://example.com', headers);
        expect(result.body.proxyUrlsAttributeOnly).to.be.true;
    });

    it('should keep proxyUrlsAttributeOnly true when header is an empty string', () => {
        const headers = { responseproxyurlsattributeonly: '' };
        const result = HeaderService.extractResponseEdits('https://example.com', headers);
        expect(result.body.proxyUrlsAttributeOnly).to.be.true;
    });

    it('should keep proxyUrlsAttributeOnly true when header is any non-"false" string', () => {
        const headers = { responseproxyurlsattributeonly: 'yes' };
        const result = HeaderService.extractResponseEdits('https://example.com', headers);
        expect(result.body.proxyUrlsAttributeOnly).to.be.true;
    });

    it('should return all body fields undefined (except defaults) when headers object is empty', () => {
        const result = HeaderService.extractResponseEdits('https://example.com', {});
        expect(result.headers).to.be.undefined;
        expect(result.body.htmlAppend).to.be.undefined;
        expect(result.body.htmlPrepend).to.be.undefined;
        expect(result.body.regexReplace).to.be.undefined;
        expect(result.body.rewriteUrls).to.be.undefined;
        expect(result.body.proxyUrlsAttributeOnly).to.be.true;
    });
});

// ---------------------------------------------------------------------------
// extractErrorEdits
// ---------------------------------------------------------------------------
describe('HeaderService.extractErrorEdits', () => {

    it('should extract alwaysok and responseType when both headers are present', () => {
        const headers = {
            errorstatusalwaysok: 'true',
            errorresponsetype: 'json',
        };
        const result = HeaderService.extractErrorEdits(headers);
        expect(result.alwaysok).to.equal('true');
        expect(result.responseType).to.equal('json');
    });

    it('should return undefined alwaysok when header is missing', () => {
        const result = HeaderService.extractErrorEdits({});
        expect(result.alwaysok).to.be.undefined;
    });

    it('should return undefined responseType when header is missing', () => {
        const result = HeaderService.extractErrorEdits({});
        expect(result.responseType).to.be.undefined;
    });

    it('should return both fields undefined when headers object is empty', () => {
        const result = HeaderService.extractErrorEdits({});
        expect(result.alwaysok).to.be.undefined;
        expect(result.responseType).to.be.undefined;
    });

    it('should pass through alwaysok value as-is (no boolean conversion)', () => {
        const result = HeaderService.extractErrorEdits({ errorstatusalwaysok: 'false' });
        expect(result.alwaysok).to.equal('false');
    });

    it('should pass through responseType value as-is', () => {
        const result = HeaderService.extractErrorEdits({ errorresponsetype: 'text' });
        expect(result.responseType).to.equal('text');
    });
});
