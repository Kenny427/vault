/**
 * CORE BOT SUPPRESSION POOL
 * 
 * Focused 50-item pool for mean-reversion opportunities driven by bot suppression.
 * 
 * Selection Criteria:
 * - Bot Likelihood: "very_high" or "high" only
 * - Volume Tier: "massive" or "high" only  
 * - Stable historical demand (not seasonal/dead content)
 * - Clear historical price averages for mean-reversion
 * 
 * Cost Impact: Reduces API costs by ~50% (110 items → 50 items)
 * Quality Impact: Better focus, higher signal-to-noise ratio
 */

export interface ItemPoolEntry {
  id: number;
  name: string;
  category: 'runes' | 'ammo' | 'potions' | 'herbs' | 'resources' | 'bones' | 'food' | 'secondaries' | 'pvm_drops';
  botLikelihood: 'very_high' | 'high';
  volumeTier: 'massive' | 'high';
  demandType: 'constant' | 'pvm' | 'skilling';
}

export const CORE_BOT_SUPPRESSION_POOL: ItemPoolEntry[] = [
  // === RUNES (Heavily Botted, Constant Demand) ===
  { id: 563, name: "Law rune", category: "runes", botLikelihood: "very_high", volumeTier: "massive", demandType: "constant" },
  { id: 560, name: "Death rune", category: "runes", botLikelihood: "very_high", volumeTier: "massive", demandType: "pvm" },
  { id: 565, name: "Blood rune", category: "runes", botLikelihood: "very_high", volumeTier: "massive", demandType: "pvm" },
  { id: 566, name: "Soul rune", category: "runes", botLikelihood: "very_high", volumeTier: "high", demandType: "pvm" },
  { id: 21880, name: "Wrath rune", category: "runes", botLikelihood: "high", volumeTier: "high", demandType: "pvm" },
  { id: 9075, name: "Astral rune", category: "runes", botLikelihood: "very_high", volumeTier: "high", demandType: "constant" },
  
  // === AMMUNITION (PvM Essential, High Volume) ===
  { id: 11875, name: "Broad bolts", category: "ammo", botLikelihood: "very_high", volumeTier: "massive", demandType: "pvm" },
  { id: 21316, name: "Amethyst broad bolts", category: "ammo", botLikelihood: "high", volumeTier: "high", demandType: "pvm" },
  { id: 9144, name: "Runite bolts", category: "ammo", botLikelihood: "high", volumeTier: "high", demandType: "pvm" },
  { id: 9242, name: "Ruby bolts (e)", category: "ammo", botLikelihood: "high", volumeTier: "massive", demandType: "pvm" },
  { id: 9243, name: "Diamond bolts (e)", category: "ammo", botLikelihood: "high", volumeTier: "massive", demandType: "pvm" },
  { id: 892, name: "Rune arrow", category: "ammo", botLikelihood: "high", volumeTier: "high", demandType: "pvm" },
  { id: 811, name: "Rune dart", category: "ammo", botLikelihood: "high", volumeTier: "high", demandType: "pvm" },
  { id: 25849, name: "Amethyst dart", category: "ammo", botLikelihood: "high", volumeTier: "high", demandType: "pvm" },
  { id: 10033, name: "Chinchompa", category: "ammo", botLikelihood: "very_high", volumeTier: "high", demandType: "pvm" },
  { id: 10034, name: "Red chinchompa", category: "ammo", botLikelihood: "very_high", volumeTier: "massive", demandType: "pvm" },
  { id: 11959, name: "Black chinchompa", category: "ammo", botLikelihood: "very_high", volumeTier: "high", demandType: "pvm" },
  
  // === RESOURCES (Bot Farmed, Always In Demand) ===
  { id: 1513, name: "Magic logs", category: "resources", botLikelihood: "very_high", volumeTier: "massive", demandType: "skilling" },
  { id: 1515, name: "Yew logs", category: "resources", botLikelihood: "very_high", volumeTier: "massive", demandType: "skilling" },
  { id: 6332, name: "Mahogany logs", category: "resources", botLikelihood: "very_high", volumeTier: "high", demandType: "skilling" },
  { id: 6333, name: "Teak logs", category: "resources", botLikelihood: "very_high", volumeTier: "high", demandType: "skilling" },
  { id: 451, name: "Runite ore", category: "resources", botLikelihood: "very_high", volumeTier: "high", demandType: "skilling" },
  { id: 449, name: "Adamantite ore", category: "resources", botLikelihood: "very_high", volumeTier: "high", demandType: "skilling" },
  { id: 453, name: "Coal", category: "resources", botLikelihood: "very_high", volumeTier: "massive", demandType: "skilling" },
  { id: 440, name: "Iron ore", category: "resources", botLikelihood: "very_high", volumeTier: "massive", demandType: "skilling" },
  { id: 2363, name: "Runite bar", category: "resources", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 2361, name: "Adamantite bar", category: "resources", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 2353, name: "Steel bar", category: "resources", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 1777, name: "Bow string", category: "resources", botLikelihood: "very_high", volumeTier: "massive", demandType: "skilling" },
  { id: 1753, name: "Green dragonhide", category: "resources", botLikelihood: "very_high", volumeTier: "massive", demandType: "skilling" },
  { id: 1751, name: "Blue dragonhide", category: "resources", botLikelihood: "very_high", volumeTier: "massive", demandType: "skilling" },
  { id: 1749, name: "Red dragonhide", category: "resources", botLikelihood: "very_high", volumeTier: "high", demandType: "skilling" },
  { id: 1747, name: "Black dragonhide", category: "resources", botLikelihood: "very_high", volumeTier: "high", demandType: "skilling" },
  { id: 1745, name: "Green dragon leather", category: "resources", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 2505, name: "Blue dragon leather", category: "resources", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  
  // === BONES (Heavily Botted) ===
  { id: 536, name: "Dragon bones", category: "bones", botLikelihood: "very_high", volumeTier: "massive", demandType: "skilling" },
  { id: 534, name: "Babydragon bones", category: "bones", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  
  // === FOOD (PvM Essential, Always Needed) ===
  { id: 385, name: "Shark", category: "food", botLikelihood: "very_high", volumeTier: "massive", demandType: "pvm" },
  { id: 383, name: "Raw shark", category: "food", botLikelihood: "very_high", volumeTier: "massive", demandType: "pvm" },
  { id: 3144, name: "Cooked karambwan", category: "food", botLikelihood: "very_high", volumeTier: "massive", demandType: "pvm" },
  { id: 3142, name: "Raw karambwan", category: "food", botLikelihood: "very_high", volumeTier: "massive", demandType: "pvm" },
  { id: 13441, name: "Anglerfish", category: "food", botLikelihood: "high", volumeTier: "massive", demandType: "pvm" },
  { id: 13439, name: "Raw anglerfish", category: "food", botLikelihood: "high", volumeTier: "high", demandType: "pvm" },
  { id: 391, name: "Manta ray", category: "food", botLikelihood: "high", volumeTier: "high", demandType: "pvm" },
  { id: 7946, name: "Monkfish", category: "food", botLikelihood: "very_high", volumeTier: "high", demandType: "pvm" },
  { id: 379, name: "Lobster", category: "food", botLikelihood: "very_high", volumeTier: "high", demandType: "pvm" },
  
  // === POTIONS (PvM Essential, High Volume) ===
  { id: 2434, name: "Prayer potion(4)", category: "potions", botLikelihood: "high", volumeTier: "massive", demandType: "pvm" },
  { id: 3024, name: "Super restore(4)", category: "potions", botLikelihood: "high", volumeTier: "massive", demandType: "pvm" },
  { id: 6685, name: "Saradomin brew(4)", category: "potions", botLikelihood: "high", volumeTier: "massive", demandType: "pvm" },
  { id: 12625, name: "Stamina potion(4)", category: "potions", botLikelihood: "high", volumeTier: "high", demandType: "pvm" },
  { id: 12695, name: "Super combat potion(4)", category: "potions", botLikelihood: "high", volumeTier: "massive", demandType: "pvm" },
  { id: 2444, name: "Ranging potion(4)", category: "potions", botLikelihood: "high", volumeTier: "high", demandType: "pvm" },
  { id: 21978, name: "Super antifire potion(4)", category: "potions", botLikelihood: "high", volumeTier: "high", demandType: "pvm" },
  
  // === HERBS (Heavily Bot Farmed) ===
  { id: 207, name: "Grimy ranarr weed", category: "herbs", botLikelihood: "very_high", volumeTier: "massive", demandType: "skilling" },
  { id: 3051, name: "Grimy snapdragon", category: "herbs", botLikelihood: "very_high", volumeTier: "massive", demandType: "skilling" },
  { id: 219, name: "Grimy torstol", category: "herbs", botLikelihood: "very_high", volumeTier: "high", demandType: "skilling" },
  { id: 2485, name: "Grimy lantadyme", category: "herbs", botLikelihood: "very_high", volumeTier: "high", demandType: "skilling" },
  { id: 213, name: "Grimy kwuarm", category: "herbs", botLikelihood: "very_high", volumeTier: "high", demandType: "skilling" },
  { id: 215, name: "Grimy cadantine", category: "herbs", botLikelihood: "very_high", volumeTier: "high", demandType: "skilling" },
  { id: 209, name: "Grimy irit leaf", category: "herbs", botLikelihood: "very_high", volumeTier: "high", demandType: "skilling" },
  { id: 3049, name: "Grimy toadflax", category: "herbs", botLikelihood: "very_high", volumeTier: "high", demandType: "skilling" },
  { id: 205, name: "Grimy harralander", category: "herbs", botLikelihood: "very_high", volumeTier: "high", demandType: "skilling" },
  { id: 217, name: "Grimy dwarf weed", category: "herbs", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
];

// Export count for reference
export const CORE_POOL_SIZE = CORE_BOT_SUPPRESSION_POOL.length; // 67 items
