require('dotenv').config();

const { labels } = require('./gmail-watch');

labels()
	.then(labels => labels.map(label => `${label.name}: ${label.id}`).join('\n'))
	.then(console.log)
	.catch(console.error);
