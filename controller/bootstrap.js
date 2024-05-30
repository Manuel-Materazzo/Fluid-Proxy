'use strict';

import fs from "fs";
import RestService from "../service/rest-service.js"
import QueryparamService from "../service/queryparam-service.js";
import PathvariableService from "../service/pathvariable-service.js";
import HeaderService from "../service/header-service.js";

const index = fs.readFileSync('index.html', 'utf8');
const style = fs.readFileSync('style.css', 'utf8');
const requestGenerator = fs.readFileSync('request-generator.js', 'utf8');

export default app => {

    app.all('/', (req, res) => {
        res.send(index);
    });

    app.get('/style.css', (req, res) => {
        res.setHeader('content-type', 'text/css');
        res.send(style);
    });

    app.get('/request-generator.js', (req, res) => {
        res.setHeader('content-type', 'application/javascript');
        res.send(requestGenerator);
    });

    app.all('/header', async (req, res) => {
        const baseUrl = '//' + req.get('host');

        const requestEdits = HeaderService.extractRequestEdits(req.headers, req.method);
        const responseEdits = HeaderService.extractResponseEdits(baseUrl, req.headers);
        const errorEdits = HeaderService.extractErrorEdits(req.headers);

        const requestedUrl = requestEdits.url;

        const response = await RestService.fetchAndEdit(requestedUrl, requestEdits, responseEdits, errorEdits);

        res.set(response.headers);
        res.status(response.status);
        response.body.pipe(res);
    });

    app.all('/queryparam', async (req, res) => {
        const requestedUrl = req.query.url
        const baseUrl = '//' + req.get('host');

        const requestEdits = QueryparamService.extractRequestEdits(req.query, req.method);
        const responseEdits = QueryparamService.extractResponseEdits(baseUrl, req.query);
        const errorEdits = QueryparamService.extractErrorEdits(req.query);

        const response = await RestService.fetchAndEdit(requestedUrl, requestEdits, responseEdits, errorEdits);

        res.set(response.headers);
        res.status(response.status);
        response.body.pipe(res);
    });


    app.all('/path-variable/*', async (req, res) => {

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

        const response = await RestService.fetchAndEdit(requestedUrl, edits, responseEdits, errorEdits);

        res.set(response.headers);
        res.status(response.status);
        response.body.pipe(res);
    });

    // fallback for urls it fails to rewrite, just rethrow the request to another controller
    app.all('/*', async (req, res) => {

        const referer = req.headers['referer'] ?? '';

        let requestedUri = req.url;

        // slice away the initial "/", if it gets added by the referer
        if (referer.endsWith('/')) {
            requestedUri = requestedUri.slice(1);
        }

        // add the uri to the referer url, it should produce a valid proxied request
        const requestedUrl = referer + requestedUri;

        console.info("Got an invalid request for: " + requestedUri + " , falling back to: " + requestedUrl);

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
        response.body.pipe(res);
    });
};
