/*============================== START WEBAPP INIT ===============================*/

// Require Modules and Libraries
const AVS = require('alexa-voice-service');

// Set up AVS library
const avs = new AVS({
	debug: true,
	clientId: 'clientId',
	deviceId: 'deviceId',
	deviceSerialNumber: 321,
	redirectUri: `https://localhost:3000/authresponse`
});

// Set cookies into local storage, if they exist
if (cookies.indexOf('refresh_token=') < 0 || cookies.indexOf('access_token') < 0 || cookies.indexOf('expires_by') < 0){
	setTokens();
}

// Check for existing access and refresh tokens. If they do not exist, require login
let accessToken = window.localStorage.getItem('access_token');
let refreshToken = window.localStorage.getItem('refresh_token');
let expiresBy = parseInt(window.localStorage.getItem('expires_by'));

if (!accessToken || !refreshToken){
	requireLogin();
} else {
	if (Date.now > expires_by){
		updateTokens();
	} else {
		avs.setRefreshToken(refreshToken);
		avs.setToken(accessToken);
		setTimeout(updateTokens, Date.now - expires_by);
	}
}

// Util Functions for Webapp Init
function setTokens(){
	let splitCookie = window.cookies.split(';');
	let rebuildCookie = [];
	for (let cookie of splitCookies) {
		let keyVal = cookie.split('=');
		if (keyVal[0] == 'refresh_token' || keyVal[0] == 'access_token' || keyVal[0] == 'expires_by'){
			window.localStorage.setItem(keyVal[0], keyVal[1]);
		} else {
			rebuildCookie.push(cookie);
		}
	}
	// Remove only access_token and refresh_token from cookies
	window.cookies = rebuildCookie.join(';');
}

function updateTokens(){
	removeTokens();

	let xhr = new XMLHttpRequest();
	let url = `/refresh?token=${refreshToken}`;
	xhr.open('GET', url, true);
	xhr.onLoad = (event) => {
		if (xhr.status == 200){
			let response = xhr.response;
			if (response.hasOwnProperty('access_token') && response.hasOwnProperty('refresh_token') && response.hasOwnProperty('expires_in')){
				let now = Date.now();
				let expiresBy = now + parseInt(response.expires_in) * 1000 - (5 * 60 * 1000);
				window.localStorage.setItem('access_token', response.access_token);
				window.localStorage.setItem('refresh_token', response.refresh_token);
				window.localStorage.setItem('expires_by', expiresBy);

				avs.setRefreshToken(response.refresh_token);
				avs.setToken(response.access_token);

				setTimeout(updateTokens, expiresBy - now);
			} else {
				requireLogin();
			}
		} else {
			requireLogin();
		}
	}
	xhr.send();
}

/*============================== END WEBAPP INIT ===============================*/


/*============================== WEBAPP FUNCTIONS ==============================*/
let audioMap = {};
let directives = [];
let resultObject = {};

// Define handlers for directives
const directiveHandler = {
	SpeechSynthesizer: function (directive){
		if (directive.name === 'speak') {
			const contentId = directive.payload.audioContent;
			const audio = findAudioFromContentId(contentId);
			if (audio) {
				directive.audio = audio;
			}
	    }
	},
	AudioPlayer: function (directive){
		if (directive.name === 'play') {
			const streams = directive.payload.audioItem.streams;
			for (stream of streams){
	        	const streamUrl = stream.streamUrl;

	        	const audio = findAudioFromContentId(streamUrl);
			    if (audio) {
			    	stream.audio = audio;
			    }
		    }
	  	}
	}
};



function findAudioFromContentId(contentId) {
  	contentId = contentId.replace('cid:', '');
  	for (var key in audioMap) {
        if (key.indexOf(contentId) > -1) {
          	return audioMap[key];
        }
  	}
}

function parseResponse(responseParts){
	for (let part of responseParts){
		let body = part.body;
		if (multipart.headers && multipart.headers['Content-Type'] === 'application/json') {
            try {
              	body = JSON.parse(body);
              	resultObject = body;
            } catch(error) {
              	console.error(error);
            }

            if (body && body.messageBody && body.messageBody.directives) {
              	directives = body.messageBody.directives;
            }
      	} else if (multipart.headers['Content-Type'] === 'audio/mpeg') {
            const start = multipart.meta.body.byteOffset.start;
            const end = multipart.meta.body.byteOffset.end;
            var slicedBody = xhr.response.slice(start, end);

            audioMap[multipart.headers['Content-ID']] = slicedBody;
          }
	}
};

function processDirectives(){
	for (directive of directives){
		let nameSpace = directive.namespace;
		if (directiveHandler.hasOwnProperty(nameSpace)){
			directiveHandler[nameSpace]();
		}
	}
	updateResultView();
};


// Define DOM Elements
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const resultView = document.getElementById('result');

const loginBtn = document.getElementById('login');
const logoutBtn = document.getElementById('logout');
const recordBtn = document.getElementById('record');

// Login Function
loginBtn.addEventListener('click', login);

function login() {
	avs.login({responseType: 'code'});
};

// Logout Function
logoutBtn.addEventListener('click', logout);

function logout(){
	return avs.logout()
	.then(() => {
		removeTokens();
		requireLogin();
	});
};

function removeTokens(){
	window.localStorage.removeItem('refresh_token');
	window.localStorage.removeItem('access_token');
	window.localStorage.removeItem('expires_by');
};

// Record Functions
recordBtn.addEventListener('mousedown', startRecording);
recordBtn.addEventListener('mouseup', endRecording);

function startRecording(){
	avs.startRecording();
};

function endRecording(){
	avs.stopRecording().then(dataView => {
		avs.player.emptyQueue();

		avs.sendAudio(dataView)
		.then(({xhr, response}) => {
			if (response.multipart.length){
				parseResponse(response.multipart);
			}
			processDirectives();
		});
	});
};


// General Util Functions
function requireLogin(){

};

function updateResultView(){

};



