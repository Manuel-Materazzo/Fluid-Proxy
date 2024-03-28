'use strict';

import RestService from "../service/rest-service.js"

export default app => {


    app.get('/path-variable/*', async (req, res) => {

        let requestedUrl = req.url.slice(15);

        console.info(requestedUrl);

        let headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36'
        };

        // if the request does not start with an url
        if (!requestedUrl.startsWith("http")) {
            // extract the first part of the request url
            const urlParts = requestedUrl.split('/');
            const serializedHeaders = urlParts[0];
            requestedUrl = urlParts.slice(1).join("/");

            // supposedly, the first part should contain "&" separated headers to put on the request
            serializedHeaders.split("&").forEach(serializedHeader => {
                const header = serializedHeader.split("=");
                const key = decodeURIComponent(header[0]);
                const value = decodeURIComponent(header[1]);
                headers[key] = value;
            })
        }

        const requestEdits = {
            headers: headers,
            method: req.query.requestMethod,
            body: req.query.requestBody,
        }

        const responseEdits = {
            baseUrl: '//' + req.get('host'),
            headers: {},
            rewriteUrls: req.headers['url-rewriting'],
            // bodyPrepend: req.query.responseBodyPrepend,
            // bodyAppend: req.query.responseBodyAppend,
            // bodyHtmlHeadAppend: req.query.responseBodyHtmlHeadAppend,
            // bodyHtmlBodyAppend: req.query.responseBodyHtmlBodyAppend,
        }

        const responseBody = await RestService.fetchAndEdit(requestedUrl, requestEdits, responseEdits);

        responseBody.pipe(res);

    });
};
