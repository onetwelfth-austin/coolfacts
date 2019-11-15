let AWS = require('aws-sdk');
let dotenv = require('dotenv');
let request = require('request');
const { RTMClient } = require('@slack/rtm-api');

dotenv.config();

//Connect to DynamoDB
AWS.config.update({
    region: "us-east-2",
    endpoint: "https://dynamodb.us-east-2.amazonaws.com"
});

let docClient = new AWS.DynamoDB.DocumentClient();

// Read a token from the environment variables
const token = process.env.SLACK_BOT_TOKEN;
const user_token = process.env.SLACK_USER_TOKEN;

// Initialize rtm
const rtm = new RTMClient(token);

//Initialized slack api url
const slack_api_url = 'https://slack.com/api/';

//handle either registration message or possible answer
rtm.on('message', (event) => {
    console.log(event);
    //if user is registering
    if (event.username == 'Register Player') {
        let text = event.text;
        //get info about player
        let variables = splitMessage(text);
        //get user by users.profile.get
        let url = slack_api_url + 'users.profile.get';
        let user_id = variables[0].replace('<', '').replace('>', '').replace('@', '');
        console.log(user_id);
        let options = {
            uri: url,
            qs: {
                token: user_token,
                user: user_id,
            },
            method: 'GET'
        };
        makeHTTPRequest(options, findIMChannelAndPostMessage, { variables: variables });
    }
});

(async () => {
    // Connect to Slack
    const { self, team } = await rtm.start();
})();

function splitMessage(text) {
    console.log(text);
    let textSplit = text.split(/\r?\n/);
    console.log(textSplit);
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

function findIMChannelAndPostMessage(error, response, body, parameters) {
    try {
        if (error) {
            throw error;
        }
        //get username of user, perhaps first and last name from profile
        let body_parsed = JSON.parse(body);
        let real_name = body_parsed.profile.real_name_normalized;
        let display_name = body_parsed.profile.display_name_normalized;
        parameters.variables[3] = real_name;
        parameters.variables[4] = display_name;
        console.log(parameters.variables);
        let user_id = parameters.variables[0].replace('<', '').replace('>', '').replace('@', '');
        //get IM list (needed for posting direct messages as a bot)
        let url = slack_api_url + 'im.list';
        let options = {
            uri: url,
            qs: {
                token: user_token,
                user: user_id,
            },
            method: 'GET'
        };
        makeHTTPRequest(options, postWelcomeMessage, { user_id: user_id, variables: parameters.variables });
    } catch (err) {
        console.log(err);
    }
}

function postWelcomeMessage(error, response, body, parameters) {
    try {
        if (error) {
            throw error;
        }
        let body_parsed = JSON.parse(body);
        let im_channels = body_parsed.ims;
        let im_id;
        for (let i = 0; i < im_channels.length; i++) {
            if (im_channels[i].user == parameters.user_id) {
                im_id = im_channels[i].id;
            }
        }
        console.log(im_id);
        //post message to user to indicate they are in the game
        let url = slack_api_url + 'chat.postMessage';
        let options = {
            uri: url,
            qs: {
                token: token,
                channel: im_id,
                text: 'Welcome to the Cool Facts game. You have been registered! :grinning:'
            },
            method: 'POST'
        };
        makeHTTPRequest(options, insertPlayerIntoDB, { variables: parameters.variables });
    } catch (err) {
        console.log(err);
    }
}

function insertPlayerIntoDB(error, response, body, parameters) {
    let table = "CoolFacts";
    if (parameters.variables[4] == '') {
        parameters.variables[4] = 'None';
    }
    let params = {
        TableName: table,
        Item: {
            "user_id": parameters.variables[0],
            "question": parameters.variables[1],
            "answer": parameters.variables[2],
            "name": parameters.variables[3],
            "display_name": parameters.variables[4],
            "score": 0
        }
    };
    docClient.put(params, function (err, data) {
        if (err) {
            console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("Added item:", JSON.stringify(data, null, 2));
        }
    });
}