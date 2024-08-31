const { Client, Intents } = require('discord.js');
const scrapeLinkedInJobs = require('../linkedinScraper');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.once('ready', () => {
    console.log('Discord bot is online!');
});

client.on('messageCreate', async (message) => {
    if (message.content === '!jobs') {
        const jobs = await scrapeLinkedInJobs();
        message.channel.send(jobs || 'No jobs found.');
    }
});

module.exports = (req, res) => {
    if (!client.isReady()) {
        client.login(process.env.DISCORD_TOKEN).then(() => {
            res.status(200).json({ status: 'Bot is running' });
        }).catch(err => {
            res.status(500).json({ status: 'Bot failed to start', error: err.message });
        });
    } else {
        res.status(200).json({ status: 'Bot is already running' });
    }
};
