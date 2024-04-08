import fetch from "node-fetch";
import AlterationService from "./alteration-service.js";
import {Readable} from "stream"
import PathvariableService from "./pathvariable-service.js";

export default class RestService {

    /**
     * Fetches the provided URL by applying the requested edits
     * @param requestedUrl url to fetch
     * @param requestEdits edits applied to the request to be made
     * @param responseEdits edits applied to the fetch response
     * @returns {Promise<{headers: *, body: Readable}>} edited fetch response body and headers
     */
    static async fetchAndEdit(requestedUrl, requestEdits, responseEdits) {
        return await fetch(requestedUrl, {
            method: requestEdits.method ?? 'GET',
            headers: requestEdits.headers
        }).then(async originalResponse => {

            const headers = AlterationService.getResponseHeaders(originalResponse, responseEdits.headers);

            // if no edit is needed, return the original body
            if (!AlterationService.isBodyEditNecessary(headers, responseEdits)) {
                return {
                    headers,
                    body: originalResponse.body
                };
            }

            // edit the body as needed
            let bodyString = await originalResponse.text();
            bodyString = this._rewriteUrls(requestedUrl,requestEdits, responseEdits, headers, bodyString);
            bodyString = this._htmlAppend(responseEdits, bodyString);
            bodyString = this._htmlPrepend(responseEdits, bodyString);
            bodyString = this._regexReplace(responseEdits, bodyString);

            // convert the body back to a stream
            return {
                headers,
                body: this._toReadableStream(bodyString)
            };
        }).catch(originResponse => {
            //TODO: different error behaviours (text, json, httpcats, statuscode)
            return {
                headers: AlterationService.getResponseHeaders(originResponse, responseEdits.headers),
                body: this._toReadableStream(originResponse.message)
            };
        });
    }

    /**
     * Checks if it's necessary to rewrite urls, and does it
     * @param requestedUrl original url of the request
     * @param requestEdits
     * @param responseEdits body edit configs
     * @param headers response headers
     * @param bodyString response body to edit
     * @returns {string} string that contains the original/edited body as needed
     * @private
     */
    static _rewriteUrls(requestedUrl, requestEdits, responseEdits, headers, bodyString) {

        // not html, skip rewrite
        if (!headers['content-type']?.includes("html")) {
            return bodyString
        }

        // rewrite absolute urls
        //TODO: assets/images/cards/total_eclipse.png not rewrited
        bodyString = AlterationService.rewriteUrls(bodyString, requestedUrl);

        // if rewriting is disabled, skip url proxying
        if (String(responseEdits.body.rewriteUrls) !== "true") {
            return bodyString;
        }

        const newUrlStart = responseEdits.baseUrl + PathvariableService.generatePath(requestEdits);
        return AlterationService.proxyUrls(bodyString, requestedUrl, newUrlStart);
    }

    /**
     * Checks if it's necessary to prepend to the HTML body, and does it
     * @param responseEdits body edit configs
     * @param bodyString response body to edit
     * @returns {string}
     * @private
     */
    static _htmlPrepend(responseEdits, bodyString) {
        // extracts an object with keys = css selectors and values = html elements
        // for each selector in the element, edit the body accordingly
        let editedBody = bodyString;
        for (const [selector, value] of Object.entries(responseEdits?.body?.htmlPrepend ?? {})) {
            editedBody = AlterationService.htmlPrepend(editedBody, selector, value);
        }

        return editedBody;
    }

    /**
     * Checks if it's necessary to append to the HTML body, and does it
     * @param responseEdits body edit configs
     * @param bodyString response body to edit
     * @returns {string}
     * @private
     */
    static _htmlAppend(responseEdits, bodyString) {
        // extracts an object with keys = css selectors and values = html elements
        // for each selector in the element, edit the body accordingly
        let editedBody = bodyString;
        for (const [selector, value] of Object.entries(responseEdits?.body?.htmlAppend ?? {})) {
            editedBody = AlterationService.htmlAppend(editedBody, selector, value);
        }

        return editedBody;
    }

    /**
     * Checks if it's necessary to regex replace the body, and does it
     * @param responseEdits body edit configs
     * @param bodyString response body to edit
     * @returns {string}
     * @private
     */
    static _regexReplace(responseEdits, bodyString) {
        // extracts an object with keys = css selectors and values = html elements
        // for each selector in the element, edit the body accordingly
        let editedBody = bodyString;
        for (const [expression, replaceValue] of Object.entries(responseEdits?.body?.regexReplace ?? {})) {
            editedBody = AlterationService.regexReplace(editedBody, expression, replaceValue);
        }

        return editedBody;
    }


    /**
     * Converts a string to a express-compatible ReadableStream
     * @param value string to be converted
     * @returns {Readable} express-compatible ReadableStream
     * @private
     */
    static _toReadableStream(value) {
        return Readable.from(value);
    }
}