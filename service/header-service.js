export default class HeaderService {
    static extractRequestEdits(headers) {

        let url;
        if (headers["host"]) {
            url = headers["host"];
        }

        let requestHeaders;
        if (headers["requestheaders"]) {
            requestHeaders = JSON.parse(headers["requestheaders"]);
        }

        let body;
        if (headers["requestbody"]) {
            body = JSON.parse(headers["requestbody"]);
        }

        return {
            url,
            requestHeaders,
            body,
            method: headers["requestmethod"],
        }
    }

    static extractResponseEdits(baseUrl, headers) {

        let responseHeaders;
        if (headers["responseheaders"]) {
            responseHeaders = JSON.parse(headers["responseheaders"]);
        }

        let htmlAppend;
        if (headers["responsebodyhtmlappend"]) {
            htmlAppend = JSON.parse(headers["responsebodyhtmlappend"]);
        }

        let htmlPrepend;
        if (headers["responsebodyhtmlprepend"]) {
            htmlPrepend = JSON.parse(headers["responsebodyhtmlprepend"]);
        }

        let regexReplace;
        if (headers["responsebodyregexreplace"]) {
            regexReplace = JSON.parse(headers["responsebodyregexreplace"]);
        }


        return {
            baseUrl: baseUrl,
            responseHeaders,
            body: {
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