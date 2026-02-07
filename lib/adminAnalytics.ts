import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseAdmin';

// Lazy initialization - don't create client until first use
let _adminSupabase: ReturnType<typeof createAdminSupabaseClient> | null = null;

function getAdminSupabase() {
    if (!_adminSupabase) {
        _adminSupabase = createAdminSupabaseClient();
        
        // Log initialization in development/production for debugging
        if (process.env.NODE_ENV === 'development') {
            console.log('🔧 Admin Supabase client initialized for analytics');
        }
    }
    return _adminSupabase;
}

/**
 * AI Model Costs (per 1k tokens)
 * Prices as of early 2024
 */
export const AI_COST_RATES = {
    'gpt-4o': {
        input: 0.005,
        output: 0.015,
    },
    'gpt-4o-mini': {
        input: 0.00015,
        output: 0.0006,
    },
    'gpt-3.5-turbo': {
        input: 0.0005,
        output: 0.0015,
    }
};

/**
 * Calculate estimated cost for an AI completion
 */
export function calculateAICost(model: string, inputTokens: number, outputTokens: number): number {
    const rates = AI_COST_RATES[model as keyof typeof AI_COST_RATES] || AI_COST_RATES['gpt-4o-mini'];
    const inputCost = (inputTokens / 1000) * rates.input;
    const outputCost = (outputTokens / 1000) * rates.output;
    return parseFloat((inputCost + outputCost).toFixed(6));
}

// ============================================
// ANALYTICS TRACKING
// ============================================

export interface AnalyticsEvent {
    userId?: string;
    eventType: string;
    metadata?: Record<string, any>;
    costUsd?: number;
    tokensUsed?: number;
}

/**
 * Track an analytics event (Server-side compatible)
 * Uses admin client to bypass RLS for system analytics
 */
export async function trackEvent(event: AnalyticsEvent) {
    try {
        const adminSupabase = getAdminSupabase();
        
        // Verify we have the service role key
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not set - analytics will fail due to RLS');
            return; // Exit early if no service role key
        }
        
        // Use admin client to bypass RLS - analytics are system writes, not user writes
        const { error } = await adminSupabase
            .from('system_analytics')
            .insert({
                user_id: event.userId || null,
                event_type: event.eventType,
                metadata: event.metadata || {},
                cost_usd: event.costUsd || null,
                tokens_used: event.tokensUsed || null,
            });

        if (error) {
            console.error('⚠️ Analytics tracking failed:', {
                code: error.code,
                message: error.message,
                hint: error.hint,
                details: error.details
            });
            // Don't throw - analytics are non-critical
        } else {
            // Success logging in development only
            if (process.env.NODE_ENV === 'development') {
                console.log('✅ Analytics tracked:', event.eventType, {
                    cost: event.costUsd,
                    tokens: event.tokensUsed
                });
            }
        }
    } catch (error) {
        // Silently log but don't break the main flow
        console.error('⚠️ Analytics tracking error:', error);
    }
}

/**
 * Analytics filter options
 */
export interface AnalyticsFilterOptions {
    eventType?: string | null;
    minCost?: number | null;
    maxCost?: number | null;
    granularity?: 'hour' | 'day' | 'week';
}

/**
 * Get analytics overview (admin only) with filtering support
 */
export async function getAnalyticsOverview(days: number = 30, filters?: AnalyticsFilterOptions) {
    try {
        const adminSupabase = getAdminSupabase();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const filterOpts = filters || {};
        const granularity = filterOpts.granularity || 'day';

        // Helper to build filters for queries
        const buildQuery = (query: any) => {
            query = query.gte('created_at', startDate.toISOString());
            
            if (filterOpts.eventType) {
                query = query.eq('event_type', filterOpts.eventType);
            }
            
            if (filterOpts.minCost !== null && filterOpts.minCost !== undefined) {
                query = query.gte('cost_usd', filterOpts.minCost);
            }
            
            if (filterOpts.maxCost !== null && filterOpts.maxCost !== undefined) {
                query = query.lte('cost_usd', filterOpts.maxCost);
            }
            
            return query;
        };

        // Get total events
        let eventQuery = adminSupabase
            .from('system_analytics')
            .select('*', { count: 'exact', head: true });
        const { count: totalEvents } = await buildQuery(eventQuery);

        // Get total costs
        let costQuery = adminSupabase
            .from('system_analytics')
            .select('cost_usd');
        const { data: costData } = await buildQuery(costQuery)
            .not('cost_usd', 'is', null);

        const totalCost = costData?.reduce((sum, row) => sum + (Number(row.cost_usd) || 0), 0) || 0;

        // Get total tokens
        let tokenQuery = adminSupabase
            .from('system_analytics')
            .select('tokens_used');
        const { data: tokenData } = await buildQuery(tokenQuery)
            .not('tokens_used', 'is', null);

        const totalTokens = tokenData?.reduce((sum, row) => sum + (row.tokens_used || 0), 0) || 0;

        // Get event breakdown
        let eventBreakdownQuery = adminSupabase
            .from('system_analytics')
            .select('event_type');
        const { data: eventBreakdown } = await buildQuery(eventBreakdownQuery);

        const eventCounts: Record<string, number> = {};
        eventBreakdown?.forEach(row => {
            eventCounts[row.event_type] = (eventCounts[row.event_type] || 0) + 1;
        });

        // Get top users by activity
        let userActivityQuery = adminSupabase
            .from('system_analytics')
            .select('user_id');
        const { data: userActivity } = await buildQuery(userActivityQuery)
            .not('user_id', 'is', null);

        const userCounts: Record<string, number> = {};
        userActivity?.forEach(row => {
            if (row.user_id) {
                userCounts[row.user_id] = (userCounts[row.user_id] || 0) + 1;
            }
        });

        const topUsers = Object.entries(userCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([userId, count]) => ({ userId, count }));

        return {
            totalEvents: totalEvents || 0,
            totalCost,
            totalTokens,
            eventBreakdown: eventCounts,
            topUsers,
        };
    } catch (error) {
        console.error('Error getting analytics overview:', error);
        return null;
    }
}

/**
 * Get cost breakdown by time period
 */
export async function getCostBreakdown(days: number = 30, eventType?: string | null) {
    try {
        const adminSupabase = getAdminSupabase();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        let query = adminSupabase
            .from('system_analytics')
            .select('created_at, cost_usd, event_type')
            .gte('created_at', startDate.toISOString())
            .not('cost_usd', 'is', null);

        if (eventType) {
            query = query.eq('event_type', eventType);
        }

        const { data } = await query;

        // Group by date/hour
        const breakdown: Record<string, { count: number; cost: number }> = {};

        data?.forEach(row => {
            const date = new Date(row.created_at);
            const dateKey = date.toLocaleDateString('en-US');
            
            if (!breakdown[dateKey]) {
                breakdown[dateKey] = { count: 0, cost: 0 };
            }
            
            breakdown[dateKey].count += 1;
            breakdown[dateKey].cost += Number(row.cost_usd) || 0;
        });

        // Convert to array and sort by date
        const sortedBreakdown = Object.entries(breakdown)
            .map(([date, data]) => ({
                date,
                ...data,
                avgCostPerEvent: data.cost / data.count,
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return sortedBreakdown;
    } catch (error) {
        console.error('Error getting cost breakdown:', error);
        return [];
    }
}
export async function getPopularItems() {
    try {
        const adminSupabase = getAdminSupabase();
        // Most favorited items
        const { data: favorites } = await adminSupabase
            .from('favorites')
            .select('item_id, item_name');

        const favoriteCounts: Record<number, { name: string; count: number }> = {};
        favorites?.forEach(fav => {
            if (!favoriteCounts[fav.item_id]) {
                favoriteCounts[fav.item_id] = { name: fav.item_name, count: 0 };
            }
            favoriteCounts[fav.item_id].count++;
        });

        const mostFavorited = Object.entries(favoriteCounts)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 10)
            .map(([itemId, data]) => ({
                itemId: Number(itemId),
                itemName: data.name,
                count: data.count,
            }));

        // Items with most alerts
        const { data: alerts } = await adminSupabase
            .from('price_alerts')
            .select('item_id, item_name');

        const alertCounts: Record<number, { name: string; count: number }> = {};
        alerts?.forEach(alert => {
            if (!alertCounts[alert.item_id]) {
                alertCounts[alert.item_id] = { name: alert.item_name, count: 0 };
            }
            alertCounts[alert.item_id].count++;
        });

        const mostAlerted = Object.entries(alertCounts)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 10)
            .map(([itemId, data]) => ({
                itemId: Number(itemId),
                itemName: data.name,
                count: data.count,
            }));

        // Most analyzed items (from analytics)
        const { data: analyzed } = await adminSupabase
            .from('system_analytics')
            .select('metadata')
            .eq('event_type', 'ai_analysis')
            .not('metadata->itemId', 'is', null);

        const analyzedCounts: Record<number, { name: string; count: number }> = {};
        analyzed?.forEach(row => {
            const itemId = row.metadata?.itemId;
            const itemName = row.metadata?.itemName;
            if (itemId && itemName) {
                if (!analyzedCounts[itemId]) {
                    analyzedCounts[itemId] = { name: itemName, count: 0 };
                }
                analyzedCounts[itemId].count++;
            }
        });

        const mostAnalyzed = Object.entries(analyzedCounts)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 10)
            .map(([itemId, data]) => ({
                itemId: Number(itemId),
                itemName: data.name,
                count: data.count,
            }));

        return {
            mostFavorited,
            mostAlerted,
            mostAnalyzed,
        };
    } catch (error) {
        console.error('Error getting popular items:', error);
        return null;
    }
}

/**
 * Increment user API usage
 */
export async function incrementUsage(userId: string) {
    try {
        const supabase = createServerSupabaseClient();

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

// ============================================
// ERROR LOGGING
// ============================================

export interface ErrorLog {
    userId?: string;
    errorType: string;
    errorMessage: string;
    stackTrace?: string;
    url?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
}

/**
 * Log an error
 */
export async function logError(error: ErrorLog) {
    try {
        const supabase = createServerSupabaseClient();
        const { error: dbError } = await supabase
            .from('error_logs')
            .insert({
                user_id: error.userId || null,
                error_type: error.errorType,
                error_message: error.errorMessage,
                stack_trace: error.stackTrace || null,
                url: error.url || null,
                user_agent: error.userAgent || null,
                metadata: error.metadata || {},
            });

        if (dbError) {
            console.error('Error logging error:', dbError);
        }
    } catch (err) {
        console.error('Failed to log error:', err);
    }
}

/**
 * Get recent errors (admin only)
 */
export async function getRecentErrors(limit: number = 50) {
    try {
        const adminSupabase = getAdminSupabase();
        const { data, error } = await adminSupabase
            .from('error_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching errors:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Failed to fetch errors:', error);
        return [];
    }
}

// ============================================
// NOTIFICATIONS
// ============================================

export interface BroadcastNotification {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error';
    targetUsers: 'all' | 'active' | 'specific';
    userIds?: string[];
    expiresAt?: Date;
    createdBy: string;
}

/**
 * Create a broadcast notification (admin only)
 */
export async function createBroadcast(notification: BroadcastNotification) {
    try {
        const supabase = createServerSupabaseClient();
        const { data, error } = await supabase
            .from('notifications')
            .insert({
                title: notification.title,
                message: notification.message,
                type: notification.type,
                target_users: notification.targetUsers,
                user_ids: notification.userIds || null,
                expires_at: notification.expiresAt?.toISOString() || null,
                created_by: notification.createdBy,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating broadcast:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Failed to create broadcast:', error);
        return null;
    }
}

/**
 * Get user's notifications
 */
export async function getUserNotifications(userId: string) {
    try {
        const supabase = createServerSupabaseClient();
        const { data, error } = await supabase
            .from('user_notifications')
            .select(`
        *,
        notification:notifications(*)
      `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }

        // Filter out expired notifications
        const now = new Date();
        return data?.filter((un: any) => {
            const notification = un.notification as any;
            if (!notification) return false;
            if (notification.expires_at) {
                return new Date(notification.expires_at) > now;
            }
            return true;
        }) || [];
    } catch (error) {
        console.error('Failed to fetch notifications:', error);
        return [];
    }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId: string, userId: string) {
    try {
        const supabase = createServerSupabaseClient();
        const { error } = await supabase
            .from('user_notifications')
            .update({
                read: true,
                read_at: new Date().toISOString(),
            })
            .eq('notification_id', notificationId)
            .eq('user_id', userId);

        if (error) {
            console.error('Error marking notification as read:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
        return false;
    }
}
