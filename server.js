const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const settings = require('./settings.json');
const request = require('request');

const app = express();
const port = 3000;
const publicPath = path.join(__dirname, 'public');

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cors());


app.use('/', express.static(publicPath));

app.get('/authresponse', (req, res) => {
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
		if (body && body.hasOwnProperty('access_token') && body.hasOwnProperty('refresh_token')){
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

console.log("listening on port " + port);
app.listen(port);
