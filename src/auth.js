require('dotenv').config();

const fs = require('fs').promises;
const path = require('path');
const { createServer } = require('http');
const { OAuth2Client } = require('google-auth-library');

const TOKEN_PATH = path.join(process.cwd(), 'credentials/token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials/credentials.json');

const port = process.env.PORT || 3000;
const redirectUri = `http://localhost:${port}/oauth2callback`;

async function saveCredentials(tokenString) {
	await fs.writeFile(TOKEN_PATH, tokenString);
}

(async () => {
	const content = await fs.readFile(CREDENTIALS_PATH);
	const keys = JSON.parse(content);
	const credentials = keys.installed || keys.web;

	const authClient = new OAuth2Client({
		clientId: credentials.client_id,
		clientSecret: credentials.client_secret,
		redirectUri,
	});

	const scope = 'https://www.googleapis.com/auth/gmail.readonly';
	const authUrl = authClient.generateAuthUrl({
		prompt: 'consent',
		access_type: 'offline',
		scope,
	});

	console.log(`Open the following url in your browser: ${authUrl}`);

	const server = createServer(async (req, res) => {
		if (req.url.startsWith('/oauth2callback')) {
			const code = new URL(req.url, redirectUri).searchParams.get('code');
			if (!code) {
				res.writeHead(400);
				res.end('Missing code');
				return;
			}

			console.log('Received code:', code);
			const { tokens } = await authClient.getToken(code);

			const token = {
				type: 'authorized_user',
				client_id: credentials.client_id,
				client_secret: credentials.client_secret,
				refresh_token: tokens.refresh_token,
			};
			const tokenString = JSON.stringify(token);

			await saveCredentials(tokenString);

			res.writeHead(200);
			res.end(tokenString);
			console.log(tokenString);
			server.close();
			process.exit(0);
		} else {
			res.writeHead(404);
			res.end('Not found');
		}
	});

	server.listen(port);
})();
