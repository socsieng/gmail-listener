const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'credentials/token.json');
const EMAIL_ADDRESS = process.env.EMAIL_ADDRESS;
const PROJECT_ID = process.env.PROJECT_ID;
const TOPIC_NAME = process.env.TOPIC_NAME;
const INBOX_LABELS = process.env.INBOX_LABELS ? process.env.INBOX_LABELS.split(',') : ['INBOX'];

let authorisePromise = null;

async function authorizeInternal() {
	const content = await fs.readFile(TOKEN_PATH);
	const credentials = JSON.parse(content);
	return google.auth.fromJSON(credentials);
}

async function authorize() {
	if (!authorisePromise) {
		authorisePromise = authorizeInternal();
	}
	return authorisePromise;
}

async function watch() {
	const auth = await authorize();
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
	const auth = await authorize();
	const gmail = google.gmail({ version: 'v1', auth });
	await gmail.users.stop({
		userId: EMAIL_ADDRESS,
	});

	console.log('Stopped watching');
}

async function labels() {
	const auth = await authorize();
	const gmail = google.gmail({ version: 'v1', auth });
	const labels = await gmail.users.labels.list({ userId: EMAIL_ADDRESS });

	return labels.data.labels;
}

async function history(historyId) {
	const auth = await authorize();
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
