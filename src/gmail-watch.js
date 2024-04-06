const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const EMAIL_ADDRESS = process.env.EMAIL_ADDRESS;
const PROJECT_ID = process.env.PROJECT_ID;
const TOPIC_NAME = process.env.TOPIC_NAME;
const INBOX_LABELS = process.env.INBOX_LABELS ? process.env.INBOX_LABELS.split(',') : ['INBOX'];

let authorisePromise = null;

async function authoriseIfRequired() {
	if (!authorisePromise) {
		authorisePromise = authorize();
	}
	return authorisePromise;
}

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
	try {
		const content = await fs.readFile(TOKEN_PATH);
		const credentials = JSON.parse(content);
		return google.auth.fromJSON(credentials);
	} catch (err) {
		return null;
	}
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
	const content = await fs.readFile(CREDENTIALS_PATH);
	const keys = JSON.parse(content);
	const key = keys.installed || keys.web;
	const payload = JSON.stringify({
		type: 'authorized_user',
		client_id: key.client_id,
		client_secret: key.client_secret,
		refresh_token: client.credentials.refresh_token,
	});
	await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 */
async function authorize() {
	let client = await loadSavedCredentialsIfExist();
	if (client) {
		return client;
	}

	client = await authenticate({
		scopes: SCOPES,
		keyfilePath: CREDENTIALS_PATH,
	});
	if (client.credentials) {
		await saveCredentials(client);
	}
	return client;
}

async function watch() {
	const auth = await authoriseIfRequired();
	const gmail = google.gmail({ version: 'v1', auth });

	const response = await gmail.users
		.watch({
			userId: EMAIL_ADDRESS,
			topicName: `projects/${PROJECT_ID}/topics/${TOPIC_NAME}`,
			labelIds: INBOX_LABELS,
			labelFilterBehavior: 'include',
		})
		.then(res => res.data);

	console.log('Watching', response);

	return response;
}

async function unwatch() {
	const auth = await authoriseIfRequired();
	const gmail = google.gmail({ version: 'v1', auth });
	const res = await gmail.users.stop({
		userId: EMAIL_ADDRESS,
	});

	console.log('Stopped watching');
}

async function labels() {
	const auth = await authoriseIfRequired();
	const gmail = google.gmail({ version: 'v1', auth });
	const labels = await gmail.users.labels.list({ userId: EMAIL_ADDRESS });

	console.log(labels);

	return labels;
}

async function history(historyId) {
	const auth = await authoriseIfRequired();
	const gmail = google.gmail({ version: 'v1', auth });
	const response = await gmail.users.history.list({
		userId: EMAIL_ADDRESS,
		startHistoryId: historyId,
		// historyTypes: ['messageAdded'],
	});

	return response.data;
}

module.exports = {
	watch,
	unwatch,
	labels,
	history,
};
