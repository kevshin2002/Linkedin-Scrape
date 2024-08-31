const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeLinkedInJobs(keywords) {
    try {
        console.log('Starting scrapeLinkedInJobs function...');
        const jobsByKeyword = {};

        for (const keyword of keywords) {
            try {
                console.log(`Scraping LinkedIn for ${keyword} jobs...`);

                const url = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keyword)}&location=Worldwide&start=0&count=25`; 
                console.log(`Fetching URL: ${url}`);
                
                const { data } = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });
                console.log('Data fetched from LinkedIn.');

                const $ = cheerio.load(data);

                console.log('HTML structure:', $.html().slice(0, 500)); // Log the first 500 characters of HTML

                const jobs = [];

                $('.jobs-search__results-list li').each((i, el) => {
                    const jobTitle = $(el).find('h3.base-search-card__title').text().trim();
                    const companyName = $(el).find('h4.base-search-card__subtitle').text().trim();
                    const location = $(el).find('.job-search-card__location').text().trim();
                    const salary = $(el).find('.job-search-card__salary-info').text().trim() || 'Not specified';
                    const jobLink = $(el).find('a.base-card__full-link').attr('href');

                    console.log(`Found job: ${jobTitle} at ${companyName}`);

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
                    console.log(`Found ${jobs.length} jobs for ${keyword}.`);
                } else {
                    console.log(`No jobs found for ${keyword}. This might indicate a problem with the scraper.`);
                }
            } catch (error) {
                console.error(`Error scraping LinkedIn for ${keyword}:`, error);
            }
        }

        return jobsByKeyword;
    } catch (error) {
        console.error('An unexpected error occurred:', error);
        return {};
    }
}

module.exports = scrapeLinkedInJobs;