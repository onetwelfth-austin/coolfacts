let utilities = require('./utilities');

//parse answer submission
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
    let userIds = [];
    results.forEach((result) => {
        if (!userIds.includes(result.user_id)) { userIds.push(result.user_id); }
    });
    userIds.forEach(async (user_id) => {
        let isCorrect = await checkAnswer(tableName, user_id, guess, docClient);
        console.log(isCorrect);
        if (isCorrect) { await updateScore(submitter, tableName, docClient); }
        alertUser(docClient, submitter, tableName, url, token, isCorrect);
    });
}

//check against database to see if that is the right answer.
//TODO: check against previous guesses to make sure that it has not been guessed correct already 
async function checkAnswer(tableName, userId, guess, docClient) {
    let check_answer_params = {
        TableName: tableName,
        FilterExpression: "#ui = :userId and #a = :answer",
        ExpressionAttributeNames: {
            "#ui": "user_id",
            "#a": "answer"
        },
        ExpressionAttributeValues: {
            ":userId": userId,
            ":answer": guess
        }
    };
    let answers = await utilities.scanTable(docClient, check_answer_params);
    if (answers.length != 0) { return true; }
    else { return false; }
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
function alertUser(docClient, user, tableName, url, token, isCorrect) {
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
                text: 'You guessed incorrectly. Try again :confused:'
            },
            method: 'POST'
        };
        utilities.makeHTTPRequest(options, () => { }, {});
    }
}

//create guesses table for each guess



module.exports = { guessAnswer }




