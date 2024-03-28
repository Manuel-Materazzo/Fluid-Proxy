import converter from "rel-to-abs";

export default class AlterationService {

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

    static async rewriteUrls(originalResponse, oldUrl, newUrl) {
        return converter.convert(await originalResponse.text(), oldUrl)
                    .replace(oldUrl, newUrl);
    }

}