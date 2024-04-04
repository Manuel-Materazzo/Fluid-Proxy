'use strict';

import fs from "fs";
import RestService from "../service/rest-service.js"
import QueryparamService from "../service/queryparam-service.js";
import PathvariableService from "../service/pathvariable-service.js";

const index = fs.readFileSync('index.html', 'utf8');
const style = fs.readFileSync('style.css', 'utf8');
const requestGenerator = fs.readFileSync('request-generator.js', 'utf8');

export default app => {

    app.get('/', (req, res) => {
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

    app.get('/queryparam', async (req, res) => {
        const requestedUrl = req.query.url
        const baseUrl = '//' + req.get('host');

        const requestEdits = QueryparamService.extractRequestEdits(req.query);
        const responseEdits = QueryparamService.extractResponseEdits(baseUrl, req.query);

        console.info(requestedUrl);

        const response = await RestService.fetchAndEdit(requestedUrl, requestEdits, responseEdits);

        res.set(response.headers);
        response.body.pipe(res);
    });


    app.get('/path-variable/*', async (req, res) => {

        // slice away the "/path-variable/" part and parse path variables
        const edits = PathvariableService.extractEdits(req.url.slice(15));
        const requestedUrl = edits.url;

        console.info(requestedUrl);

        const responseEdits = {
            baseUrl: '//' + req.get('host'),
            headers: {},
            body: {
                rewriteUrls: edits.rewrite,
            }
        };

        const response = await RestService.fetchAndEdit(requestedUrl, edits, responseEdits);

        res.set(response.headers);
        response.body.pipe(res);
    });
};
