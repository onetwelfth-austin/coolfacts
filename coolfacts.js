let AWS = require('aws-sdk');
let dotenv = require('dotenv');
let registerPlayer = require('./register').registerPlayer;
let guessAnswer = require('./play').guessAnswer;
const { RTMClient } = require('@slack/rtm-api');

dotenv.config();

//Connect to DynamoDB
AWS.config.update({
    region: "us-east-2",
    endpoint: "https://dynamodb.us-east-2.amazonaws.com"
});

const doc_client = new AWS.DynamoDB.DocumentClient();

// Read a token from the environment variables
const bot_token = process.env.SLACK_BOT_TOKEN;
const user_token = process.env.SLACK_USER_TOKEN;

// Initialize rtm
const rtm = new RTMClient(bot_token);

//Initialized slack api url
const slack_api_url = 'https://slack.com/api/';

const table_name = "CoolFacts";

//handle either registration or answer submission
rtm.on('message', (event) => {
    console.log(event);
    let text = event.text;
    //if user is registering
    if (event.username == 'Register Player') {
        registerPlayer(text, doc_client, slack_api_url, bot_token, user_token, table_name);
    } //else if user is playing game
    else if (event.username == 'Check Answer') {
        guessAnswer(text, table_name, doc_client, slack_api_url, bot_token);
    }
});

(async () => {
    // Connect to Slack
    const { self, team } = await rtm.start();
})();

