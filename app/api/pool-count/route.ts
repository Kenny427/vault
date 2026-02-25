import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Avoid build-time crashes if env vars are not set in CI/build environments.
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function GET() {
    try {
        if (!supabase) {
            return NextResponse.json(
                { error: 'Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)' },
                { status: 500 }
            );
        }

        const { count, error } = await supabase
            .from('custom_pool_items')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;

        const { data: items } = await supabase
            .from('custom_pool_items')
            .select('item_id, item_name, enabled');

        const enabled = items?.filter(i => i.enabled).length || 0;
        const disabled = items?.filter(i => !i.enabled).length || 0;

        return NextResponse.json({
            total: count,
            enabled,
            disabled,
            items: items?.map(i => ({ id: i.item_id, name: i.item_name, enabled: i.enabled }))
        });
    } catch (error) {
        console.error('Failed to count pool items:', error);
        return NextResponse.json({ error: 'Failed to count items' }, { status: 500 });
    }
}
