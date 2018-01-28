var request = require('request');
var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

XMLHttpRequest.UNSENT = 0;
XMLHttpRequest.OPENED = 1;
XMLHttpRequest.HEADERS_RECEIVED = 2;
XMLHttpRequest.LOADING = 3;
XMLHttpRequest.DONE = 4;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

let FACEBOOK_VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;
let FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
let FACEBOOK_SEND_MESSAGE_URL = 'https://graph.facebook.com/v2.6/me/messages?access_token=' + FACEBOOK_PAGE_ACCESS_TOKEN;
let NEWS_API_KEY = process.env.NEWS_API_KEY;

app.get('/', function (req, res) {
    res.send("Hey there! You have reached the Bot's very own home. To see it in action, head over to https://www.messenger.com/t/147207369275897 now!");
});

app.get('/webhook/', function(req, res) {
  if (req.query['hub.verify_token'] === FACEBOOK_VERIFY_TOKEN) {
        res.send(req.query['hub.challenge'])
        return;
    }
    res.send('Error, wrong token')
});
 
app.post('/webhook/', function(req, res) {
  console.log(JSON.stringify(req.body));
  if (req.body.object === 'page') {
    if (req.body.entry) {
      req.body.entry.forEach(function(entry) {
        if (entry.messaging) {
          entry.messaging.forEach(function(messagingObject) {
              var senderId = messagingObject.sender.id;
              if (messagingObject.message) {
                if (!messagingObject.message.is_echo) {
                  var senderText = messagingObject.message.text;
                  processText(senderId, senderText);
                }
              } else if (messagingObject.postback) {
                console.log('Received Postback message from ' + senderId);
              }
          });
        } else {
          console.log('Error: No messaging key found');
        }
      });
    } else {
      console.log('Error: No entry key found');
    }
  } else {
    console.log('Error: Not a page object');
  }
  res.sendStatus(200);
});

function sendMessageToUser(senderId, message) {
  request({
    url: FACEBOOK_SEND_MESSAGE_URL,
    method: 'POST',
    json: {
      recipient: {
        id: senderId
      },
      message: {
        text: message
      }
    }
  }, function(error, response, body) {
        if (error) {
          console.log('Error sending message to user: ' + error);
        } else if (response.body.error){
          console.log('Error sending message to user: ' + response.body.error);
        }
  });
}

function showTypingIndicatorToUser(senderId, isTyping) {
  var senderAction = isTyping ? 'typing_on' : 'typing_off';
  request({
    url: FACEBOOK_SEND_MESSAGE_URL,
    method: 'POST',
    json: {
      recipient: {
        id: senderId
      },
      sender_action: senderAction
    }
  }, function(error, response, body) {
    if (error) {
      console.log('Error sending typing indicator to user: ' + error);
    } else if (response.body.error){
      console.log('Error sending typing indicator to user: ' + response.body.error);
    }
  });
}

function processText(senderId, messageText) {
	showTypingIndicatorToUser(senderId, true);
	if(messageText.toUpperCase() === "STARTCONV") {
		var n = Math.random();
		if(n < 0.25) {
			getNews(senderId, 'Entertainment');
		} else if(n < 0.5 && n >= 0.25) {
			getNews(senderId, 'Sports');
		} else if(n < 0.75 && n >= 0.5) {
			getTDIH(senderId);
		} else {
			getTrivia(senderId);
		}
	} else {
		showTypingIndicatorToUser(senderId, false);
		sendMessageToUser(senderId, 'Invalid command. Just type startconv to get a random way to start a conversation or a discussion with others.');
	}
}

function getNews(senderId, category) {
	var message = 'How about this: ';
	var url = 'https://newsapi.org/v2/top-headlines?country=in&language=en&apiKey='+NEWS_API_KEY+'&pagesize=1&category='+category;
	
	var newsReq= new XMLHttpRequest();
	newsReq.onreadystatechange= function(){
		if (newsReq.readyState === XMLHttpRequest.DONE){
			showTypingIndicatorToUser(senderId, false);
			console.log(newsReq.responseText);
			if(newsReq.status=== 200){
				var response = JSON.parse(newsReq.responseText);
				var news = response['articles'][0].title;
				message += news;
				sendMessageToUser(senderId, message);
			} else{
				sendMessageToUser(senderId, 'Some error occurred processing your request. Please try again later.');
			}
		}
	}
	newsReq.open('GET', url, true);
	newsReq.send();
}

function getTDIH(senderId) {
	var message = 'Did you know ';
	var d = new Date();
	var url = 'http://numbersapi.com/'+(d.getMonth()+1)+'/'+d.getDate();
	var getData= new XMLHttpRequest();
	getData.onreadystatechange= function(){
		if (getData.readyState === XMLHttpRequest.DONE){
			if(getData.status=== 200){
				showTypingIndicatorToUser(senderId, false);
				message += getData.responseText;
				sendMessageToUser(senderId, message);
			} else{
				sendMessageToUser(senderId, 'Something went wrong. Please try again.');
			}
		}
	}
	//make the request
	getData.open('GET', url, true);
	getData.send();
	
}

function getTrivia(senderId) {
	var message = 'Did you know ';
	var url = 'http://numbersapi.com/random/trivia';
	var getData= new XMLHttpRequest();
	getData.onreadystatechange= function(){
		if (getData.readyState === XMLHttpRequest.DONE){
			if(getData.status=== 200){
				showTypingIndicatorToUser(senderId, false);
				message += getData.responseText;
				sendMessageToUser(senderId, message);
			} else{
				sendMessageToUser(senderId, 'Something went wrong. Please try again.');
			}
		}
	}
	//make the request
	getData.open('GET', url, true);
	getData.send();
}

app.listen(8080, function () {
  console.log('Conversation Starter Bot listening on port 8080!');
});