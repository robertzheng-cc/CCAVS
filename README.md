# Using alexa-voice-service

This is a quick and dirty example of using the alexa-voice-service npm module. Below is a general overview of how to use the module:

## Step 1: Require and create a new avs instance

```javascript
const AVS = require('alexa-voice-service');

const avs = new AVS({
	debug: true,
	clientId: 'clientId',
	deviceId: 'deviceId',
	deviceSerialNumber: 321,
	redirectUri: `redirect uri for auth`
});
```

## Step 2: Authenticate a user for AVS
```javascript
// This method will redirect the browser to the Amazon Auth page, which will
// redirect back to the auth redirectUri with a code that the server can use
// to retrieve a refresh token and an access token for the client
avs.login({responseType: 'code'});
```

## Step 3: Set the access token for the user
```javascript
avs.setToken(<access token>);
```

The app is now ready to send voice to Amazon

## Step 4 (Optional): Record user commands
```javascript
avs.requestMic();
avs.startRecording();
// ...
// ...
// Once the user is done with a command:

avs.stopRecording().then(dataView => {
	// This method returns a promise, which gives us a DataView object built from the
	// audio buffer to send to AVS. If you already have a method for recording audio,
	// this step can be skipped.
});
```

## Step 5: Send the audio to AVS
```javascript
// send audio returns a promise with the multipart response from AVS
avs.sendAudio(dataView)
.then(({xhr, response}) => {
	// handle multipart response here
});
```



