import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { scrapeAllUpdates } from '@/lib/updateScraper';
import { 
  extractItemsFromUpdate, 
  matchItemToDatabase,
  mapRelationshipToImpactType,
  determineSentiment 
} from '@/lib/updateItemExtractor';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

/**
 * POST /api/admin/game-updates/scrape
 * Scrape OSRS updates and extract item impacts using AI
 */
export async function POST(request: Request) {
  try {
    const authorized = await isAdmin();
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { daysBack = 7 } = await request.json().catch(() => ({}));

    console.log(`\n🚀 Starting game update scraping (${daysBack} days back)...`);

    // Scrape updates from all sources
    const scrapedUpdates = await scrapeAllUpdates(daysBack);

    if (scrapedUpdates.length === 0) {
      return NextResponse.json({
        message: 'No new updates found',
        scraped: 0,
        processed: 0,
      });
    }

    const supabase = createServerSupabaseClient();
    let processedCount = 0;
    let itemsExtractedCount = 0;
    const errors: string[] = [];

    for (const update of scrapedUpdates) {
      try {
        // Check if update already exists (by title and date)
        const { data: existing } = await supabase
          .from('game_updates')
          .select('id')
          .eq('title', update.title)
          .eq('update_date', update.date)
          .single();

        if (existing) {
          console.log(`⏭️  Skipping existing update: "${update.title}"`);
          continue;
        }

        // Extract items using AI
        const extraction = await extractItemsFromUpdate(update.title, update.content);

        // Determine source type from category
        let sourceType: 'dev_blog' | 'game_update' | 'poll' | 'news' = 'news';
        if (update.category?.includes('update')) sourceType = 'game_update';
        else if (update.sourceUrl?.includes('poll')) sourceType = 'poll';
        else if (update.category?.includes('dev') || update.title.toLowerCase().includes('dev blog')) {
          sourceType = 'dev_blog';
        }

        // Insert update into database
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
          errors.push(`Failed to insert update "${update.title}": ${insertError?.message}`);
          continue;
        }

        console.log(`✅ Saved update: "${update.title}" (${extraction.items.length} items)`);

        // Insert item impacts
        for (const item of extraction.items) {
          try {
            // Match item name to database ID
            const matchedItem = await matchItemToDatabase(item.name);

            if (!matchedItem) {
              console.log(`⚠️  Could not match item: "${item.name}"`);
              continue;
            }

            const impactType = mapRelationshipToImpactType(item.relationship);
            const sentiment = determineSentiment(item.relationship, item.notes);

            const { error: impactError } = await supabase
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

            if (impactError) {
              console.error(`Error inserting impact for ${matchedItem.name}:`, impactError);
            } else {
              itemsExtractedCount++;
            }
          } catch (err) {
            console.error(`Error processing item "${item.name}":`, err);
          }
        }

        processedCount++;

        // Small delay between updates to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`Error processing update "${update.title}": ${errorMsg}`);
        console.error('Error processing update:', err);
      }
    }

    console.log('\n✅ Scraping complete!\n');

    return NextResponse.json({
      message: 'Scraping complete',
      scraped: scrapedUpdates.length,
      processed: processedCount,
      items_extracted: itemsExtractedCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json({ 
      error: 'Failed to scrape updates', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
