# Fluid Proxy

Fluid Proxy is a versatile HTTP/HTTPS proxy docker container built with Node.js designed to manipulate web requests and responses dynamically.

Comes with permissive CORS and X-Frame-Options for all your online mischiefs.

This project is designed to be deployed as a development tool or on a home server.\
When deploying this in a production environment, it’s crucial to secure this service with strict firewall and access permissions. Otherwise, anyone could potentially route content through your server.

## Features

- **Edit Request Methods**: Execute a `GET`, `POST`, `PUT`, `PATCH`, or `DELETE` web request by simply calling a standard endpoint.
- **Edit Request Body**: Easily add a body to your request by incorporating it into the URL.
- **Edit Request Headers**: Conveniently add headers to your request by including them in the URL.
- **Edit Response Headers**: Gain the ability to modify the headers of the fetch response.
- **Edit Response HTML Body**: Edit the remote response by appending/prepending any element.
- **Edit Response Regex Body**: Replace text in the fetch response body using regex expressions.
- **Response Url rewrite**: Redirect URLs in the fetch response to point to the proxy for seamless integration.
- **Works with images**: Unless you apply a response edit, images will be proxied and served unaltered.

## Potential Use cases
- Bypass CORS restrictions for unrestricted cross-origin resource sharing.
- Overcome X-Frame-Options limitations for more flexible web page framing.
- Add headers or a body to a request in contexts where they are typically not allowed (e.g., within an img or link tag).
- Make a POST request with headers and body using the browser search bar or any service that only supports GET requests.
- Inject CSS and JavaScript into a page for embedding in an iframe, enhancing the functionality and appearance of the embedded content.


## Usage
To get started, deploy Fluid Proxy following the steps below and compose your first request with using the 
**Request Generator** on http://localhost:3000/.

You can find the complete documentation on endpoints and parameters on the project's wiki:
* [Using Query Params (Recommended)](https://github.com/Manuel-Materazzo/Fluid-Proxy/wiki/Using-Query-Params)
* [Using Headers (http/https proxy standard compliant)](https://github.com/Manuel-Materazzo/Fluid-Proxy/wiki/Using-Headers)
* [Using Path Variables](https://github.com/Manuel-Materazzo/Fluid-Proxy/wiki/Using-Path-Variables)

## Deploying

### Docker(hub)

TBD

### Docker(source)

```shell
$ git clone https://github.com/Manuel-Materazzo/Fluid-Proxy.git && cd Fluid-Proxy
$ docker build -t fluid-proxy .
$ docker run --restart=always -d -p 3000:3000 --name fluid-proxy fluid-proxy
```

### Node

```shell
$ git clone https://github.com/Manuel-Materazzo/Fluid-Proxy.git && cd Fluid-Proxy
$ npm install
$ npm start
```

## License
This project is licensed under the MIT License - see the LICENSE.md file for details.
