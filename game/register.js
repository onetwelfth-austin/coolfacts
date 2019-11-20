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
    utilities.makeHTTPRequest(options, postWelcomeMessage, {
        variables: variables,
        docClient: docClient,
        url: url,
        token: bot_token,
        tableName: tableName,
        gameChannel: gameChannel,
        userId: user_id
    });
}

//post message to user to show the completion of their registration.
function postWelcomeMessage(error, response, body, parameters) {
    try {
        if (error) {
            throw error;
        }
        //get username of user, perhaps first and last name from profile
        let body_parsed = JSON.parse(body);
        let real_name = body_parsed.profile.real_name_normalized;
        let display_name = body_parsed.profile.display_name_normalized;
        parameters.variables[2] = real_name;
        parameters.variables[3] = display_name;
        let user_id = parameters.userId;
        //post message to user to indicate they are in the game
        let message = 'Welcome to the Random Fact game. :grinning: \n Your Random Fact is: "' + parameters.variables[1] + '"';
        utilities.postEphemeralMessageToSlack(parameters.url, parameters.token, parameters.gameChannel, user_id, message, insertPlayerIntoDB, {
            variables: parameters.variables,
            docClient: parameters.docClient,
            tableName: parameters.tableName
        });
    } catch (err) {
        console.log(err);
    }
}

//insert players into dynamodb
function insertPlayerIntoDB(error, response, body, parameters) {
    if (parameters.variables[4] == '') {
        parameters.variables[4] = 'None';
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
        } else {
            console.log("Added item:", JSON.stringify(data, null, 2));
        }
    });
}

module.exports = { registerPlayer };
