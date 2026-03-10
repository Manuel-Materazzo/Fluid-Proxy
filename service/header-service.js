export default class HeaderService {
    static extractRequestEdits(headers, defaultMethod) {

        let url;
        if (headers["requesturl"]) {
            url = headers["requesturl"];
        }

        let requestHeaders;
        if (headers["requestheaders"]) {
            try {
                requestHeaders = JSON.parse(headers["requestheaders"]);
            } catch {
                requestHeaders = {};
            }
        }

        let body;
        if (headers["requestbody"]) {
            body = headers["requestbody"];
        }

        return {
            url,
            headers: requestHeaders,
            body,
            method: headers["requestmethod"] ?? defaultMethod,
        }
    }

    static extractResponseEdits(baseUrl, headers) {

        let responseHeaders;
        if (headers["responseheaders"]) {
            try {
                responseHeaders = JSON.parse(headers["responseheaders"]);
            } catch {
                responseHeaders = {};
            }
        }

        let htmlAppend;
        if (headers["responsebodyhtmlappend"]) {
            try {
                htmlAppend = JSON.parse(headers["responsebodyhtmlappend"]);
            } catch {
                htmlAppend = {};
            }
        }

        let htmlPrepend;
        if (headers["responsebodyhtmlprepend"]) {
            try {
                htmlPrepend = JSON.parse(headers["responsebodyhtmlprepend"]);
            } catch {
                htmlPrepend = {};
            }
        }

        let regexReplace;
        if (headers["responsebodyregexreplace"]) {
            try {
                regexReplace = JSON.parse(headers["responsebodyregexreplace"]);
            } catch {
                regexReplace = {};
            }
        }


        return {
            baseUrl: baseUrl,
            headers: responseHeaders,
            body: {
                rewriteUrls: headers["responserewriteurls"],
                proxyUrlsAttributeOnly: headers["responseproxyurlsattributeonly"] !== 'false',
                htmlAppend,
                htmlPrepend,
                regexReplace
            }
        }
    }

    static extractErrorEdits(headers) {
        return {
            alwaysok: headers["errorstatusalwaysok"],
            responseType: headers["errorresponsetype"]
        }
    }
}
