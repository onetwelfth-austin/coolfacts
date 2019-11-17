let request = require('request');

//split colon separated text
function splitMessage(text) {
    let textSplit = text.split(/\r?\n/);
    let variables = [];
    for (let i = 0; i < textSplit.length; i++) {
        //split variables by key/value
        let variable = textSplit[i].split(':');
        variables.push(variable[1].trim());
    }
    return variables;
}

//make http request
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

//scan dynamodb table
async function scanTable(documentClient, params) {
    let scanResults = [];
    let items;
    do {
        items = await documentClient.scan(params).promise();
        items.Items.forEach((item) => scanResults.push(item));
        console.log(items);
        params.ExclusiveStartKey = items.LastEvaluatedKey;
    } while (typeof items.LastEvaluatedKey != "undefined");
    return scanResults;
}

module.exports = { splitMessage, makeHTTPRequest, scanTable };