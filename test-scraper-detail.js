// Detailed structure test
const axios = require('axios');
const cheerio = require('cheerio');

async function testDetailedStructure() {
  console.log('🔍 Testing detailed article structure\n');
  
  try {
    const response = await axios.get('https://secure.runescape.com/m=news/archive?oldschool=true', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(response.data);
    
    console.log('=== Analyzing .news-list-article structure ===\n');
    
    $('.news-list-article').each((i, element) => {
      const $article = $(element);
      
      console.log(`Article #${i + 1}:`);
      console.log(`  HTML: ${$article.html().slice(0, 500)}...\n`);
      
      // Try different selectors
      const title = $article.find('.news-list-article__feature__title').text().trim() ||
                   $article.find('.title').text().trim() ||
                   $article.find('h3').text().trim() ||
                   $article.find('h2').text().trim();
      
      const date = $article.find('.news-list-article__date').text().trim() ||
                  $article.find('.date').text().trim() ||
                  $article.find('time').text().trim();
      
      const link = $article.find('a').first().attr('href');
      const category = $article.find('.news-list-article__category').text().trim() ||
                      $article.find('.category').text().trim();
      
      console.log(`  Title: "${title}"`);
      console.log(`  Date: "${date}"`);
      console.log(`  Link: "${link}"`);
      console.log(`  Category: "${category}"`);
      console.log(`  Classes: ${$article.attr('class')}`);
      console.log('');
    });
    
    // Also check the full HTML of one article
    const firstArticle = $('.news-list-article').first();
    if (firstArticle.length) {
      console.log('=== Full HTML of first article ===');
      console.log(firstArticle.html());
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDetailedStructure();
