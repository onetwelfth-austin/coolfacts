let request = require('request');

function splitMessage(text) {
    let textSplit = text.split(/\r?\n/);
    let variables = [];
    for (let i = 0; i < textSplit.length; i++) {
        let variable = textSplit[i].split(':');
        variables.push(variable[1].trim());
        console.log(variables);
    }
    return variables;
}

function makeHTTPRequest(options, callback, parameters) {
    //make generic http requests
    console.log('In makeHTTPRequest for ' + options.uri);
    request(options, function (error, response, body) {
        if (error) {
            console.log('error:', error); // Print the error if one occurred
        } else {
            console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
            console.log('body:', body); // Print response body
            callback(error, response, body, parameters);
        }
    });
}

module.exports = { splitMessage, makeHTTPRequest };