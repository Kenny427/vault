import { supabase } from '@/lib/supabase';

// Admin services use service role key for elevated permissions
// These should only be called from server-side API routes

export interface UserWithStats {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  rsn_count: number;
  favorites_count: number;
  portfolio_count: number;
  notes_count: number;
  alerts_count: number;
}

export interface UserRSNAccount {
  rsn: string;
  created_at: string;
}

export interface UserDetailedStats {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  rsn_accounts: UserRSNAccount[];
  favorites_count: number;
  portfolio_count: number;
  notes_count: number;
  alerts_count: number;
  transactions_count: number;
}

/**
 * Get all users with basic stats
 * Server-side only - requires service role key
 */
export async function getAllUsers(): Promise<UserWithStats[]> {
  try {
    // Get all users from auth.users (requires service role)
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching users:', authError);
      return [];
    }

    // For each user, get their stats
    const usersWithStats = await Promise.all(
      authUsers.users.map(async (user: any) => {
        // Get RSN count
        const { count: rsnCount } = await supabase
          .from('user_rsn_accounts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Get favorites count
        const { count: favoritesCount } = await supabase
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Get portfolio count
        const { count: portfolioCount } = await supabase
          .from('portfolio_items')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Get notes count
        const { count: notesCount } = await supabase
          .from('item_notes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Get alerts count
        const { count: alertsCount } = await supabase
          .from('price_alerts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        return {
          id: user.id,
          email: user.email || 'No email',
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at || user.created_at,
          rsn_count: rsnCount || 0,
          favorites_count: favoritesCount || 0,
          portfolio_count: portfolioCount || 0,
          notes_count: notesCount || 0,
          alerts_count: alertsCount || 0,
        };
      })
    );

    return usersWithStats;
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    return [];
  }
}

/**
 * Get detailed stats for a specific user
 * Server-side only - requires service role key
 */
export async function getUserDetailedStats(userId: string): Promise<UserDetailedStats | null> {
  try {
    // Get user from auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);

    if (authError || !authUser.user) {
      console.error('Error fetching user:', authError);
      return null;
    }

    // Get RSN accounts
    const { data: rsnAccounts } = await supabase
      .from('user_rsn_accounts')
      .select('rsn, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    // Get counts
    const { count: favoritesCount } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: portfolioCount } = await supabase
      .from('portfolio_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: notesCount } = await supabase
      .from('item_notes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: alertsCount } = await supabase
      .from('price_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: transactionsCount } = await supabase
      .from('pending_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    return {
      user_id: authUser.user.id,
      email: authUser.user.email || 'No email',
      created_at: authUser.user.created_at,
      last_sign_in_at: authUser.user.last_sign_in_at || authUser.user.created_at,
      rsn_accounts: rsnAccounts || [],
      favorites_count: favoritesCount || 0,
      portfolio_count: portfolioCount || 0,
      notes_count: notesCount || 0,
      alerts_count: alertsCount || 0,
      transactions_count: transactionsCount || 0,
    };
  } catch (error) {
    console.error('Error in getUserDetailedStats:', error);
    return null;
  }
}

/**
 * Get aggregated stats across all users
 * Server-side only - requires service role key
 */
export async function getAggregatedStats() {
  try {
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching users:', authError);
      return {
        total_users: 0,
        active_users_30d: 0,
        total_rsn_accounts: 0,
        total_favorites: 0,
        total_portfolio_items: 0,
        total_notes: 0,
        total_alerts: 0,
      };
    }

    const totalUsers = authUsers.users.length;

    // Count active users (signed in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = authUsers.users.filter((user: any) => {
      const lastSignIn = new Date(user.last_sign_in_at || user.created_at);
      return lastSignIn >= thirtyDaysAgo;
    }).length;

    // Get total counts across all tables
    const { count: totalRSNs } = await supabase
      .from('user_rsn_accounts')
      .select('*', { count: 'exact', head: true });

    const { count: totalFavorites } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true });

    const { count: totalPortfolio } = await supabase
      .from('portfolio_items')
      .select('*', { count: 'exact', head: true });

    const { count: totalNotes } = await supabase
      .from('item_notes')
      .select('*', { count: 'exact', head: true });

    const { count: totalAlerts } = await supabase
      .from('price_alerts')
      .select('*', { count: 'exact', head: true });

    return {
      total_users: totalUsers,
      active_users_30d: activeUsers,
      total_rsn_accounts: totalRSNs || 0,
      total_favorites: totalFavorites || 0,
      total_portfolio_items: totalPortfolio || 0,
      total_notes: totalNotes || 0,
      total_alerts: totalAlerts || 0,
    };
  } catch (error) {
    console.error('Error in getAggregatedStats:', error);
    return {
      total_users: 0,
      active_users_30d: 0,
      total_rsn_accounts: 0,
      total_favorites: 0,
      total_portfolio_items: 0,
      total_notes: 0,
      total_alerts: 0,
    };
  }
}
