let utilities = require('./utilities');

//parse answer submission
//TODO: replace all extra characters in guess and make lower case 
async function guessAnswer(answer, tableName, docClient, url, token) {
    let answer_variables = utilities.splitMessage(answer);
    let submitter = answer_variables[0];
    let fact_giver = answer_variables[1];
    let guess = answer_variables[2];
    let name_parser_params = {
        TableName: tableName,
        ProjectionExpression: "user_id",
        FilterExpression: "#rn = :name or #dn = :name",
        ExpressionAttributeNames: {
            "#rn": "name",
            "#dn": "display_name"
        },
        ExpressionAttributeValues: {
            ":name": fact_giver
        }
    };

    let results = await utilities.scanTable(docClient, name_parser_params);
    let user_ids = [];
    results.forEach((result) => {
        if (!user_ids.includes(result.user_id)) { user_ids.push(result.user_id); }
    });
    user_ids.forEach(async (user_id) => {
        let outputs = await checkAnswer(tableName, submitter, user_id, guess, docClient);
        let is_correct = outputs[0];
        let message = outputs[1];
        if (is_correct) { await updateScore(submitter, tableName, docClient); }  
        alertUser(docClient, submitter, tableName, url, token, is_correct, message); 
    });
}

//check against database to see if that is the right answer.
async function checkAnswer(tableName, submitterUserId, factUserId, guess, docClient) {
    let output_message;
    let check_answer_params = {
        TableName: tableName,
        FilterExpression: "#ui = :userId and #a = :answer",
        ExpressionAttributeNames: {
            "#ui": "user_id",
            "#a": "answer"
        },
        ExpressionAttributeValues: {
            ":userId": factUserId,
            ":answer": guess
        }
    };
    let answers = await utilities.scanTable(docClient, check_answer_params);
    let is_correct = false;
    let guessTableName = 'CoolFactsGuesses';
    if (answers.length != 0) {
        let check_guess_params = {
            TableName: guessTableName,
            FilterExpression: "#gui = :submitterId and #fui = :factUserId and #g = :guess",
            ExpressionAttributeNames: {
                "#gui": "guesser_user_id",
                "#fui": "fact_user_id",
                "#g": "guess"
            },
            ExpressionAttributeValues: {
                ":submitterId": submitterUserId,
                ":factUserId": factUserId,
                ":guess": guess
            }
        };
        let guesses = await utilities.scanTable(docClient, check_guess_params);
        if (guesses.length != 0) { output_message = 'You have already made that guess! :nerd_face:'; }
        else { 
            storeGuess(docClient, guessTableName, submitterUserId, factUserId, guess); 
            is_correct = true;
        }
    }
    else { output_message = 'You guessed incorrectly. Try again :confused:'; }
    return [is_correct, output_message];
}

//store guesses made by players
function storeGuess(docClient, tableName, submitterUserId, factUserId, guess) {
    let params = {
        TableName: tableName,
        Item: {
            "guesser_user_id": submitterUserId,
            "fact_user_id": factUserId,
            "guess": guess
        }
    };
    console.log("Adding a new item...");
    docClient.put(params, function (err, data) {
        if (err) {
            console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("Added item:", JSON.stringify(data, null, 2));
        }
    });
}

//update score if answer is correct (by id)
async function updateScore(user, tableName, docClient) {
    let score_increase_params = {
        TableName: tableName,
        Key: {
            "user_id": user
        },
        UpdateExpression: "set score = score + :i",
        ExpressionAttributeValues: {
            ":i": 1,
        },
        ReturnValues: "UPDATED_NEW"
    };
    docClient.update(score_increase_params, function (err, data) {
        if (err) {
            console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
        }
    });
}

//alert user of whether they are correct or not
function alertUser(docClient, user, tableName, url, token, isCorrect, outputMessage) {
    if (isCorrect) {
        //get score for user
        let get_score_params = {
            TableName: tableName,
            ProjectionExpression: "score",
            KeyConditionExpression: "#ui = :user",
            ExpressionAttributeNames: {
                "#ui": "user_id"
            },
            ExpressionAttributeValues: {
                ":user": user
            }
        };
        docClient.query(get_score_params, function (err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
            } else {
                console.log("Query succeeded.");
                data.Items.forEach(function (item) {
                    console.log(item);
                    let user_id = user.replace('<', '').replace('>', '').replace('@', '');
                    //post message to user to indicate they are in the game
                    let uri = url + 'chat.postMessage';
                    let options = {
                        uri: uri,
                        qs: {
                            token: token,
                            channel: user_id,
                            text: 'You guessed correctly! :+1: Your new score is *' + item.score + '*'
                        },
                        method: 'POST'
                    };
                    utilities.makeHTTPRequest(options, () => { }, {});
                });
            }
        });
    } else {
        let user_id = user.replace('<', '').replace('>', '').replace('@', '');
        //post message to user to indicate they are in the game
        let uri = url + 'chat.postMessage';
        let options = {
            uri: uri,
            qs: {
                token: token,
                channel: user_id,
                text: outputMessage 
            },
            method: 'POST'
        };
        utilities.makeHTTPRequest(options, () => { }, {});
    }
}

module.exports = { guessAnswer }




