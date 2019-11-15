let makeHTTPRequest = require('./utilities').makeHTTPRequest;

function registerPlayer(error, response, body, parameters) {
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
        //post message to user to indicate they are in the game
        let url = parameters.url + 'chat.postMessage';
        let options = {
            uri: url,
            qs: {
                token: parameters.token,
                channel: user_id,
                text: 'Welcome to the Cool Facts game. You have been registered! :grinning:'
            },
            method: 'POST'
        };
        makeHTTPRequest(options, insertPlayerIntoDB, { 
            variables: parameters.variables,
            client: parameters.docClient
        });
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
    parameters.client.put(params, function (err, data) {
        if (err) {
            console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("Added item:", JSON.stringify(data, null, 2));
        }
    });
}

module.exports = {registerPlayer, insertPlayerIntoDB};


//TODO: functionality to post message to direct DM
// function findIMChannelAndPostMessage(error, response, body, parameters) {
//     try {
//         if (error) {
//             throw error;
//         }
        
//         //get IM list (needed for posting direct messages as a bot)
//         let url = slack_api_url + 'im.list';
//         let options = {
//             uri: url,
//             qs: {
//                 token: user_token,
//                 user: user_id,
//             },
//             method: 'GET'
//         };
//         makeHTTPRequest(options, postWelcomeMessage, { user_id: user_id, variables: parameters.variables });
//     } catch (err) {
//         console.log(err);
//     }
// }