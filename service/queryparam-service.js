export default class QueryparamService {
    static extractRequestEdits(params, defaultMethod) {

        let headers;
        if (params.requestHeaders) {
            try {
                headers = JSON.parse(params.requestHeaders);
            } catch {
                headers = {};
            }
        }

        let body;
        if (params.requestBody) {
            body = params.requestBody;
        }

        return  {
            headers,
            body,
            method: params.requestMethod ?? defaultMethod,
        }
    }

    static extractResponseEdits(baseUrl, params) {

        let headers;
        if (params.responseHeaders) {
            try {
                headers = JSON.parse(params.responseHeaders);
            } catch {
                headers = {};
            }
        }

        let htmlAppend;
        if (params.responseBodyHtmlAppend) {
            try {
                htmlAppend = JSON.parse(params.responseBodyHtmlAppend);
            } catch {
                htmlAppend = {};
            }
        }

        let htmlPrepend;
        if (params.responseBodyHtmlPrepend) {
            try {
                htmlPrepend = JSON.parse(params.responseBodyHtmlPrepend);
            } catch {
                htmlPrepend = {};
            }
        }

        let regexReplace;
        if (params.responseBodyRegexReplace) {
            try {
                regexReplace = JSON.parse(params.responseBodyRegexReplace);
            } catch {
                regexReplace = {};
            }
        }


        return  {
            baseUrl: baseUrl,
            headers,
            body: {
                rewriteUrls: params.responseRewriteUrls,
                htmlAppend,
                htmlPrepend,
                regexReplace
            }
        }
    }

    static extractErrorEdits(params) {
        return  {
            alwaysok: params.errorStatusAlwaysOk,
            responseType: params.errorResponseType
        }
    }
}
