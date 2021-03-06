const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('./server.key'),
  cert: fs.readFileSync('./server.crt'),
  passphrase: 'cloudcar',
  rejectUnauthorized: false
};

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const settings = require('./settings.json');
const request = require('request');

const app = express();
const port = 3000;
const publicPath = path.join(__dirname, 'public');

const server = https.createServer(options, app).listen(port, () => {
	console.log("listening on port " + port);
});

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cors());


app.use('/', express.static(publicPath));

app.get('/authresponse', (req, res) => {
	console.log("received authresponse: " + JSON.stringify(req.query, null, "\t"));
	const code = req.query.code;
	const grantType = 'authorization_code';
	const postData = `grant_type=${grantType}&code=${code}&client_id=${settings.clientId}&client_secret=${settings.clientSecret}&redirect_uri=${settings.redirectUri}`;
 
	const options = {
		url: 'https://api.amazon.com/auth/o2/token',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: postData
	};

	request.post(options, (error, response, body) => {
		if (typeof body == 'string'){
			body = JSON.parse(body);
		}
		if (body && body.hasOwnProperty('access_token') && body.hasOwnProperty('refresh_token')){
			console.log("code to token response: " + JSON.stringify(body, null, '\t'));
			let expiresIn = body.expires_in * 1000;
			let expiresBy = expiresIn - (1000 * 60 * 5) + Date.now();
			res.cookie('access_token', body.access_token);
			res.cookie('refresh_token', body.refresh_token);
			res.cookie('expires_by', expiresBy);
		}
		res.redirect(301, '..');
	});
	
});

app.get('/refresh', (req, res) => {
	console.log("received refresh call: " + JSON.stringify(req.query, null, "\t"));
	const refresh = req.query.token;
	const grantType = 'refresh_token';
	const postData = `grant_type=${grantType}&refresh_token=${refresh}&client_id=${settings.clientId}&client_secret=${settings.clientSecret}&redirect_uri=${settings.redirectUri}`;
 
	const options = {
		url: 'https://api.amazon.com/auth/o2/token',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: postData
	};

	request.post(options, (error, response, body) => {
		res.send(body);
	});
});

