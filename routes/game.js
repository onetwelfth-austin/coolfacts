let express = require('express');
let router = express.Router();
let AWS = require('aws-sdk');
let dotenv = require('dotenv');
let registerPlayer = require('../game/register').registerPlayer;
let guessAnswer = require('../game/play').guessAnswer;
let showLeaderboard = require('../game/status').showLeaderboard;
let utilities = require('../game/utilities');
let bodyParser = require('body-parser');
const { RTMClient } = require('@slack/rtm-api');

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
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
const game_channel = process.env.GAME_CHANNEL;

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
    registerPlayer(text, doc_client, slack_api_url, bot_token, user_token, table_name, game_channel);
  } //else if user is playing game
  else if (event.username == 'Check Answer') {
    guessAnswer(text, table_name, doc_client, slack_api_url, bot_token, game_channel);
  }
});

(async () => {
  // Connect to Slack
  const { self, team } = await rtm.start();
})();

/* Begin game */
router.get('/:duration?/:numberOfIntervals?/:leaderboardLength?', (req, res) => {
  try {
    let duration = req.query.duration;
    let number_of_intervals = req.query.numberOfIntervals;
    let leaderboard_length = req.query.leaderboardLength;
    showLeaderboard(table_name, doc_client, slack_api_url, bot_token, leaderboard_length, game_channel, duration, number_of_intervals, 0);
    res.status(200).send('Game started.');
  } catch (err) {
    res.status(500).send('Error occurred: ' + err);
    console.log(err);
  }
});

router.post('/search', async (req, res) => {
  try {
    //parse text to get user
    let textValues = req.body.text.split('|');
    let question_user = textValues[0] + '>';
    let submitter_user = req.body.user_id;
    //query db for user
    let user_params = {
      TableName: table_name,
      ProjectionExpression: "user_id, question",
      FilterExpression: "#ui = :user_id",
      ExpressionAttributeNames: {
        "#ui": "user_id",
      },
      ExpressionAttributeValues: {
        ":user_id": question_user
      }
    };
    //fetch question and send message
    let results = await utilities.scanTable(doc_client, user_params);
    let message = '';
    results.forEach((result) => {
      message = 'The question for' + result.user_id + ' is "' + result.question + '"';
    });
    utilities.postMessageToSlack(slack_api_url, bot_token, submitter_user, message, () => { }, {});
    res.status(200).send();
  } catch (err) {
    res.status(500).send('Error occurred: ' + err);
    console.log(err);
  }
});

module.exports = router;
