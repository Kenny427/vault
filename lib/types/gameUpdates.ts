// TypeScript types for game updates system

export interface GameUpdate {
  id: string;
  update_date: string;
  release_date?: string | null;
  title: string;
  content: string;
  source_type: 'dev_blog' | 'game_update' | 'poll' | 'news';
  source_url?: string | null;
  category?: string | null;
  impact_level: 'low' | 'medium' | 'high';
  overall_sentiment: 'bullish' | 'bearish' | 'neutral' | 'mixed';
  is_reviewed: boolean;
  is_active: boolean;
  scraped_at: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateItemImpact {
  id: string;
  update_id: string;
  item_id: number;
  item_name: string;
  impact_type: 
    | 'requirement'
    | 'reward'
    | 'buff'
    | 'nerf'
    | 'drop_rate_increase'
    | 'drop_rate_decrease'
    | 'new_method'
    | 'removal'
    | 'related';
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-100
  quantity?: number | null;
  notes?: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface GameUpdateWithImpacts extends GameUpdate {
  impacts: UpdateItemImpact[];
}

export interface RecentUpdateSummary {
  id: string;
  update_date: string;
  release_date?: string | null;
  title: string;
  source_type: string;
  category?: string | null;
  impact_level: string;
  overall_sentiment: string;
  is_reviewed: boolean;
  affected_items_count: number;
  affected_items: string[];
}

export interface ItemUpdateHistory {
  item_id: number;
  item_name: string;
  impact_type: string;
  sentiment: string;
  confidence: number;
  quantity?: number | null;
  notes?: string | null;
  update_date: string;
  release_date?: string | null;
  title: string;
  content: string;
  source_type: string;
  source_url?: string | null;
  category?: string | null;
  impact_level: string;
}

// For scraper responses
export interface ScrapedUpdate {
  date: string;
  title: string;
  content: string;
  sourceUrl: string;
  category?: string;
}

// For AI extraction
export interface AIExtractedItem {
  name: string;
  relationship: 'requirement' | 'reward' | 'buff' | 'nerf' | 'drop_rate_change' | 'other';
  quantity?: number;
  confidence: number;
  notes?: string;
}

export interface AIExtractionResult {
  items: AIExtractedItem[];
  overall_sentiment: 'bullish' | 'bearish' | 'neutral' | 'mixed';
  impact_level: 'low' | 'medium' | 'high';
  category?: string;
}
