import fetch from "node-fetch";
import AlterationService from "./alteration-service.js";
import { Readable } from "stream"

export default class RestService {
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

    static _toReadableStream(value) {
        return Readable.from(value);
    }
}