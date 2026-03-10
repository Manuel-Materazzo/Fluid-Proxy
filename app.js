'use strict';

import express from "express";
import cors from "cors";
import compression from "compression";
import cluster from "cluster";
import os from "os";
import bootstrap from './controller/bootstrap.js';
import apicache from 'apicache'

const app = express();
const numCPUs = os.cpus().length;

app.use(compression());
app.set('x-powered-by', false);
app.use(cors());

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
