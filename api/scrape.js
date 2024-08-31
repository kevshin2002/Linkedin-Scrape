const { Client, Intents } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.once('ready', () => {
    console.log('Discord bot is online!');
});

client.on('messageCreate', async (message) => {
    if (message.content.startsWith('!jobs')) {
        const jobs = await scrapeLinkedInJobs();
        message.channel.send(jobs || 'No jobs found.');
    }
});

async function scrapeLinkedInJobs() {
    try {
        const { data } = await axios.get('https://www.linkedin.com/jobs/');
        const $ = cheerio.load(data);

        let jobs = '';

        $('.job-card-container').each((i, el) => {
            const jobTitle = $(el).find('.job-card-list__title').text().trim();
            const companyName = $(el).find('.job-card-container__company-name').text().trim();
            const location = $(el).find('.job-card-container__metadata-item').text().trim();

            jobs += `${jobTitle} at ${companyName} - ${location}\n`;
        });

        return jobs;
    } catch (error) {
        console.error('Error scraping LinkedIn:', error);
        return 'Failed to scrape LinkedIn job postings.';
    }
}

module.exports = (req, res) => {
    if (!client.isReady()) {
        client.login(process.env.DISCORD_TOKEN);
    }
    res.status(200).json({ status: 'Bot is running' });
};
