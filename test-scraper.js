// Test script to debug the scraper locally
const axios = require('axios');
const cheerio = require('cheerio');

const OSRS_NEWS_URL = 'https://secure.runescape.com/m=news/archive?oldschool=true';
const OSRS_WIKI_UPDATES_URL = 'https://oldschool.runescape.wiki/w/Game_updates';

async function testOSRSNews() {
  console.log('\n=== Testing OSRS Official News ===');
  console.log(`URL: ${OSRS_NEWS_URL}\n`);
  
  try {
    const response = await axios.get(OSRS_NEWS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 30000,
    });

    console.log('✅ Page fetched successfully');
    console.log(`📄 Response length: ${response.data.length} chars\n`);

    const $ = cheerio.load(response.data);
    
    // Try different selectors
    console.log('Testing selectors:');
    console.log(`  .news-article: ${$('.news-article').length} found`);
    console.log(`  article: ${$('article').length} found`);
    console.log(`  .article: ${$('.article').length} found`);
    console.log(`  .news-item: ${$('.news-item').length} found`);
    console.log(`  .newspost: ${$('.newspost').length} found\n`);

    // Try to find ANY links
    const allLinks = $('a');
    console.log(`Total links found: ${allLinks.length}`);
    
    // Show first 10 article-related elements
    console.log('\nFirst 5 article-like elements:');
    $('article, .article, .news-article, .newspost, .news-item').slice(0, 5).each((i, el) => {
      const $el = $(el);
      const text = $el.text().trim().slice(0, 100);
      console.log(`  ${i + 1}. ${$el.prop('tagName')} .${$el.attr('class')} - ${text}...`);
    });

    // Try to get some text content
    console.log('\n=== Sample HTML Structure ===');
    const bodyHtml = $('body').html();
    if (bodyHtml) {
      // Look for patterns
      const hasNewsSection = bodyHtml.includes('news');
      const hasArticleSection = bodyHtml.includes('article');
      console.log(`Contains "news": ${hasNewsSection}`);
      console.log(`Contains "article": ${hasArticleSection}`);
      
      // Show a sample of the HTML
      console.log('\nFirst 1000 chars of body:');
      console.log(bodyHtml.slice(0, 1000));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testWikiUpdates() {
  console.log('\n\n=== Testing OSRS Wiki Updates ===');
  console.log(`URL: ${OSRS_WIKI_UPDATES_URL}\n`);
  
  try {
    const response = await axios.get(OSRS_WIKI_UPDATES_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 30000,
    });

    console.log('✅ Page fetched successfully');
    console.log(`📄 Response length: ${response.data.length} chars\n`);

    const $ = cheerio.load(response.data);
    
    console.log('Testing selectors:');
    console.log(`  h2: ${$('h2').length} found`);
    console.log(`  h3: ${$('h3').length} found`);
    console.log(`  h4: ${$('h4').length} found\n`);

    // Show first 5 headings
    console.log('First 5 headings:');
    $('h2, h3').slice(0, 5).each((i, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      console.log(`  ${i + 1}. ${$el.prop('tagName')}: ${text}`);
    });

    // Try to find date patterns
    console.log('\n=== Looking for date patterns ===');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    $('h2, h3, h4').each((i, el) => {
      const text = $(el).text();
      const hasMonth = months.some(month => text.includes(month));
      const hasYear = /202[4-6]/.test(text);
      
      if (hasMonth || hasYear) {
        console.log(`  Found: ${text.trim()}`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  console.log('🧪 OSRS Update Scraper - Debug Test\n');
  console.log('This script will help identify the correct selectors for scraping.\n');
  
  await testOSRSNews();
  await testWikiUpdates();
  
  console.log('\n✅ Test complete!\n');
}

main().catch(console.error);
