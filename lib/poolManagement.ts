import { supabase } from '@/lib/supabase';
import { createAdminSupabaseClient } from '@/lib/supabaseAdmin';

// Lazy-load admin client to avoid module-load crashes
let adminSupabaseInstance: any = null;
function getAdminSupabase() {
    if (!adminSupabaseInstance) {
        adminSupabaseInstance = createAdminSupabaseClient();
    }
    return adminSupabaseInstance;
}

const adminSupabase = new Proxy({} as any, {
    get: (_target, prop) => {
        return getAdminSupabase()[prop];
    },
});

// ============================================
// POOL MANAGEMENT
// ============================================

export interface PoolItem {
    id: string;
    item_id: number;
    item_name: string;
    category: string | null;
    priority: number;
    enabled: boolean;
    tags: string[];
    notes: string | null;
    buy_limit: number | null;
    daily_volume: number | null;
    last_volume_update: string | null;
    added_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface ItemPerformance {
    id: string;
    item_id: number;
    item_name: string;
    times_analyzed: number;
    times_approved: number;
    times_rejected: number;
    total_roi_potential: number;
    avg_confidence_score: number;
    success_rate: number;
    last_analyzed_at: string | null;
    last_approved_at: string | null;
}

/**
 * Get all custom pool items (admin only)
 */
export async function getCustomPoolItems() {
    try {
        const { data, error } = await adminSupabase
            .from('custom_pool_items')
            .select('*')
            .order('priority', { ascending: false })
            .order('item_name', { ascending: true });

        if (error) {
            console.error('Error fetching pool items:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Failed to fetch pool items:', error);
        return [];
    }
}

/**
 * Add item to custom pool (admin only)
 */
export async function addPoolItem(item: {
    item_id: number;
    item_name: string;
    category?: string;
    priority?: number;
    tags?: string[];
    notes?: string;
    added_by: string;
}) {
    try {
        const { data, error } = await adminSupabase
            .from('custom_pool_items')
            .insert({
                item_id: item.item_id,
                item_name: item.item_name,
                category: item.category || null,
                priority: item.priority || 0,
                tags: item.tags || [],
                notes: item.notes || null,
                added_by: item.added_by,
            })
            .select()
            .single();

        if (error) {
            console.error('Error adding pool item:', error.message, error.details);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Failed to add pool item:', error);
        return null;
    }
}

/**
 * Update pool item (admin only)
 */
export async function updatePoolItem(id: string, updates: Partial<PoolItem>) {
    try {
        const { data, error } = await adminSupabase
            .from('custom_pool_items')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating pool item:', error.message, error.details);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Failed to update pool item:', error);
        return null;
    }
}

/**
 * Delete pool item (admin only)
 */
export async function deletePoolItem(id: string) {
    try {
        const { error } = await adminSupabase
            .from('custom_pool_items')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting pool item:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Failed to delete pool item:', error);
        return false;
    }
}

// ============================================
// ITEM PERFORMANCE TRACKING
// ============================================

/**
 * Get item performance stats (admin only)
 */
export async function getItemPerformance() {
    try {
        const { data, error } = await adminSupabase
            .from('item_performance_tracking')
            .select('*')
            .order('times_analyzed', { ascending: false });

        if (error) {
            console.error('Error fetching item performance:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Failed to fetch item performance:', error);
        return [];
    }
}

/**
 * Get pool optimization recommendations
 */
export async function getPoolRecommendations() {
    try {
        const performance = await getItemPerformance();

        // Items to consider removing (low success rate, analyzed multiple times)
        const underperformers = performance.filter(
            (item: any) => item.times_analyzed >= 5 && item.success_rate < 20
        );

        // Items performing well (high success rate)
        const topPerformers = performance
            .filter((item: any) => item.times_analyzed >= 3 && item.success_rate >= 70)
            .sort((a: any, b: any) => b.success_rate - a.success_rate)
            .slice(0, 10);

        // Items that haven't been analyzed recently
        const staleItems = performance.filter((item: any) => {
            if (!item.last_analyzed_at) return false;
            const daysSinceAnalysis =
                (Date.now() - new Date(item.last_analyzed_at).getTime()) /
                (1000 * 60 * 60 * 24);
            return daysSinceAnalysis > 30 && item.times_analyzed > 0;
        });

        // Calculate overall pool health
        const totalItems = performance.length;
        const avgSuccessRate =
            performance.reduce((sum: number, item: any) => sum + item.success_rate, 0) /
            (totalItems || 1);

        return {
            underperformers,
            topPerformers,
            staleItems,
            poolHealth: {
                totalItems,
                avgSuccessRate,
                healthScore: Math.min(100, avgSuccessRate + (totalItems >= 50 ? 10 : 0)),
            },
        };
    } catch (error) {
        console.error('Failed to get pool recommendations:', error);
        return null;
    }
}

// ============================================
// RATE LIMITING
// ============================================

export interface RateLimit {
    id: string;
    user_id: string;
    daily_limit: number;
    current_usage: number;
    last_reset: string;
}

/**
 * Get all rate limits (admin only)
 */
export async function getAllRateLimits() {
    try {
        const { data, error } = await supabase
            .from('rate_limits')
            .select('*')
            .order('current_usage', { ascending: false });

        if (error) {
            console.error('Error fetching rate limits:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Failed to fetch rate limits:', error);
        return [];
    }
}

/**
 * Update user rate limit (admin only)
 */
export async function updateRateLimit(userId: string, dailyLimit: number) {
    try {
        const { data, error } = await supabase
            .from('rate_limits')
            .upsert({
                user_id: userId,
                daily_limit: dailyLimit,
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            console.error('Error updating rate limit:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Failed to update rate limit:', error);
        return null;
    }
}

/**
 * Increment user API usage
 */
export async function incrementUsage(userId: string) {
    try {
        // Get or create rate limit
        let { data: rateLimit } = await supabase
            .from('rate_limits')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (!rateLimit) {
            // Create default rate limit
            const { data: newLimit } = await supabase
                .from('rate_limits')
                .insert({
                    user_id: userId,
                    daily_limit: 100,
                    current_usage: 1,
                })
                .select()
                .single();

            return newLimit;
        }

        // Check if needs reset (more than 24 hours since last reset)
        const hoursSinceReset =
            (Date.now() - new Date(rateLimit.last_reset).getTime()) / (1000 * 60 * 60);

        if (hoursSinceReset >= 24) {
            // Reset usage
            const { data } = await supabase
                .from('rate_limits')
                .update({
                    current_usage: 1,
                    last_reset: new Date().toISOString(),
                })
                .eq('user_id', userId)
                .select()
                .single();

            return data;
        }

        // Increment usage
        const { data } = await supabase
            .from('rate_limits')
            .update({
                current_usage: rateLimit.current_usage + 1,
            })
            .eq('user_id', userId)
            .select()
            .single();

        return data;
    } catch (error) {
        console.error('Failed to increment usage:', error);
        return null;
    }
}

/**
 * Check if user has exceeded rate limit
 */
export async function checkRateLimit(userId: string): Promise<boolean> {
    try {
        const { data: rateLimit } = await supabase
            .from('rate_limits')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (!rateLimit) {
            return true; // No limit set, allow
        }

        // Check if needs reset
        const hoursSinceReset =
            (Date.now() - new Date(rateLimit.last_reset).getTime()) / (1000 * 60 * 60);

        if (hoursSinceReset >= 24) {
            return true; // Reset period passed, allow
        }

        return rateLimit.current_usage < rateLimit.daily_limit;
    } catch (error) {
        console.error('Failed to check rate limit:', error);
        return true; // On error, allow
    }
}

// ============================================
// DATABASE HEALTH
// ============================================

/**
 * Get database health statistics (admin only)
 */
export async function getDatabaseHealth() {
    try {
        // Get table row counts
        const tables = [
            'favorites',
            'portfolio_items',
            'item_notes',
            'price_alerts',
            'pending_transactions',
            'user_rsn_accounts',
            'system_analytics',
            'error_logs',
            'notifications',
            'user_notifications',
            'custom_pool_items',
            'item_performance_tracking',
            'rate_limits',
        ];

        const counts: Record<string, number> = {};

        for (const table of tables) {
            const { count, error } = await adminSupabase
                .from(table)
                .select('*', { count: 'exact', head: true });

            if (!error) {
                counts[table] = count || 0;
            }
        }

        // Calculate total records
        const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);

        // Get recent growth (records added in last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentGrowth: Record<string, number> = {};

        for (const table of tables) {
            const { count } = await adminSupabase
                .from(table)
                .select('*', { count: 'exact', head: true })
                .gte('created_at', sevenDaysAgo.toISOString());

            recentGrowth[table] = count || 0;
        }

        return {
            tableCounts: counts,
            totalRecords,
            recentGrowth,
            healthScore: totalRecords > 0 ? 100 : 0, // Simple health score
        };
    } catch (error) {
        console.error('Failed to get database health:', error);
        return null;
    }
}
