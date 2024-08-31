require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const scrapeLinkedInJobs = require('../scrape');

let client;

async function initializeBot() {
    if (!client) {
        client = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
        });

        console.log('Initializing Discord bot...');

        client.once('ready', () => {
            console.log(`Logged in as ${client.user.tag}!`);
        });

        try {
            await client.login(process.env.DISCORD_TOKEN);
            console.log('Bot successfully logged in.');
        } catch (error) {
            console.error('Failed to log in:', error);
        }
    }
}



const CHANNEL_ROLES = {
    '1279335000172400671': ['Software Engineer'],
    '1279335092132646912': ['Data Scientist', 'Data Engineer', 'Data Analyst'],
    '1279335112512897086': ['Machine Learning'],
    '1279335126974857226': ['Deep Learning'],
    '1279335141340090399': ['Computer Vision'],
    '1279335262656397362': ['Artificial Intelligence', 'AI']
};

const usStates = [
    "Alabama", "AL", "Alaska", "AK", "Arizona", "AZ", "Arkansas", "AR", "California", "CA", "Colorado", "CO", "Connecticut", "CT",
    "Delaware", "DE", "Florida", "FL", "Georgia", "GA", "Hawaii", "HI", "Idaho", "ID", "Illinois", "IL", "Indiana", "IN",
    "Iowa", "IA", "Kansas", "KS", "Kentucky", "KY", "Louisiana", "LA", "Maine", "ME", "Maryland", "MD", "Massachusetts", "MA",
    "Michigan", "MI", "Minnesota", "MN", "Mississippi", "MS", "Missouri", "MO", "Montana", "MT", "Nebraska", "NE", "Nevada", "NV",
    "New Hampshire", "NH", "New Jersey", "NJ", "New Mexico", "NM", "New York", "NY", "North Carolina", "NC", "North Dakota", "ND",
    "Ohio", "OH", "Oklahoma", "OK", "Oregon", "OR", "Pennsylvania", "PA", "Rhode Island", "RI", "South Carolina", "SC",
    "South Dakota", "SD", "Tennessee", "TN", "Texas", "TX", "Utah", "UT", "Vermont", "VT", "Virginia", "VA", "Washington", "WA",
    "West Virginia", "WV", "Wisconsin", "WI", "Wyoming", "WY",
    "American Samoa", "AS", "Guam", "GU", "Northern Mariana Islands", "MP", "Puerto Rico", "PR", "United States Virgin Islands", "VI", "District of Columbia", "DC"
];

const excludeTerms = ["masters", "master", "phd", "ph.d", "doctorate", "ms", "m.s.", "m.s", "msc", "m.sc", "mba", 
                      "security clearance", "clearance", "TS/SCI", "Top Secret", "Secret Clearance"];

let postedJobs = new Set();

function isUSLocation(location) {
    return usStates.some(state => location.includes(state));
}

function excludesAdvancedDegrees(description) {
    if (!description) {
        return false; // If no description, assume it doesn't require advanced degrees
    }
    return excludeTerms.some(term => description.toLowerCase().includes(term));
}

function categorizeJob(jobTitle) {
    jobTitle = jobTitle.toLowerCase();
    for (const [channelId, keywords] of Object.entries(CHANNEL_ROLES)) {
        if (keywords.some(keyword => jobTitle.includes(keyword.toLowerCase()))) {
            return channelId;
        }
    }
    return null; // Return null if no matching category is found
}

async function postJobsToChannel() {
    console.log('Starting to scrape jobs...');
    const keywords = [
        "software engineer new grad 2025",
        "software engineer early career",
        "data scientist new grad 2025",
        "data engineer new grad 2025",
        "machine learning new grad 2025",
        "deep learning new grad 2025",
        "computer vision new grad 2025",
        "artificial intelligence new grad 2025",
        "software engineer intern 2025",
        "data scientist intern 2025",
        "machine learning intern 2025"
    ];
    const jobsByKeyword = await scrapeLinkedInJobs(keywords);

    console.log('Jobs by keyword:', JSON.stringify(jobsByKeyword, null, 2));

    if (Object.keys(jobsByKeyword).length === 0) {
        console.log('No new jobs found.');
        return;
    }

    try {
        for (const [keyword, jobs] of Object.entries(jobsByKeyword)) {
            for (const job of jobs) {
                if (!postedJobs.has(job.jobLink) && isUSLocation(job.location) && !excludesAdvancedDegrees(job.description || job.requirements || job.qualifications)) {
                    const channelId = categorizeJob(job.jobTitle);

                    if (channelId) {
                        const channel = await client.channels.fetch(channelId);

                        if (channel) {
                            const embed = new EmbedBuilder()
                                .setColor('#0077B5')
                                .setTitle(job.jobTitle)
                                .setURL(job.jobLink)
                                .setAuthor({ name: job.companyName })
                                .addFields(
                                    { name: 'Location', value: job.location, inline: true },
                                    { name: 'Keyword', value: keyword, inline: true }
                                )
                                .setFooter({ text: 'Click the title to apply!' });

                            console.log(`Posting job to channel: ${job.jobTitle}`);
                            await channel.send({ embeds: [embed] });

                            postedJobs.add(job.jobLink);
                        } else {
                            console.error(`Channel not found: ${channelId}`);
                        }
                    } else {
                        console.log(`No matching category for job: ${job.jobTitle}`);
                    }
                } else {
                    console.log(`Job not in the US, requires advanced degree, or already posted: ${job.jobTitle} (${job.location})`);
                }
            }
        }
        console.log('Successfully posted new jobs to relevant channels');
    } catch (error) {
        console.error('Error fetching or sending to channels:', error);
    }
}

module.exports = async (req, res) => {
    try {
        await initializeBot(); // Initialize the bot
        await postJobsToChannel(); // Post jobs

        // Respond to the HTTP request to complete the function
        res.status(200).send('Job postings updated.');
    } catch (error) {
        console.error('An error occurred:', error);
        res.status(500).send('Failed to update job postings.');
    }
};
