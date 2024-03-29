import fetch from "node-fetch";
import AlterationService from "./alteration-service.js";
import {Readable} from "stream"

export default class RestService {

    /**
     * Fetches the provided URL by applying the requested edits
     * @param requestedUrl url to fetch
     * @param requestEdits edits applied to the request to be made
     * @param responseEdits edits applied to the fetch response
     * @returns {Promise<Readable|NodeJS.ReadableStream>} edited fetch response
     */
    static async fetchAndEdit(requestedUrl, requestEdits, responseEdits) {
        return await fetch(requestedUrl, {
            method: requestEdits.method ?? 'GET',
            headers: requestEdits.headers
        }).then(async originalResponse => {

            // if no edit is needed, return the original body
            if (!AlterationService.isBodyEditNecessary(responseEdits)) {
                return originalResponse.body;
            }

            // edit the body as needed
            let bodyString = await originalResponse.text();
            bodyString = this._rewriteUrls(requestedUrl, responseEdits, bodyString);
            bodyString = this._htmlAppend(responseEdits, bodyString);
            bodyString = this._htmlPrepend(responseEdits, bodyString);
            bodyString = this._regexReplace(responseEdits, bodyString);

            // convert the body back to a stream
            return this._toReadableStream(bodyString);
        }).catch(originResponse => {
            //TODO: different error behaviours (text, json, httpcats, statuscode)
            return this._toReadableStream(originResponse.message);
        });
    }

    /**
     * Checks if it's necessary to rewrite urls, and does it
     * @param requestedUrl original url of the request
     * @param responseEdits body edit configs
     * @param bodyString response body to edit
     * @returns {string} string that contains the original/edited body as needed
     * @private
     */
    static _rewriteUrls(requestedUrl, responseEdits, bodyString) {
        if (String(responseEdits.body.rewriteUrls) === "true") {
            //TODO: use same method as the original request
            const newUrl = responseEdits.baseUrl + '/path-variable/' + requestedUrl;
            return AlterationService.rewriteUrls(bodyString, requestedUrl, newUrl);
        }
        return bodyString;
    }

    /**
     * Checks if it's necessary to prepend to the HTML body, and does it
     * @param responseEdits body edit configs
     * @param bodyString response body to edit
     * @returns {string}
     * @private
     */
    static _htmlPrepend(responseEdits, bodyString) {
        const selector = responseEdits.body.htmlPrependSelector;
        const value = responseEdits.body.htmlPrependValue;
        if (selector && value) {
            return AlterationService.htmlPrepend(bodyString, selector, value);
        }
        return bodyString;
    }

    /**
     * Checks if it's necessary to append to the HTML body, and does it
     * @param responseEdits body edit configs
     * @param bodyString response body to edit
     * @returns {string}
     * @private
     */
    static _htmlAppend(responseEdits, bodyString) {
        const selector = responseEdits.body.htmlAppendSelector;
        const value = responseEdits.body.htmlAppendValue;
        if (selector && value) {
            return AlterationService.htmlAppend(bodyString, selector, value);
        }
        return bodyString;
    }

    /**
     * Checks if it's necessary to regex replace the body, and does it
     * @param responseEdits body edit configs
     * @param bodyString response body to edit
     * @returns {string}
     * @private
     */
    static _regexReplace(responseEdits, bodyString) {
        const expression = responseEdits.body.regexReplaceExpression;
        const value = responseEdits.body.regexReplaceValue;
        if (expression && value) {
            return AlterationService.regexReplace(bodyString, expression, value);
        }
        return bodyString;
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