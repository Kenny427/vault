import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('[Migration API] Supabase URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('[Migration API] Service Role Key:', serviceRoleKey ? 'Set' : 'Missing');

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    // Server-side Supabase client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const body = await request.json();
    const { userId, favorites, portfolio, notes, transactions, analyses } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    console.log(`[Migration API] Starting migration for user ${userId}`);

    // Check if already migrated
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[Migration API] Error checking profile:', checkError);
    }

    if (existingProfile) {
      console.log('[Migration API] User already migrated');
      return NextResponse.json({ status: 'already_migrated' });
    }

    // Create user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert([{ id: userId }])
      .select();

    if (profileError && profileError.code !== '23505') {
      console.error('[Migration API] Error creating profile:', profileError);
    }

    console.log('[Migration API] Created user profile');

    // Migrate favorites
    if (favorites && Array.isArray(favorites) && favorites.length > 0) {
      const favToInsert = favorites.map((fav: any) => ({
        user_id: userId,
        item_id: fav.id,
        item_name: fav.name,
      }));
      const { error } = await supabaseAdmin
        .from('favorites')
        .upsert(favToInsert, { onConflict: 'user_id,item_id' });
      if (!error) console.log(`[Migration API] Migrated ${favorites.length} favorites`);
    }

    // Migrate portfolio items
    if (portfolio && Array.isArray(portfolio) && portfolio.length > 0) {
      const itemsToInsert = portfolio.map((item: any) => ({
        user_id: userId,
        item_id: item.itemId,
        item_name: item.itemName,
        quantity: item.quantity || 0,
        buy_price: item.buyPrice || 0,
        buy_date: item.datePurchased ? new Date(item.datePurchased).toISOString().split('T')[0] : null,
        notes: item.notes || '',
      }));
      const { error } = await supabaseAdmin
        .from('portfolio_items')
        .upsert(itemsToInsert, { onConflict: 'user_id,item_id' });
      if (!error) console.log(`[Migration API] Migrated ${portfolio.length} portfolio items`);
    }

    // Migrate notes
    if (notes && Array.isArray(notes) && notes.length > 0) {
      const notesToInsert = notes.map((note: any) => ({
        user_id: userId,
        item_id: note.itemId,
        item_name: note.itemName,
        notes: note.note || '',
        tags: note.tags || [],
      }));
      const { error } = await supabaseAdmin
        .from('item_notes')
        .upsert(notesToInsert, { onConflict: 'user_id,item_id' });
      if (!error) console.log(`[Migration API] Migrated ${notes.length} notes`);
    }

    // Migrate transactions
    if (transactions && Array.isArray(transactions) && transactions.length > 0) {
      const txToInsert = transactions.map((tx: any) => ({
        user_id: userId,
        item_id: tx.itemId || 0,
        item_name: tx.itemName,
        quantity: tx.quantity,
        price: tx.price,
        type: tx.type?.toLowerCase() || 'buy',
        dink_webhook_id: tx.id,
      }));
      const { error } = await supabaseAdmin
        .from('pending_transactions')
        .upsert(txToInsert, { onConflict: 'user_id,dink_webhook_id' });
      if (!error) console.log(`[Migration API] Migrated ${transactions.length} transactions`);
    }

    // Migrate analyses
    if (analyses && Array.isArray(analyses) && analyses.length > 0) {
      const { error } = await supabaseAdmin
        .from('analyses')
        .insert({
          user_id: userId,
          analysis_data: analyses,
        });
      if (!error) console.log(`[Migration API] Migrated ${analyses.length} analyses`);
    }

    console.log('[Migration API] Migration complete!');
    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('[Migration API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
