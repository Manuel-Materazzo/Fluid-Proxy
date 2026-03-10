'use strict';

import express from "express";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import cluster from "cluster";
import os from "os";
import bootstrap from './controller/bootstrap.js';
import apicache from 'apicache'

const app = express();
const numCPUs = os.cpus().length;

app.use(compression());
app.set('x-powered-by', false);
app.use(cors());

// configurable input size limits
app.use(express.json({ limit: process.env.BODY_SIZE_LIMIT || '1mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.BODY_SIZE_LIMIT || '1mb', parameterLimit: parseInt(process.env.PARAMETER_LIMIT || '100') }));

// configurable rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests, please try again later.',
});
app.use(limiter);

// serve static files, cache for 10 hours by default
app.use(express.static('public', {
    maxAge: process.env.CACHE_DURATION ?? '10h',
}));

// cache proxy responses
app.use(apicache.middleware(process.env.CACHE_DURATION ?? '10 hours'));

function clusterApp() {
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', worker => console.error(`worker ${worker.process.pid} died`));

    console.info("Fluid Proxy listening on port 3000 with " + numCPUs + " threads.")
}

if (cluster.isWorker) {
    bootstrap(app);
    app.listen(process.env.PORT || 3000);
} else {
    clusterApp();
}

export default app
