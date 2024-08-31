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

async function postJobsToChannel(start = 0) {
    console.log(`Starting to scrape jobs from offset ${start}...`);
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
    
    const jobsByKeyword = await scrapeLinkedInJobs(keywords, start);

    if (Object.keys(jobsByKeyword).length === 0) {
        console.log('No new jobs found.');
        return;
    }

    let jobsPosted = 0;

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
                            jobsPosted++;

                            // Break if about to hit the time limit
                            if (jobsPosted >= 5) {
                                console.log(`Posted ${jobsPosted} jobs, pausing to avoid timeout...`);
                                setTimeout(() => {
                                    postJobsToChannel(start + jobsPosted);
                                }, 1000); // Wait for 1 second before processing the next batch
                                return;
                            }
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
    } catch (error) {
        console.error('Error in postJobsToChannel:', error);
    }
}

// Triggered by an HTTP request
module.exports = async (req, res) => {
    try {
        await initializeBot();
        await postJobsToChannel();

        res.status(200).send('Job postings updated.');
    } catch (error) {
        console.error('An error occurred:', error);
        res.status(500).send('Failed to update job postings.');
    }
};

async function scrapeLinkedInJobs(keywords, start = 0) {
    try {
        const jobsByKeyword = {};
        for (const keyword of keywords) {
            const url = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keyword)}&location=Worldwide&start=${start}&count=25`; 
            const { data } = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            const $ = cheerio.load(data);
            const jobs = [];
            $('.jobs-search__results-list li').each((i, el) => {
                const jobTitle = $(el).find('h3.base-search-card__title').text().trim();
                const companyName = $(el).find('h4.base-search-card__subtitle').text().trim();
                const location = $(el).find('.job-search-card__location').text().trim();
                const salary = $(el).find('.job-search-card__salary-info').text().trim() || 'Not specified';
                const jobLink = $(el).find('a.base-card__full-link').attr('href');

                if (jobTitle && companyName && jobLink) {
                    jobs.push({ 
                        jobTitle, 
                        companyName, 
                        location,
                        salary, 
                        jobLink 
                    });
                }
            });
            if (jobs.length > 0) {
                jobsByKeyword[keyword] = jobs;
            }
        }
        return jobsByKeyword;
    } catch (error) {
        console.error('An unexpected error occurred:', error);
        return {};
    }
}