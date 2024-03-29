export default class QueryparamService {
    static extractRequestEditsFromQueryparams(params) {

        let headers;
        if (params.requestHeaders) {
            headers = JSON.parse(params.requestHeaders);
        }

        let body;
        if (params.requestBody) {
            body = JSON.parse(params.requestBody);
        }

        return  {
            headers,
            body,
            method: params.requestMethod,
        }
    }

    static extractResponseEditsFromQueryparams(baseUrl, params) {

        let headers;
        if (params.responseHeaders) {
            headers = JSON.parse(params.responseHeaders);
        }

        let htmlAppend;
        if (params.responseBodyHtmlAppend) {
            htmlAppend = JSON.parse(params.responseBodyHtmlAppend);
        }

        let htmlPrepend;
        if (params.responseBodyHtmlPrepend) {
            htmlPrepend = JSON.parse(params.responseBodyHtmlPrepend);
        }

        let regexReplace;
        if (params.responseBodyRegexReplace) {
            regexReplace = JSON.parse(params.responseBodyRegexReplace);
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
}