/*============================== START WEBAPP INIT ===============================*/
// Define DOM Elements
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const resultView = document.getElementById('result');

const loginBtn = document.getElementById('login');
const logoutBtn = document.getElementById('logout');
const recordBtn = document.getElementById('record');

// Require Modules and Libraries
const AVS = require('alexa-voice-service');

// Set up AVS library
const avs = new AVS({
	debug: true,
	clientId: 'whoops',
	deviceId: 'cctest',
	deviceSerialNumber: 321,
	redirectUri: 'https://localhost:3000/authresponse'
});

console.log("what's the cookie: " + document.cookie);
// Set cookie into local storage, if they exist
if (document.cookie.indexOf('refresh_token=') > -1 || document.cookie.indexOf('access_token') > -1 || document.cookie.indexOf('expires_by') > -1){
	setTokens();
}

// Check for existing access and refresh tokens. If they do not exist, require login
let accessToken = window.localStorage.getItem('access_token');
let refreshToken = window.localStorage.getItem('refresh_token');
let expiresBy = parseInt(window.localStorage.getItem('expires_by'));

if (!accessToken || !refreshToken){
	requireLogin();
} else {
	if (Date.now > expiresBy){
		updateTokens();
	} else {
		avs.setRefreshToken(refreshToken);
		avs.setToken(accessToken);
		setTimeout(updateTokens, expiresBy - Date.now());
	}
	avs.requestMic();
}

// Util Functions for Webapp Init
function setTokens(){
	let splitCookie = document.cookie.split('; ');
	let rebuildCookie = [];
	for (let cookie of splitCookie) {
		let keyVal = cookie.split('=');
		if (keyVal[0] == 'refresh_token' || keyVal[0] == 'access_token' || keyVal[0] == 'expires_by'){
			window.localStorage.setItem(keyVal[0], decodeURI(keyVal[1]));
			document.cookie = keyVal[0] + '=; Max-Age=0;'
		}
	}
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
				avs.player.enqueue(audio)
				.then(() => {
					avs.player.play();
				});
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
					avs.player.enqueue(audio)
					.then(() => {
						avs.player.play();
					});
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

function parseResponse(xhr, responseParts){
	directives = [];
	for (let part of responseParts){
		let body = part.body;
		if (part.headers && part.headers['Content-Type'] === 'application/json') {
            try {
              	body = JSON.parse(body);
              	console.log("what is the body: " + JSON.stringify(body, null, '\t'));
              	directives.push(body);
            } catch(error) {
              	console.error(error);
            }

            if (body && body.messageBody && body.messageBody.directives) {
              	directives = body.messageBody.directives;
            }
      	} else if (part.headers['Content-Type'] === 'audio/mpeg') {
            const start = part.meta.body.byteOffset.start;
            const end = part.meta.body.byteOffset.end;
            var slicedBody = xhr.response.slice(start, end);

            audioMap[part.headers['Content-ID']] = slicedBody;
          }
	}
};

function processDirectives(){
	for (directive of directives){
		let nameSpace = directive.namespace;
		if (directiveHandler.hasOwnProperty(nameSpace)){
			directiveHandler[nameSpace](directive);
		}
	}
};


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
				parseResponse(xhr, response.multipart);
			}
			processDirectives();
			updateResultView();
		});
	});
};


// General Util Functions
function requireLogin(){
	loginView.style.display = `block`;
	appView.style.display = `none`;
};

function updateResultView(){
	resultView.innerHTML = JSON.stringify(directives, null, `\t`);
};



