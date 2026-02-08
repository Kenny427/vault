// Test the fixed scraper logic
import axios from 'axios';
import * as cheerio from 'cheerio';

async function scrapeOSRSNews(daysBack = 7) {
  try {
    console.log('🔍 Scraping OSRS official news...');
    
    const response = await axios.get('https://secure.runescape.com/m=news/archive?oldschool=true', {
      headers: {
        'User-Agent': 'osrs-flipping-dashboard-bot/1.0',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(response.data);
    const updates = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    console.log(`📅 Looking for articles since ${cutoffDate.toLocaleDateString()}\n`);

    // Find news articles (correct selector from actual page)
    $('.news-list-article').each((_, element) => {
      try {
        const $article = $(element);
        const title = $article.find('.news-list-article__title').text().trim() || 
                     $article.find('.news-list-article__title-link').text().trim();
        const dateStr = $article.find('.news-list-article__date').text().trim();
        const link = $article.find('.news-list-article__title-link').attr('href') ||
                    $article.find('a').first().attr('href');
        const category = $article.find('.news-list-article__category').text().trim();

        // Parse date (format: "04 February 2026")
        const articleDate = new Date(dateStr);
        
        console.log(`  📰 Found: "${title}" - ${dateStr}`);
        
        // Only include recent articles
        if (articleDate >= cutoffDate && title && link) {
          updates.push({
            date: articleDate.toISOString(),
            title,
            content: '',
            sourceUrl: link.startsWith('http') ? link : `https://secure.runescape.com${link}`,
            category: category || 'general',
          });
          console.log(`    ✅ Added (within date range)`);
        } else {
          console.log(`    ⏭️  Skipped (${!title ? 'no title' : !link ? 'no link' : 'too old'})`);
        }
      } catch (err) {
        console.error('Error parsing news article:', err);
      }
    });

    console.log(`\n✅ Found ${updates.length} recent news articles`);
    return updates;
  } catch (error) {
    console.error('Error scraping OSRS news:', error);
    return [];
  }
}

async function test() {
  console.log('🧪 Testing updated scraper...\n');
  
  const updates = await scrapeOSRSNews(7);
  
  console.log(`\n📊 RESULT: ${updates.length} updates found\n`);
  
  if (updates.length > 0) {
    console.log('Sample update:');
    console.log(JSON.stringify(updates[0], null, 2));
  }
}

test().catch(console.error);
