require('dotenv').config();

const express = require('express');
const Twitter = require('twitter');
const app = express();
const opn = require('opn');

var client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_TOKEN_SECRET,
});

const port = 64051;

let newestTweetId = undefined;

const emptyMessage = 'Nothing more to see 🎉';

let marqueeIndex = 0;

const recentTweets = new Set();

app.get('/api/getMarquee', function(req, res) {
  return res.send(
    marquee(
      formatTweet(
        getOldestTweet()
      )
    )
  );
});

app.get('/api/visitOldest', function(req, res) {
  visitTweet(
    getOldestTweet()
  );
});

app.get('/api/getOldest', function(req, res) {
  return res.send(
    formatTweet(
      getOldestTweet()
    )
  );
});

app.get('/api/deleteOldest', function(req, res) {
  marqueeIndex = 0;
  recentTweets.delete(
    getOldestTweet(false)
  );
});

const fetchTweets = () => {
  client.get(
    'statuses/home_timeline',
     {
      count: 10,
      tweet_mode: 'extended',
      since_id: newestTweetId,
    },
    function(error, data, response) {
      if (error) {
        console.log("Something went wrong 😭");
        return;
      }

      if (!data.length) {
        return;
      }

      const tweets = data.reverse();
      newestTweetId = data[0].id;

      tweets.forEach(tweet => {
        recentTweets.add(JSON.stringify(tweet));
      });
    }
  );
};

const marquee = (tweet) => {
  if (!tweet || tweet === emptyMessage) {
    return emptyMessage;
  } else {
    const author = tweet.match(/^\@.+:/)[0];
    const safeChars = author.length;

    if (tweet.length - safeChars <= 25) {
      return tweet;
    }

    const tweetContents = tweet.substring(safeChars);
    const marqueedText = tweetContents.substr(marqueeIndex);
    
    const result = `${author}${marqueedText}`.substr(
      0,
      author.length + 25
    )

    if (marqueedText.length < 25) {
      marqueeIndex = 0;
    }

    return result + Array(50-result.length).fill(' ').toString().replace(/,/g,'');
  }
};

const getOldestTweet = (parse = true) => {
  const tweetArray = Array.from(recentTweets);
  if (!tweetArray.length) {
    return undefined;
  }
  if (parse) {
    return JSON.parse(tweetArray[0]);
  }
  return tweetArray[0];
};

const visitTweet = (tweet) => {
  if (tweet)
    opn(`https://twitter.com/statuses/${tweet.id_str}`);
};

const formatTweet = (tweet) => {
  if (!tweet) {
    return emptyMessage;
  }
  const result = `@${tweet.user['screen_name']}: ` +  
  `${tweet.full_text}`.replace(/\s+/g, " ") // trim spaces
                .replace(/([\uE000-\uF8FF]|\uD83C[\uD C00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2694-\u2697]|\uD83E[\uDD10-\uDD5D])/g, '') // trim emoji
                .replace(/[\u3000-\u303F]|[\u3040-\u309F]|[\u30A0-\u30FF]|[\uFF00-\uFFEF]|[\u4E00-\u9FAF]|[\u2605-\u2606]|[\u2190-\u2195]|\u203B/,'') // trim japanese
                .replace(/https{0,1}:\/\/t.co.*/,''); // trim link 
  return result;
};

// fetch new tweets every now and then
setInterval(fetchTweets, 60000);

// increments marquee index every second
setInterval(() => {
  marqueeIndex++;
}, 500);

app.listen(port);