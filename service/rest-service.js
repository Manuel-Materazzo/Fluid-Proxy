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
            if (String(responseEdits.rewriteUrls) === "true") {
                const newUrl = responseEdits.baseUrl + '/path-variable/' + requestedUrl;
                const rewrittenBody = await AlterationService.rewriteUrls(originalResponse, requestedUrl, newUrl);
                return this._toReadableStream(rewrittenBody);
            } else {
                return originalResponse.body;
            }
        }).catch(originResponse => {
            return this._toReadableStream(originResponse.message);
        });
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