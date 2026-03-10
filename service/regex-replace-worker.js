import { workerData, parentPort } from "node:worker_threads";

try {
    const { source, pattern, replacement } = workerData;
    const re = new RegExp(pattern, "g");
    const result = source.replace(re, replacement);
    parentPort.postMessage({ ok: true, result });
} catch (error) {
    parentPort.postMessage({ ok: false, error: { message: error.message } });
}
