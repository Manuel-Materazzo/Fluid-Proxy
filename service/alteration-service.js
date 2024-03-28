import converter from "rel-to-abs";

export default class AlterationService {

    /**
     * Extracts the originalResponse headers, and adds/replaces the ones passed
     * @param originalResponse response to extract base headers
     * @param headers headers to add to the base headers
     * @returns {*} header object
     */
    static getResponseHeaders(originalResponse, headers) {
        // add all headers of the original response but content-encoding. gzip is trouble.
        const responseHeaders = {...originalResponse.headers};
        delete responseHeaders['content-encoding'];

        // replace cors headers
        responseHeaders['Access-Control-Allow-Origin'] = '*';
        responseHeaders['Access-Control-Allow-Credentials'] = false;
        responseHeaders['Access-Control-Allow-Headers'] = 'Content-Type';

        // add custom headers
        for (const [key, value] of Object.entries(headers)) {
            responseHeaders[key] = value;
        }
        return responseHeaders;
    }

    /**
     * Replaces all URLs on the response with the provided url
     * @param originalResponse response to edit
     * @param oldUrl url to search (auto-discovers relative urls)
     * @param newUrl url to replace oldUrl with
     * @returns {Promise<string>} String containing the edited body
     */
    static async rewriteUrls(originalResponse, oldUrl, newUrl) {
        return converter.convert(await originalResponse.text(), oldUrl)
                    .replace(oldUrl, newUrl);
    }

}