let utilities = require('./utilities');

//register players
function registerPlayer(text, docClient, url, bot_token, user_token, tableName, gameChannel) {
    //get info about player
    let variables = utilities.splitMessage(text);
    //get user by users.profile.get
    let uri = url + 'users.profile.get';
    let user_id = variables[0].replace(/[<>@]/g, '');
    let options = {
        uri: uri,
        qs: {
            token: user_token,
            user: user_id,
        },
        method: 'GET'
    };
    utilities.makeHTTPRequest(options, insertPlayerIntoDB, {
        variables: variables,
        docClient: docClient,
        url: url,
        token: bot_token,
        tableName: tableName,
        gameChannel: gameChannel,
        userId: user_id
    });
}

//insert players into dynamodb  
function insertPlayerIntoDB(error, response, body, parameters) {
    //get username of user, perhaps first and last name from profile
    let body_parsed = JSON.parse(body);
    let real_name = body_parsed.profile.real_name_normalized;
    let display_name = body_parsed.profile.display_name_normalized;
    parameters.variables[2] = real_name;
    parameters.variables[3] = display_name;
    if (parameters.variables[3] == '') {
        parameters.variables[3] = 'None';
    }
    let params = {
        TableName: parameters.tableName,
        Item: {
            "user_id": parameters.variables[0],
            "fact": parameters.variables[1].toLowerCase().replace(/[.?!,]/g, ''),
            "name": parameters.variables[2],
            "display_name": parameters.variables[3],
            "score": 0
        }
    };
    parameters.docClient.put(params, function (err, data) {
        if (err) {
            console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
            let message = 'There was an error registering. Please try again! :slightly_frowning_face:';
            utilities.postEphemeralMessageToSlack(parameters.url, parameters.token, parameters.gameChannel, parameters.userId, message, () => { }, {});
        } else {
            console.log("Added item:", JSON.stringify(data, null, 2));
            postWelcomeMessage(parameters.url, parameters.token, parameters.gameChannel, parameters.userId, parameters.variables[1]);
        }
    });
}

//post message to user to show the completion of their registration.
function postWelcomeMessage(url, token, gameChannel, userId, fact) {
    try {
        //post message to user to indicate they are in the game
        let message = 'Welcome to the Random Fact game. :grinning: \n Your Random Fact is: "' + fact + '"';
        utilities.postEphemeralMessageToSlack(url, token, gameChannel, userId, message, () => { }, {});
    } catch (err) {
        console.log(err);
    }
}

module.exports = { registerPlayer };
