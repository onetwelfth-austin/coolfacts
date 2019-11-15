let AWS = require('aws-sdk');
let dotenv = require('dotenv');
let registerPlayer = require('./register').registerPlayer;
let utilities = require('./utilities');
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
        let variables = utilities.splitMessage(text);
        //get user by users.profile.get
        let url = slack_api_url + 'users.profile.get';
        let user_id = variables[0].replace('<', '').replace('>', '').replace('@', '');
        let options = {
            uri: url,
            qs: {
                token: user_token,
                user: user_id,
            },
            method: 'GET'
        };
        utilities.makeHTTPRequest(options, registerPlayer, { 
            variables: variables,
            docClient: docClient,
            url: slack_api_url,
            token: token
        });
    }
});

(async () => {
    // Connect to Slack
    const { self, team } = await rtm.start();
})();

