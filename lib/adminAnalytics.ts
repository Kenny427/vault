import { supabase } from '@/lib/supabase';
import { createAdminSupabaseClient } from '@/lib/supabaseAdmin';

const adminSupabase = createAdminSupabaseClient();

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
 * Track an analytics event
 */
export async function trackEvent(event: AnalyticsEvent) {
    try {
        const { error } = await supabase
            .from('system_analytics')
            .insert({
                user_id: event.userId || null,
                event_type: event.eventType,
                metadata: event.metadata || {},
                cost_usd: event.costUsd || null,
                tokens_used: event.tokensUsed || null,
            });

        if (error) {
            console.error('Error tracking analytics event:', error);
        }
    } catch (error) {
        console.error('Failed to track event:', error);
    }
}

/**
 * Get analytics overview (admin only)
 */
export async function getAnalyticsOverview(days: number = 30) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get total events
        const { count: totalEvents } = await adminSupabase
            .from('system_analytics')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startDate.toISOString());

        // Get total costs
        const { data: costData } = await adminSupabase
            .from('system_analytics')
            .select('cost_usd')
            .gte('created_at', startDate.toISOString())
            .not('cost_usd', 'is', null);

        const totalCost = costData?.reduce((sum, row) => sum + (Number(row.cost_usd) || 0), 0) || 0;

        // Get total tokens
        const { data: tokenData } = await adminSupabase
            .from('system_analytics')
            .select('tokens_used')
            .gte('created_at', startDate.toISOString())
            .not('tokens_used', 'is', null);

        const totalTokens = tokenData?.reduce((sum, row) => sum + (row.tokens_used || 0), 0) || 0;

        // Get event breakdown
        const { data: eventBreakdown } = await adminSupabase
            .from('system_analytics')
            .select('event_type')
            .gte('created_at', startDate.toISOString());

        const eventCounts: Record<string, number> = {};
        eventBreakdown?.forEach(row => {
            eventCounts[row.event_type] = (eventCounts[row.event_type] || 0) + 1;
        });

        // Get top users by activity
        const { data: userActivity } = await adminSupabase
            .from('system_analytics')
            .select('user_id')
            .gte('created_at', startDate.toISOString())
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
 * Get popular items across all users
 */
export async function getPopularItems() {
    try {
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
