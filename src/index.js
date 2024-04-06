require('dotenv').config();

const fs = require('fs').promises;
const path = require('path');
const { PubSub } = require('@google-cloud/pubsub');
const { watch, labels, unwatch, history } = require('./gmail-watch');

const PROJECT_ID = process.env.PROJECT_ID;
const TOPIC_NAME = process.env.TOPIC_NAME;
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials/pubsub_credentials.json');
const WEBHOOK_URL = process.env.WEBHOOK_URL;

async function main() {
	const content = await fs.readFile(CREDENTIALS_PATH);
	const credentials = JSON.parse(content);

	await unwatch();
	let { historyId } = await watch();

	const pubsub = new PubSub({
		credentials,
		projectId: PROJECT_ID,
	});

	try {
		const topic = pubsub.topic(TOPIC_NAME);
		const subscription = topic.subscription(`${TOPIC_NAME}-subscription`);
		const [exists] = await subscription.exists();

		if (!exists) {
			await subscription.create();
		}

		subscription.on('message', async message => {
			const body = message.data.toString('utf8');
			const payload = JSON.parse(body);

			console.log('Received message:', payload);

			if (payload.historyId) {
				const data = await history(historyId);

				const messages = data.history?.flatMap(item => item.messages);
				if (messages?.length) {
					console.log('messages', messages);
					await fetch(WEBHOOK_URL, {
						method: 'POST',
						body,
					});
				}

				historyId = payload.historyId;
			}

			message.ack();
		});
	} catch (e) {
		console.error(e);
	}
}

main().catch(console.error);
