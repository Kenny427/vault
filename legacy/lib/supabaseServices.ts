import { supabase } from '@/lib/supabase';

// ============ FAVORITES ============
export async function getFavorites() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return [];

  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', session.user.id);

  if (error) {
    console.error('Error fetching favorites:', error);
    return [];
  }
  return data || [];
}

export async function addFavorite(itemId: number, itemName: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('favorites')
    .insert([{
      user_id: session.user.id,
      item_id: itemId,
      item_name: itemName,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeFavorite(itemId: number) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', session.user.id)
    .eq('item_id', itemId);

  if (error) throw error;
}

// ============ PORTFOLIO ============
export async function getPortfolioItems() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return [];

  const { data, error } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('user_id', session.user.id);

  if (error) {
    console.error('Error fetching portfolio:', error);
    return [];
  }
  return data || [];
}

export async function addPortfolioItem(item: {
  item_id: number;
  item_name: string;
  quantity: number;
  buy_price: number;
  buy_date: Date;
  notes?: string;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('portfolio_items')
    .insert([{
      user_id: session.user.id,
      ...item,
      buy_date: item.buy_date.toISOString(),
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePortfolioItem(id: string, updates: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('portfolio_items')
    .update(updates)
    .eq('id', id)
    .eq('user_id', session.user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePortfolioItem(id: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('portfolio_items')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (error) throw error;
}

// ============ ITEM NOTES ============
export async function getItemNotes(itemId: number) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return null;

  const { data, error } = await supabase
    .from('item_notes')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('item_id', itemId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('Error fetching note:', error);
  }
  return data || null;
}

export async function getAllItemNotes() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return [];

  const { data, error } = await supabase
    .from('item_notes')
    .select('*')
    .eq('user_id', session.user.id);

  if (error) {
    console.error('Error fetching notes:', error);
    return [];
  }
  return data || [];
}

export async function upsertItemNote(itemId: number, itemName: string, notes: string, tags?: string[]) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('item_notes')
    .upsert([{
      user_id: session.user.id,
      item_id: itemId,
      item_name: itemName,
      notes,
      tags: tags || [],
    }], { onConflict: 'user_id,item_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteItemNote(itemId: number) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('item_notes')
    .delete()
    .eq('user_id', session.user.id)
    .eq('item_id', itemId);

  if (error) throw error;
}

// ============ PRICE ALERTS ============
export async function getPriceAlerts() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return [];

  const { data, error } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching alerts:', error);
    return [];
  }
  return data || [];
}

export async function addPriceAlert(itemId: number, itemName: string, alertType: 'above' | 'below', alertPrice: number) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('price_alerts')
    .insert([{
      user_id: session.user.id,
      item_id: itemId,
      item_name: itemName,
      alert_type: alertType,
      alert_price: alertPrice,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePriceAlert(id: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('price_alerts')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (error) throw error;
}

// ============ ANALYSES ============
export async function getLatestAnalysis() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return null;

  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching analysis:', error);
  }
  return data || null;
}

export async function saveAnalysis(analysisData: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('analyses')
    .insert([{
      user_id: session.user.id,
      analysis_data: analysisData,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============ PENDING TRANSACTIONS ============
export async function getPendingTransactions() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return [];

  const { data, error } = await supabase
    .from('pending_transactions')
    .select('*')
    .eq('user_id', session.user.id);

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
  return data || [];
}

export async function addPendingTransaction(transaction: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('pending_transactions')
    .insert([{
      user_id: session.user.id,
      ...transaction,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePendingTransaction(id: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('pending_transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (error) throw error;
}

// ============ USER PROFILE ============
export async function getUserProfile() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching profile:', error);
  }
  return data || null;
}

export async function updateUserProfile(updates: { rsn?: string }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert([{
      id: session.user.id,
      ...updates,
      updated_at: new Date().toISOString(),
    }], { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}
