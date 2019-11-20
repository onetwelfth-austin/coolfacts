let utilities = require('./utilities');

//display leaderboard over time and let users know how long lasts
async function showLeaderboard(tableName, docClient, url, token, leaderboardLength, gameChannel, duration, numberOfIntervals, iteration) {
    let interval = duration / numberOfIntervals;
    let time_left = duration - interval * iteration;
    let counter;
    let message = '';
    let top_score_params = {
        TableName: tableName,
    };
    let results = await utilities.scanTable(docClient, top_score_params);
    results.sort(utilities.dynamicSort('-score'));
    if (duration == time_left) {
        message = 'The game has officially started. Enjoy! :boom:';
        utilities.postMessageToSlack(url, token, gameChannel, message, () => { }, {});
        iteration++;
        counter = setTimeout(showLeaderboard, duration / numberOfIntervals, tableName, docClient, url, token, leaderboardLength, gameChannel, duration, numberOfIntervals, iteration);
    } else if (time_left > 0) {
        let hours = (time_left <= 3600000) ? 0 : Math.floor(time_left / 3600000);
        let minutes = (time_left <= 60000) ? time_left / 60000 : Math.floor(time_left / 60000);
        message = "There are " + minutes + " minutes left in the game. Here's the leaderboard so far: \n";
        for (let i = 0; i < leaderboardLength; i++) { message += (i + 1) + ') ' + results[i].user_id + ' = *' + results[i].score + '*\n'; }
        utilities.postMessageToSlack(url, token, gameChannel, message, () => { }, {});
        iteration++;
        counter = setTimeout(showLeaderboard, duration / numberOfIntervals, tableName, docClient, url, token, leaderboardLength, gameChannel, duration, numberOfIntervals, iteration);
    } else {
        clearTimeout(counter);
        message = 'The game has officially ended. Here are the final results: \n';
        for (let i = 0; i < leaderboardLength; i++) { message += (i + 1) + ') ' + results[i].user_id + ' = *' + results[i].score + '*\n'; }
        utilities.postMessageToSlack(url, token, gameChannel, message, () => { }, {});
    }
}

module.exports = { showLeaderboard };
