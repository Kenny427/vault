import { NextResponse } from 'next/server';
import { scrapeAllUpdates } from '@/lib/updateScraper';
import { 
  extractItemsFromUpdate, 
  matchItemToDatabase,
  mapRelationshipToImpactType,
  determineSentiment 
} from '@/lib/updateItemExtractor';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

/**
 * GET /api/cron/scrape-updates
 * Scheduled scraper for OSRS game updates
 * Runs: Wednesday & Sunday at 12:00 PM UK time
 */
export async function GET(request: Request) {
  try {
    // Verify this is a cron request from Vercel
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('\n🕐 [CRON] Starting scheduled game update scrape...');
    console.log(`🕐 [CRON] Time: ${new Date().toISOString()}`);

    // Scrape last 7 days
    const scrapedUpdates = await scrapeAllUpdates(7);

    if (scrapedUpdates.length === 0) {
      console.log('📭 [CRON] No new updates found');
      return NextResponse.json({
        success: true,
        message: 'No new updates found',
        scraped: 0,
        processed: 0,
        timestamp: new Date().toISOString(),
      });
    }

    const supabase = createServerSupabaseClient();
    let processedCount = 0;
    let itemsExtractedCount = 0;
    const errors: string[] = [];

    for (const update of scrapedUpdates) {
      try {
        // Check if update already exists
        const { data: existing } = await supabase
          .from('game_updates')
          .select('id')
          .eq('title', update.title)
          .eq('update_date', update.date)
          .single();

        if (existing) {
          console.log(`⏭️  [CRON] Skipping existing update: "${update.title}"`);
          continue;
        }

        // Extract items using AI
        const extraction = await extractItemsFromUpdate(update.title, update.content);

        // Determine source type
        let sourceType: 'dev_blog' | 'game_update' | 'poll' | 'news' = 'news';
        if (update.category?.includes('update')) sourceType = 'game_update';
        else if (update.sourceUrl?.includes('poll')) sourceType = 'poll';
        else if (update.category?.includes('dev') || update.title.toLowerCase().includes('dev blog')) {
          sourceType = 'dev_blog';
        }

        // Insert update
        const { data: insertedUpdate, error: insertError } = await supabase
          .from('game_updates')
          .insert({
            update_date: update.date,
            title: update.title,
            content: update.content,
            source_type: sourceType,
            source_url: update.sourceUrl,
            category: extraction.category || update.category || null,
            impact_level: extraction.impact_level,
            overall_sentiment: extraction.overall_sentiment,
            is_reviewed: false,
            is_active: true,
          })
          .select()
          .single();

        if (insertError || !insertedUpdate) {
          errors.push(`Failed to insert: "${update.title}"`);
          continue;
        }

        console.log(`✅ [CRON] Saved: "${update.title}" (${extraction.items.length} items)`);

        // Insert item impacts
        for (const item of extraction.items) {
          try {
            const matchedItem = await matchItemToDatabase(item.name);
            if (!matchedItem) continue;

            const impactType = mapRelationshipToImpactType(item.relationship);
            const sentiment = determineSentiment(item.relationship, item.notes);

            await supabase
              .from('update_item_impacts')
              .insert({
                update_id: insertedUpdate.id,
                item_id: matchedItem.id,
                item_name: matchedItem.name,
                impact_type: impactType,
                sentiment: sentiment,
                confidence: item.confidence,
                quantity: item.quantity || null,
                notes: item.notes || null,
                is_verified: false,
              });

            itemsExtractedCount++;
          } catch (err) {
            console.error(`[CRON] Error processing item "${item.name}":`, err);
          }
        }

        processedCount++;

        // Small delay between updates
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`Error processing "${update.title}": ${errorMsg}`);
        console.error('[CRON] Error processing update:', err);
      }
    }

    console.log('\n✅ [CRON] Scraping complete!');
    console.log(`📊 [CRON] Stats: ${processedCount} processed, ${itemsExtractedCount} item impacts\n`);

    return NextResponse.json({
      success: true,
      message: 'Scraping complete',
      scraped: scrapedUpdates.length,
      processed: processedCount,
      items_extracted: itemsExtractedCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[CRON] Fatal error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to scrape updates', 
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
