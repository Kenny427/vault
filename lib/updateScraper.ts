/**
 * OSRS Game Updates Scraper
 * Scrapes game updates, dev blogs, and news from OSRS sources
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { ScrapedUpdate } from '@/lib/types/gameUpdates';

const OSRS_NEWS_URL = 'https://secure.runescape.com/m=news/archive?oldschool=true';
const OSRS_WIKI_UPDATES_URL = 'https://oldschool.runescape.wiki/w/Game_updates';

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

    // Find news articles
    $('.news-article').each((_: number, element: any) => {
      try {
        const $article = $(element);
        const title = $article.find('.news-article__title').text().trim();
        const dateStr = $article.find('.news-article__date').text().trim();
        const link = $article.find('a').attr('href');
        const category = $article.find('.news-article__category').text().trim();

        // Parse date
        const articleDate = new Date(dateStr);
        
        // Only include recent articles
        if (articleDate >= cutoffDate && title && link) {
          updates.push({
            date: articleDate.toISOString(),
            title,
            content: '', // Will be fetched separately if needed
            sourceUrl: link.startsWith('http') ? link : `https://secure.runescape.com${link}`,
            category: category || 'general',
          });
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
 */
export async function scrapeWikiUpdates(daysBack: number = 7): Promise<ScrapedUpdate[]> {
  try {
    console.log('🔍 Scraping OSRS Wiki game updates...');
    
    const response = await axios.get(OSRS_WIKI_UPDATES_URL, {
      headers: {
        'User-Agent': 'osrs-flipping-dashboard-bot/1.0',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(response.data);
    const updates: ScrapedUpdate[]= [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    // Find update entries (structure varies, adjust selector as needed)
    $('h2, h3').each((_: number, element: any) => {
      try {
        const $heading = $(element);
        const headingText = $heading.text().trim();
        
        // Try to parse date from heading (e.g., "4 February 2026")
        const dateMatch = headingText.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
        if (!dateMatch) return;

        const [, day, month, year] = dateMatch;
        const articleDate = new Date(`${month} ${day}, ${year}`);
        
        if (articleDate >= cutoffDate) {
          // Get content from following siblings until next heading
          let content = '';
          let $next = $heading.next();
          
          while ($next.length && !['H2', 'H3'].includes($next.prop('tagName') || '')) {
            content += $next.text().trim() + '\n';
            $next = $next.next();
          }

          if (content.trim()) {
            updates.push({
              date: articleDate.toISOString(),
              title: headingText,
              content: content.trim(),
              sourceUrl: OSRS_WIKI_UPDATES_URL,
              category: 'game_update',
            });
          }
        }
      } catch (err) {
        console.error('Error parsing wiki update:', err);
      }
    });

    console.log(`✅ Found ${updates.length} recent wiki updates`);
    return updates;
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
