'use strict';

import { expect } from 'chai';
import PathvariableService from '../../service/pathvariable-service.js';

describe('PathvariableService', () => {

    describe('extractEdits', () => {

        it('should extract all fields from a fully populated URL', () => {
            const input = 'GET/%7B%22x%22%3A1%7D/true/body/https://example.com/page';
            const result = PathvariableService.extractEdits(input);

            expect(result.method).to.equal('GET');
            expect(result.headers).to.deep.equal({ x: 1 });
            expect(result.rewrite).to.equal('true');
            expect(result.body).to.equal('body');
            expect(result.url).to.equal('https://example.com/page');
        });

        it('should extract method from the first segment', () => {
            const result = PathvariableService.extractEdits('POST///body/https://example.com');
            expect(result.method).to.equal('POST');
        });

        it('should parse URL-encoded valid JSON headers', () => {
            const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer token' };
            const encoded = encodeURIComponent(JSON.stringify(headers));
            const result = PathvariableService.extractEdits(`GET/${encoded}/false/body/https://example.com`);

            expect(result.headers).to.deep.equal(headers);
        });

        it('should return empty object for invalid JSON headers', () => {
            const encoded = encodeURIComponent('not-valid-json');
            const result = PathvariableService.extractEdits(`GET/${encoded}/false/body/https://example.com`);

            expect(result.headers).to.deep.equal({});
        });

        it('should return empty object for malformed URL-encoded headers', () => {
            const result = PathvariableService.extractEdits('GET/%ZZ/false/body/https://example.com');
            expect(result.headers).to.deep.equal({});
        });

        it('should leave headers undefined when headers segment is empty', () => {
            const result = PathvariableService.extractEdits('GET//false/body/https://example.com');
            expect(result.headers).to.be.undefined;
        });

        it('should extract rewrite from the third segment', () => {
            const result = PathvariableService.extractEdits('GET/%7B%7D/false/body/https://example.com');
            expect(result.rewrite).to.equal('false');
        });

        it('should leave rewrite undefined when rewrite segment is empty', () => {
            const result = PathvariableService.extractEdits('GET/%7B%7D//body/https://example.com');
            expect(result.rewrite).to.be.undefined;
        });

        it('should URL-decode the body segment', () => {
            const body = 'hello world & more';
            const encoded = encodeURIComponent(body);
            const result = PathvariableService.extractEdits(`GET/%7B%7D/false/${encoded}/https://example.com`);

            expect(result.body).to.equal(body);
        });

        it('should leave body undefined when body segment is empty', () => {
            const result = PathvariableService.extractEdits('GET/%7B%7D/false//https://example.com');
            expect(result.body).to.be.undefined;
        });

        it('should join remaining segments as URL and decode them', () => {
            const result = PathvariableService.extractEdits('GET/%7B%7D/false/body/https://example.com/path/to/resource');
            expect(result.url).to.equal('https://example.com/path/to/resource');
        });

        it('should handle URLs with multiple slashes', () => {
            const result = PathvariableService.extractEdits('GET/%7B%7D/false/body/https://example.com/a/b/c/d/e');
            expect(result.url).to.equal('https://example.com/a/b/c/d/e');
        });

        it('should handle URLs with query parameters', () => {
            const url = 'https://example.com/search?q=test&page=1';
            const encoded = encodeURIComponent(url);
            const result = PathvariableService.extractEdits(`GET/%7B%7D/false/body/${encoded}`);

            expect(result.url).to.equal(url);
        });

        it('should return empty string url when no URL segments exist', () => {
            const result = PathvariableService.extractEdits('GET/%7B%7D/false/body');
            expect(result.url).to.equal('');
        });

        it('should handle a minimal input with only method', () => {
            const result = PathvariableService.extractEdits('GET');

            expect(result.method).to.equal('GET');
            expect(result.headers).to.be.undefined;
            expect(result.rewrite).to.be.undefined;
            expect(result.body).to.be.undefined;
            expect(result.url).to.equal('');
        });

        it('should handle an empty string input', () => {
            const result = PathvariableService.extractEdits('');

            expect(result.method).to.equal('');
            expect(result.url).to.equal('');
        });

        it('should handle JSON-stringified body that is URL-encoded', () => {
            const bodyObj = { key: 'value' };
            const encoded = encodeURIComponent(JSON.stringify(bodyObj));
            const result = PathvariableService.extractEdits(`POST/%7B%7D/false/${encoded}/https://example.com`);

            expect(result.body).to.equal(JSON.stringify(bodyObj));
        });

        it('should parse headers with nested objects', () => {
            const headers = { nested: { a: 1, b: [2, 3] } };
            const encoded = encodeURIComponent(JSON.stringify(headers));
            const result = PathvariableService.extractEdits(`GET/${encoded}/false/body/https://example.com`);

            expect(result.headers).to.deep.equal(headers);
        });
    });

    describe('generatePath', () => {

        it('should generate path with body and headers', () => {
            const edits = {
                body: { key: 'value' },
                headers: { 'Content-Type': 'application/json' },
            };
            const result = PathvariableService.generatePath(edits);

            expect(result).to.equal(
                '/path-variable/GET/{"Content-Type":"application/json"}/false/{"key":"value"}/'
            );
        });

        it('should generate path with empty strings when body is absent', () => {
            const edits = {
                headers: { 'X-Custom': 'test' },
            };
            const result = PathvariableService.generatePath(edits);

            expect(result).to.equal('/path-variable/GET/{"X-Custom":"test"}/false//');
        });

        it('should generate path with empty strings when headers is absent', () => {
            const edits = {
                body: { data: 123 },
            };
            const result = PathvariableService.generatePath(edits);

            expect(result).to.equal('/path-variable/GET//false/{"data":123}/');
        });

        it('should generate path with empty strings when both body and headers are absent', () => {
            const edits = {};
            const result = PathvariableService.generatePath(edits);

            expect(result).to.equal('/path-variable/GET//false//');
        });

        it('should generate path with empty string when body is null', () => {
            const edits = { body: null, headers: null };
            const result = PathvariableService.generatePath(edits);

            expect(result).to.equal('/path-variable/GET//false//');
        });

        it('should generate path with empty string when body is an empty string', () => {
            const edits = { body: '', headers: '' };
            const result = PathvariableService.generatePath(edits);

            expect(result).to.equal('/path-variable/GET//false//');
        });

        it('should stringify a string body value', () => {
            const edits = { body: 'raw text' };
            const result = PathvariableService.generatePath(edits);

            expect(result).to.equal('/path-variable/GET//false/"raw text"/');
        });

        it('should stringify array body and headers', () => {
            const edits = { body: [1, 2, 3], headers: ['a', 'b'] };
            const result = PathvariableService.generatePath(edits);

            expect(result).to.equal('/path-variable/GET/["a","b"]/false/[1,2,3]/');
        });

        it('should always use GET and false in the generated path', () => {
            const edits = { method: 'POST', rewrite: 'true', body: 'x', headers: 'y' };
            const result = PathvariableService.generatePath(edits);

            expect(result).to.include('/path-variable/GET/');
            expect(result).to.include('/false/');
        });
    });
});
