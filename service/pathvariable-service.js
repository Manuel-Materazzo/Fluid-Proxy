export default class PathvariableService {
    static extractEdits(requestUrl) {

        const pathVariables = requestUrl.split("/");

        let headers;
        if (pathVariables?.[1]?.length > 0) {
            headers = JSON.parse(decodeURIComponent(pathVariables[1]));
        }

        let rewrite;
        if (pathVariables?.[2]?.length > 0) {
            rewrite = pathVariables[2];
        }

        let body;
        if (pathVariables?.[3]?.length > 0) {
            body = JSON.parse(decodeURIComponent(pathVariables[3]));
        }

        const url = decodeURIComponent(pathVariables.slice(4).join("/"));

        return  {
            url,
            rewrite,
            headers,
            body,
            method: pathVariables?.[0],
        }
    }
}