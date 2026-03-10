'use strict';

import RestService from "../service/rest-service.js"
import QueryparamService from "../service/queryparam-service.js";
import PathvariableService from "../service/pathvariable-service.js";
import HeaderService from "../service/header-service.js";
import UrlValidationService from "../service/url-validation-service.js";

export default app => {

    app.all('/header', async (req, res, next) => {
        try {
            const baseUrl = '//' + req.get('host');

            const requestEdits = HeaderService.extractRequestEdits(req.headers, req.method);
            const responseEdits = HeaderService.extractResponseEdits(baseUrl, req.headers);
            const errorEdits = HeaderService.extractErrorEdits(req.headers);

            const requestedUrl = requestEdits.url;

            await UrlValidationService.validate(requestedUrl);

            const response = await RestService.fetchAndEdit(requestedUrl, requestEdits, responseEdits, errorEdits);

            res.set(response.headers);
            res.status(response.status);
            if (response.body) {
                response.body.pipe(res);
            } else {
                res.end();
            }
        } catch (err) {
            next(err);
        }
    });

    app.all('/queryparam', async (req, res, next) => {
        try {
            const requestedUrl = req.query.url
            const baseUrl = '//' + req.get('host');

            const requestEdits = QueryparamService.extractRequestEdits(req.query, req.method);
            const responseEdits = QueryparamService.extractResponseEdits(baseUrl, req.query);
            const errorEdits = QueryparamService.extractErrorEdits(req.query);

            await UrlValidationService.validate(requestedUrl);

            const response = await RestService.fetchAndEdit(requestedUrl, requestEdits, responseEdits, errorEdits);

            res.set(response.headers);
            res.status(response.status);
            if (response.body) {
                response.body.pipe(res);
            } else {
                res.end();
            }
        } catch (err) {
            next(err);
        }
    });


    app.all('/path-variable/*', async (req, res, next) => {
        try {
            // slice away the "/path-variable/" part and parse path variables
            const edits = PathvariableService.extractEdits(req.url.slice(15));
            const requestedUrl = edits.url;

            const responseEdits = {
                baseUrl: '//' + req.get('host'),
                headers: {},
                body: {
                    rewriteUrls: edits.rewrite,
                }
            };

            const errorEdits = {
                alwaysok: false,
                responseType: "text"
            }

            await UrlValidationService.validate(requestedUrl);

            const response = await RestService.fetchAndEdit(requestedUrl, edits, responseEdits, errorEdits);

            res.set(response.headers);
            res.status(response.status);
            if (response.body) {
                response.body.pipe(res);
            } else {
                res.end();
            }
        } catch (err) {
            next(err);
        }
    });

    // fallback for urls it fails to rewrite, just rethrow the request to another controller
    app.all('/*', async (req, res, next) => {
        try {
            const referer = req.headers['referer'] ?? '';

            // only handle fallback if referer contains a proxied URL pattern
            if (!referer.includes('/queryparam') && !referer.includes('/path-variable/') && !referer.includes('/header')) {
                res.status(404).send('Not found');
                return;
            }

            let requestedUri = req.url;

            // slice away the initial "/", if it gets added by the referer
            if (referer.endsWith('/')) {
                requestedUri = requestedUri.slice(1);
            }

            // add the uri to the referer url, it should produce a valid proxied request
            const requestedUrl = referer + requestedUri;

            console.info("Got an invalid request for: " + requestedUri + " , falling back to: " + requestedUrl);

            await UrlValidationService.validate(requestedUrl);

            const requestEdits = {
                url: requestedUrl,
                headers: {},
                body: {},
                method: 'GET',
            }

            const responseEdits = {
                baseUrl: '//' + req.get('host'),
                headers: {},
                body: {
                    rewriteUrls: false,
                }
            };

            const errorEdits = {
                alwaysok: false,
                responseType: "text"
            }

            const response = await RestService.fetchAndEdit(requestedUrl, requestEdits, responseEdits, errorEdits);

            res.set(response.headers);
            res.status(response.status);
            if (response.body) {
                response.body.pipe(res);
            } else {
                res.end();
            }
        } catch (err) {
            next(err);
        }
    });
};
