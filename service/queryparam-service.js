export default class QueryparamService {
    static extractRequestEditsFromQueryparams(params) {

        let headers = undefined;
        if (params.requestHeaders) {
            headers = JSON.parse(params.requestHeaders);
        }

        let body = undefined;
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

        let headers = undefined;
        if (params.responseHeaders) {
            headers = JSON.parse(params.responseHeaders);
        }

        return  {
            baseUrl: baseUrl,
            headers,
            body: {
                rewriteUrls: params.responseRewriteUrls,
                htmlAppendSelector: params.responseBodyHtmlAppendSelector,
                htmlAppendValue: params.responseBodyHtmlAppendValue,
                htmlPrependSelector: params.responseBodyHtmlPrependSelector,
                htmlPrependValue: params.responseBodyHtmlPrependValue,
                regexReplaceExpression: params.responseBodyRegexReplaceExpression,
                regexReplaceValue: params.responseBodyRegexReplaceValue
            }
        }
    }
}