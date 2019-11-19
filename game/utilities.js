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

//sort results of JS objects by property
function dynamicSort(property) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        /* next line works with strings and numbers, 
         * and you may want to customize it to your needs
         */
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}

//post messages to slack
function postMessageToSlack(slack_api_url, token, channel, message, callback, parameters) {
    let uri = slack_api_url + 'chat.postMessage';
    let options = {
      uri: uri,
      qs: {
        token: token,
        channel: channel,
        text: message
      },
      method: 'POST'
    };
    makeHTTPRequest(options, callback, parameters);
}

//post ephemeral messages to slack
function postEphemeralMessageToSlack(slack_api_url, token, channel, user, message, callback, parameters) {
    let uri = slack_api_url + 'chat.postEphemeral';
    let options = {
      uri: uri,
      qs: {
        token: token,
        channel: channel,
        text: message,
        user: user
      },
      method: 'POST'
    };
    makeHTTPRequest(options, callback, parameters);
}

module.exports = { splitMessage, makeHTTPRequest, scanTable, dynamicSort, postMessageToSlack, postEphemeralMessageToSlack };