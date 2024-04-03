const endpoints = [
    'queryparam',
    'path-variable'
];

const params = [
    'request-method',
    'request-headers',
    'request-body',
    'response-headers',
    'response-body-html-append',
    'response-body-html-prepend',
    'response-body-regex-replace',
    'response-rewrite-urls',
    'url'
];

const values = {};
let currentEndpoint = 'queryparam-tab';

const validationPatterns = {
    'url': /^((https?):\/\/)?((www\.)?[a-z0-9]+\.[a-z]+|(localhost)|(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})|(([a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}))(\/[a-zA-Z0-9#]+\/?)*/i,
    'request-headers': /\{\s*".*"\s*:\s*".*"\s*}$/i,
    'request-body': /\{\s*".*"\s*:\s*".*"\s*}$/i,
    'response-headers': /\{\s*".*"\s*:\s*".*"\s*}$/i,
    'response-body-html-append': /\{\s*".*"\s*:\s*".*"\s*}$/i,
    'response-body-html-prepend': /\{\s*".*"\s*:\s*".*"\s*}$/i,
    'response-body-regex-replace': /\{\s*".*"\s*:\s*".*"\s*}$/i
};

const host = window.location.protocol + "//" + window.location.host;
const outputElement = document.getElementById('output-url');

function getUriEncodedValue(key) {
    const value = values[key];
    if (value !== undefined) {
        return encodeURIComponent(values[key]);
    }
    return null;
}

function getQueryparamUrl() {
    let url = host + '/queryparam?';
    params.forEach(param => {
        const value = getUriEncodedValue('queryparam-' + param);
        console.log(value)
        if (value) {
            url = url + toCamelCase(param) + '=' + value + "&";
        }
    });

    return url.slice(0, url.length - 1);
}

function toCamelCase(str) {
    return str.replace('-', function (word, index) {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
}

function getPathvariableUrl() {
    return host + '/path-variable/' + getUriEncodedValue('path-variable-request-method') + '/' +
        getUriEncodedValue('path-variable-request-headers') + '/' +
        getUriEncodedValue('path-variable-response-rewrite-urls') + '/' +
        getUriEncodedValue('path-variable-request-body') + '/' +
        getUriEncodedValue('path-variable-url');
}

function validateField(field, regex) {
    // skip check for checkboxes
    if (field.className === 'form-check-input') {
        return;
    }

    // pass only if there is no regex/value or if the value matches the regex
    if (!regex || !field.value || regex.test(field.value)) {
        field.className = 'form-control valid';
    } else {
        field.className = 'form-control invalid';
    }
}

function refreshPreview() {

    let generatedUrl = "";
    switch (currentEndpoint) {
        case "queryparam-tab":
            generatedUrl = getQueryparamUrl();
            break;
        case "path-variable-tab":
            generatedUrl = getPathvariableUrl();
            break;
    }

    outputElement.innerText = generatedUrl;
}

// initialize values that need to be empty
params.forEach(param => {
    values['path-variable-' + param] = '';
});


// initialize listeners
// each endpoint tab
endpoints.forEach(endpoint => {

    // add tab listener
    document.getElementById(endpoint + '-tab')?.addEventListener('click', () => {
        // on tab change, save the tab and trigger preview refresh
        currentEndpoint = endpoint + '-tab';
        refreshPreview();
    });

    // each possible param (if exists)
    params.forEach(param => {
        // on edit, save the value and trigger the preview refresh
        document.getElementById(endpoint + '-' + param)?.addEventListener('input', event => {
            // behaviour changes if it's a checkbox
            if (event.target.type === 'checkbox') {
                values[endpoint + '-' + param] = event.target.checked;
            } else {
                values[endpoint + '-' + param] = event.target.value;
            }
            console.log(param)
            // validate the field against regex expression
            validateField(event.target, validationPatterns[param]);
            // compute the URL preview
            refreshPreview();
        });
    })
});

