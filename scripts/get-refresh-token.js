const { createServer } = require('http');
const { OAuth2Client } = require('google-auth-library');

const port = process.env.PORT || 3000;
const redirectUri = `http://localhost:${port}/callback`;

(async () => {
	const authClient = new OAuth2Client({
		clientId: process.env.CLIENT_ID,
		clientSecret: process.env.CLIENT_SECRET,
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

			const { tokens } = await authClient.getToken(code);

			res.writeHead(200);
			res.end(`Refresh token: ${tokens.refresh_token}`);
			console.log('\nRefresh token:', tokens.refresh_token);
			server.close();
			process.exit(0);
		} else {
			res.writeHead(404);
			res.end('Not found');
		}
	});

	server.listen(port);
})();
