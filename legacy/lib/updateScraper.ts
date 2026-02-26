/**
 * OSRS Game Updates Scraper
 * Scrapes game updates, dev blogs, and news from OSRS sources
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { ScrapedUpdate } from '@/lib/types/gameUpdates';

const OSRS_NEWS_URL = 'https://secure.runescape.com/m=news/archive?oldschool=true';

/**
 * Scrape OSRS official news articles
 */
export async function scrapeOSRSNews(daysBack: number = 7): Promise<ScrapedUpdate[]> {
  try {
    console.log('🔍 Scraping OSRS official news...');
    
    const response = await axios.get(OSRS_NEWS_URL, {
      headers: {
        'User-Agent': 'osrs-flipping-dashboard-bot/1.0',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(response.data);
    const updates: ScrapedUpdate[] = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    console.log(`📅 Looking for articles since ${cutoffDate.toLocaleDateString()}`);

    // Find news articles (correct selector from actual page)
    $('.news-list-article').each((_: number, element: any) => {
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
        
        console.log(`  📰 Found: "${title}" - ${dateStr} (${articleDate.toISOString()})`);
        
        // Only include recent articles
        if (articleDate >= cutoffDate && title && link) {
          updates.push({
            date: articleDate.toISOString(),
            title,
            content: '', // Will be fetched separately if needed
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

    console.log(`✅ Found ${updates.length} recent news articles`);
    return updates;
  } catch (error) {
    console.error('Error scraping OSRS news:', error);
    return [];
  }
}

/**
 * Scrape OSRS Wiki game updates page
 * Note: Wiki structure is complex, focusing on main news source for now
 */
export async function scrapeWikiUpdates(_daysBack: number = 7): Promise<ScrapedUpdate[]> {
  try {
    console.log('🔍 Scraping OSRS Wiki game updates...');
    console.log('⚠️  Wiki scraper is simplified - focusing on official news for reliability');
    
    // For now, return empty array
    // The official OSRS news is more reliable and structured
    // Can enhance this later if needed
    
    return [];
  } catch (error) {
    console.error('Error scraping wiki updates:', error);
    return [];
  }
}

/**
 * Fetch full content of a news article
 */
export async function fetchArticleContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'osrs-flipping-dashboard-bot/1.0',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(response.data);
    
    // Try different possible content selectors
    const selectors = [
      '.article__content',
      '.news-article__content',
      '.article-body',
      '#content .mw-parser-output',
    ];

    for (const selector of selectors) {
      const content = $(selector).text().trim();
      if (content) {
        return content;
      }
    }

    // Fallback to body text
    return $('body').text().trim().slice(0, 10000); // Limit to 10k chars
  } catch (error) {
    console.error('Error fetching article content:', error);
    return '';
  }
}

/**
 * Main scraper function - combines all sources
 */
export async function scrapeAllUpdates(daysBack: number = 7): Promise<ScrapedUpdate[]> {
  console.log(`\n🚀 Starting OSRS update scraper (last ${daysBack} days)...`);
  
  const [newsUpdates, wikiUpdates] = await Promise.all([
    scrapeOSRSNews(daysBack),
    scrapeWikiUpdates(daysBack),
  ]);

  // Fetch full content for news articles
  for (const update of newsUpdates) {
    if (!update.content && update.sourceUrl) {
      update.content = await fetchArticleContent(update.sourceUrl);
      // Small delay to be respectful
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const allUpdates = [...newsUpdates, ...wikiUpdates];
  
  // Remove duplicates based on title similarity
  const uniqueUpdates = allUpdates.filter((update, index, self) =>
    index === self.findIndex(u => 
      u.title.toLowerCase() === update.title.toLowerCase()
    )
  );

  console.log(`\n✅ Scraping complete: ${uniqueUpdates.length} unique updates found\n`);
  
  return uniqueUpdates;
}
