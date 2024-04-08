import converter from "rel-to-abs";
import {parse} from "node-html-parser"

export default class AlterationService {

    /**
     * Evaluates the necessity of editing the response body with the provided configs
     * @param headers response headers
     * @param responseEdits response edit configs
     * @returns {boolean}
     */
    static isBodyEditNecessary(headers, responseEdits) {
        let bodyEdit = false;

        if (headers['content-type']?.includes('image')) {
            return bodyEdit;
        }

        for (const [key, value] of Object.entries(responseEdits?.body ?? {})) {
            // ignore "false" properties to avoid conversion when option is disabled
            if (String(value) === "false") {
                continue;
            }
            bodyEdit = bodyEdit || !!value;
        }
        return bodyEdit;
    }

    /**
     * Extracts the originalResponse headers, and adds/replaces the ones passed
     * @param originalResponse response to extract base headers
     * @param headers headers to add to the base headers
     * @returns {*} header object
     */
    static getResponseHeaders(originalResponse, headers) {

        const responseHeaders = {};

        // add all headers of the original response
        for (const [key, value] of Object.entries(originalResponse.headers?.raw() ?? {})) {
            responseHeaders[key] = value[0];
        }

        // remove gzip headers
        delete responseHeaders['content-encoding'];
        // remove iframe locking
        delete responseHeaders['x-frame-options'];
        delete responseHeaders['x-content-type-options'];
        // remove content length, it may vary from the final response
        delete responseHeaders['content-length'];

        // replace cors headers
        responseHeaders['Access-Control-Allow-Origin'] = '*';
        responseHeaders['Access-Control-Allow-Credentials'] = false;
        responseHeaders['Access-Control-Allow-Headers'] = 'Content-Type';

        // add custom headers
        for (const [key, value] of Object.entries(headers ?? {})) {
            responseHeaders[key] = value;
        }

        return responseHeaders;
    }

    /**
     * Parses the provided html string and appends the provided element as last child of the selector
     * @param htmlString the html document to parse
     * @param selector the css selector of the element to append to
     * @param value the html element to append as last child of selector
     * @returns {string}
     */
    static htmlAppend(htmlString, selector, value) {
        const document = parse(htmlString)
        const elements = document.querySelectorAll(selector);
        const newElement = parse(value);
        elements.forEach(element => element.appendChild(newElement));
        return document.toString();
    }

    /**
     * Parses the provided html string and prepend the provided element as first child of the selector
     * @param htmlString the html document to parse
     * @param selector the css selector of the element to append to
     * @param value the html element to prepend as last first of selector
     * @returns {string}
     */
    static htmlPrepend(htmlString, selector, value) {
        const document = parse(htmlString)
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => element.insertAdjacentHTML('beforebegin', value));
        return document.toString();
    }

    static regexReplace(source, regex, replacement) {
        return source.replaceAll(regex, replacement);
    }

    /**
     * Replaces all relative urls with absolute urls
     * @param htmlString HTML response to edit
     * @param oldUrl url to search (auto-discovers relative urls)
     * @param newUrlStart url to replace oldUrl with
     * @returns {string} string containing the edited body
     */
    static rewriteUrls(htmlString, oldUrl) {
        // remove anchors and query params
        oldUrl = oldUrl.split('#')[0];
        oldUrl = oldUrl.split('?')[0];

        // remove trailing "/", it gets added by relative paths
        if (oldUrl.endsWith('/')) {
            oldUrl = oldUrl.substring(0, oldUrl.length - 1)
        }

        return converter.convert(htmlString, oldUrl);
    }

    /**
     * Replaces all URLs on the provided HTML text with the provided url
     * @param htmlString HTML response to edit
     * @param oldUrl url to search (auto-discovers relative urls)
     * @param newUrlStart url to replace oldUrl with
     * @returns {string} string containing the edited body
     */
    static proxyUrls(htmlString, oldUrl, newUrlStart) {
        return htmlString.replaceAll("../", "/")
            .replaceAll("http://", newUrlStart + "http://")
            .replaceAll("https://", newUrlStart + "https://");
    }

}