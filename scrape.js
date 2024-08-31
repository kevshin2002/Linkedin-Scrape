const axios = require('axios');
const cheerio = require('cheerio');

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

module.exports = scrapeLinkedInJobs;
