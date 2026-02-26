import { supabase } from '@/lib/supabase';

/**
 * Migrate localStorage data to Supabase on first login
 * This runs once per user and transfers all existing data
 */
export async function migrateLocalStorageToSupabase() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    const userId = session.user.id;

    // Check if already migrated
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      console.log('✓ User already migrated to Supabase');
      return;
    }

    // Create user profile (ignore if already exists)
    await supabase
      .from('user_profiles')
      .insert([{ id: userId }])
      .select();
    // Profile might already exist, that's fine - ignore error

    console.log('🔄 Migrating localStorage data to Supabase...');

    // Migrate favorites
    const favoritesStr = localStorage.getItem('osrs-favorites');
    if (favoritesStr) {
      try {
        const favorites = JSON.parse(favoritesStr);
        if (Array.isArray(favorites) && favorites.length > 0) {
          const favToInsert = favorites.map((fav: any) => ({
            user_id: userId,
            item_id: fav.id,
            item_name: fav.name,
          }));
          const { error } = await supabase
            .from('favorites')
            .insert(favToInsert, { onConflict: 'user_id,item_id' })
            .select();
          if (!error) console.log(`✓ Migrated ${favorites.length} favorites`);
        }
      } catch (err) {
        console.error('Failed to migrate favorites:', err);
      }
    }

    // Migrate portfolio items
    const portfolioStr = localStorage.getItem('osrs-portfolio-storage');
    if (portfolioStr) {
      try {
        const portfolioData = JSON.parse(portfolioStr);
        const items = portfolioData.state?.items || [];
        if (Array.isArray(items) && items.length > 0) {
          const itemsToInsert = items.map((item: any) => ({
            user_id: userId,
            item_id: item.itemId,
            item_name: item.itemName,
            quantity: item.quantity || 0,
            buy_price: item.buyPrice || 0,
            buy_date: item.datePurchased ? new Date(item.datePurchased).toISOString().split('T')[0] : null,
            notes: item.notes || '',
          }));
          const { error } = await supabase
            .from('portfolio_items')
            .insert(itemsToInsert, { onConflict: 'user_id,item_id' })
            .select();
          if (!error) console.log(`✓ Migrated ${items.length} portfolio items`);
        }
      } catch (err) {
        console.error('Failed to migrate portfolio:', err);
      }
    }

    // Migrate notes
    const notesStr = localStorage.getItem('item-notes-storage');
    if (notesStr) {
      try {
        const notesData = JSON.parse(notesStr);
        const notes = notesData.state?.notes || [];
        if (Array.isArray(notes) && notes.length > 0) {
          const notesToInsert = notes.map((note: any) => ({
            user_id: userId,
            item_id: note.itemId,
            item_name: note.itemName,
            notes: note.note || '',
            tags: note.tags || [],
          }));
          const { error } = await supabase
            .from('item_notes')
            .insert(notesToInsert, { onConflict: 'user_id,item_id' })
            .select();
          if (!error) console.log(`✓ Migrated ${notes.length} notes`);
        }
      } catch (err) {
        console.error('Failed to migrate notes:', err);
      }
    }

    // Migrate pending transactions
    const transactionsStr = localStorage.getItem('osrs-pending-transactions-storage');
    if (transactionsStr) {
      try {
        const transData = JSON.parse(transactionsStr);
        const transactions = transData.state?.transactions || [];
        if (Array.isArray(transactions) && transactions.length > 0) {
          const txToInsert = transactions.map((tx: any) => ({
            user_id: userId,
            item_id: tx.itemId || 0,
            item_name: tx.itemName,
            quantity: tx.quantity,
            price: tx.price,
            type: tx.type?.toLowerCase() || 'buy',
            dink_webhook_id: tx.id,
          }));
          const { error } = await supabase
            .from('pending_transactions')
            .insert(txToInsert)
            .select();
          if (!error) console.log(`✓ Migrated ${transactions.length} transactions`);
        }
      } catch (err) {
        console.error('Failed to migrate transactions:', err);
      }
    }

    // Migrate cached analyses
    const oppsStr = localStorage.getItem('osrs-cached-opps');
    if (oppsStr) {
      try {
        const opportunities = JSON.parse(oppsStr);
        if (Array.isArray(opportunities) && opportunities.length > 0) {
          const { error } = await supabase
            .from('analyses')
            .insert({
              user_id: userId,
              analysis_data: opportunities,
            })
            .select();
          if (!error) console.log(`✓ Migrated cached analysis (${opportunities.length} opportunities)`);
        }
      } catch (err) {
        console.error('Failed to migrate analyses:', err);
      }
    }

    console.log('✅ Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}
