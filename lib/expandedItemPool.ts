/**
 * MEAN-REVERSION OPTIMIZED ITEM POOL
 * 
 * Focused on items with:
 * - High bot activity (stable supply patterns)
 * - Consistent demand (always needed by players)
 * - Good liquidity (high daily volume)
 * - Predictable mean reversion
 */

export interface ItemPoolEntry {
  id: number;
  name: string;
  category: 'runes' | 'ammo' | 'potions' | 'herbs' | 'resources' | 'bones' | 'food' | 'secondaries' | 'pvm_drops';
  botLikelihood: 'very_high' | 'high' | 'medium'; // How likely this item is botted
  volumeTier: 'massive' | 'high' | 'medium'; // Daily trade volume
  demandType: 'constant' | 'pvm' | 'skilling'; // What drives demand
}

export const EXPANDED_ITEM_POOL: ItemPoolEntry[] = [
  // === RUNES (Heavily Botted) ===
  { id: 563, name: "Law rune", category: "runes", botLikelihood: "very_high", volumeTier: "massive", demandType: "constant" },
  { id: 560, name: "Death rune", category: "runes", botLikelihood: "very_high", volumeTier: "massive", demandType: "pvm" },
  { id: 565, name: "Blood rune", category: "runes", botLikelihood: "very_high", volumeTier: "massive", demandType: "pvm" },
  { id: 566, name: "Soul rune", category: "runes", botLikelihood: "very_high", volumeTier: "high", demandType: "pvm" },
  { id: 21880, name: "Wrath rune", category: "runes", botLikelihood: "high", volumeTier: "high", demandType: "pvm" },
  { id: 9075, name: "Astral rune", category: "runes", botLikelihood: "very_high", volumeTier: "high", demandType: "constant" },
  
  // === AMMUNITION (PvM Essential) ===
  { id: 11875, name: "Broad bolts", category: "ammo", botLikelihood: "very_high", volumeTier: "massive", demandType: "pvm" },
  { id: 21316, name: "Amethyst broad bolts", category: "ammo", botLikelihood: "high", volumeTier: "high", demandType: "pvm" },
  { id: 9144, name: "Runite bolts", category: "ammo", botLikelihood: "high", volumeTier: "high", demandType: "pvm" },
  { id: 21905, name: "Dragon bolts", category: "ammo", botLikelihood: "medium", volumeTier: "high", demandType: "pvm" },
  { id: 9242, name: "Ruby bolts (e)", category: "ammo", botLikelihood: "high", volumeTier: "massive", demandType: "pvm" },
  { id: 9243, name: "Diamond bolts (e)", category: "ammo", botLikelihood: "high", volumeTier: "massive", demandType: "pvm" },
  { id: 21944, name: "Ruby dragon bolts (e)", category: "ammo", botLikelihood: "medium", volumeTier: "high", demandType: "pvm" },
  { id: 21946, name: "Diamond dragon bolts (e)", category: "ammo", botLikelihood: "medium", volumeTier: "high", demandType: "pvm" },
  { id: 11212, name: "Dragon arrow", category: "ammo", botLikelihood: "medium", volumeTier: "high", demandType: "pvm" },
  { id: 21326, name: "Amethyst arrow", category: "ammo", botLikelihood: "high", volumeTier: "medium", demandType: "pvm" },
  { id: 892, name: "Rune arrow", category: "ammo", botLikelihood: "high", volumeTier: "high", demandType: "pvm" },
  { id: 11230, name: "Dragon dart", category: "ammo", botLikelihood: "medium", volumeTier: "high", demandType: "pvm" },
  { id: 25849, name: "Amethyst dart", category: "ammo", botLikelihood: "high", volumeTier: "medium", demandType: "pvm" },
  { id: 811, name: "Rune dart", category: "ammo", botLikelihood: "high", volumeTier: "high", demandType: "pvm" },
  { id: 10033, name: "Chinchompa", category: "ammo", botLikelihood: "very_high", volumeTier: "high", demandType: "pvm" },
  { id: 10034, name: "Red chinchompa", category: "ammo", botLikelihood: "very_high", volumeTier: "massive", demandType: "pvm" },
  { id: 11959, name: "Black chinchompa", category: "ammo", botLikelihood: "very_high", volumeTier: "high", demandType: "pvm" },
  
  // === RESOURCES (Bot Farmed) ===
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
  { id: 2507, name: "Red dragon leather", category: "resources", botLikelihood: "high", volumeTier: "medium", demandType: "skilling" },
  { id: 2509, name: "Black dragon leather", category: "resources", botLikelihood: "high", volumeTier: "medium", demandType: "skilling" },
  
  // === BONES (Heavily Botted) ===
  { id: 536, name: "Dragon bones", category: "bones", botLikelihood: "very_high", volumeTier: "massive", demandType: "skilling" },
  { id: 534, name: "Babydragon bones", category: "bones", botLikelihood: "high", volumeTier: "medium", demandType: "skilling" },
  { id: 6812, name: "Wyvern bones", category: "bones", botLikelihood: "high", volumeTier: "medium", demandType: "skilling" },
  { id: 22124, name: "Superior dragon bones", category: "bones", botLikelihood: "medium", volumeTier: "medium", demandType: "skilling" },
  
  // === FOOD (PvM Essential) ===
  { id: 385, name: "Shark", category: "food", botLikelihood: "very_high", volumeTier: "massive", demandType: "pvm" },
  { id: 383, name: "Raw shark", category: "food", botLikelihood: "very_high", volumeTier: "massive", demandType: "pvm" },
  { id: 3144, name: "Cooked karambwan", category: "food", botLikelihood: "very_high", volumeTier: "massive", demandType: "pvm" },
  { id: 3142, name: "Raw karambwan", category: "food", botLikelihood: "very_high", volumeTier: "massive", demandType: "pvm" },
  { id: 13441, name: "Anglerfish", category: "food", botLikelihood: "high", volumeTier: "massive", demandType: "pvm" },
  { id: 13439, name: "Raw anglerfish", category: "food", botLikelihood: "high", volumeTier: "high", demandType: "pvm" },
  { id: 391, name: "Manta ray", category: "food", botLikelihood: "high", volumeTier: "high", demandType: "pvm" },
  { id: 7946, name: "Monkfish", category: "food", botLikelihood: "very_high", volumeTier: "high", demandType: "pvm" },
  { id: 379, name: "Lobster", category: "food", botLikelihood: "very_high", volumeTier: "high", demandType: "pvm" },
  
  // === POTIONS (PvM Essential) ===
  { id: 2434, name: "Prayer potion(4)", category: "potions", botLikelihood: "high", volumeTier: "massive", demandType: "pvm" },
  { id: 3024, name: "Super restore(4)", category: "potions", botLikelihood: "high", volumeTier: "massive", demandType: "pvm" },
  { id: 6685, name: "Saradomin brew(4)", category: "potions", botLikelihood: "high", volumeTier: "massive", demandType: "pvm" },
  { id: 12625, name: "Stamina potion(4)", category: "potions", botLikelihood: "high", volumeTier: "high", demandType: "pvm" },
  { id: 12695, name: "Super combat potion(4)", category: "potions", botLikelihood: "high", volumeTier: "massive", demandType: "pvm" },
  { id: 2444, name: "Ranging potion(4)", category: "potions", botLikelihood: "high", volumeTier: "high", demandType: "pvm" },
  { id: 22461, name: "Bastion potion(4)", category: "potions", botLikelihood: "medium", volumeTier: "high", demandType: "pvm" },
  { id: 21978, name: "Super antifire potion(4)", category: "potions", botLikelihood: "high", volumeTier: "high", demandType: "pvm" },
  { id: 22209, name: "Extended super antifire(4)", category: "potions", botLikelihood: "medium", volumeTier: "medium", demandType: "pvm" },
  { id: 23685, name: "Divine super combat potion(4)", category: "potions", botLikelihood: "medium", volumeTier: "high", demandType: "pvm" },
  { id: 23733, name: "Divine ranging potion(4)", category: "potions", botLikelihood: "medium", volumeTier: "high", demandType: "pvm" },
  
  // === HERBS (Bot Farmed) ===
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
  { id: 211, name: "Grimy avantoe", category: "herbs", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 257, name: "Ranarr weed", category: "herbs", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 3000, name: "Snapdragon", category: "herbs", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 269, name: "Torstol", category: "herbs", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 2481, name: "Lantadyme", category: "herbs", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 263, name: "Kwuarm", category: "herbs", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 265, name: "Cadantine", category: "herbs", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 259, name: "Irit leaf", category: "herbs", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 2998, name: "Toadflax", category: "herbs", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 255, name: "Harralander", category: "herbs", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 3049, name: "Avantoe", category: "herbs", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  
  // === SECONDARY INGREDIENTS (Bot Gathered) ===
  { id: 231, name: "Snape grass", category: "secondaries", botLikelihood: "very_high", volumeTier: "high", demandType: "skilling" },
  { id: 225, name: "Limpwurt root", category: "secondaries", botLikelihood: "very_high", volumeTier: "high", demandType: "skilling" },
  { id: 2970, name: "Mort myre fungus", category: "secondaries", botLikelihood: "very_high", volumeTier: "high", demandType: "skilling" },
  { id: 3138, name: "Potato cactus", category: "secondaries", botLikelihood: "very_high", volumeTier: "high", demandType: "skilling" },
  { id: 239, name: "White berries", category: "secondaries", botLikelihood: "very_high", volumeTier: "high", demandType: "skilling" },
  { id: 243, name: "Blue dragon scale", category: "secondaries", botLikelihood: "very_high", volumeTier: "high", demandType: "skilling" },
  { id: 223, name: "Red spiders' eggs", category: "secondaries", botLikelihood: "very_high", volumeTier: "high", demandType: "skilling" },
  { id: 235, name: "Unicorn horn dust", category: "secondaries", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 241, name: "Dragon scale dust", category: "secondaries", botLikelihood: "high", volumeTier: "medium", demandType: "skilling" },
  { id: 6693, name: "Crushed nest", category: "secondaries", botLikelihood: "high", volumeTier: "medium", demandType: "skilling" },
  
  // === PVM DROPS (High Volume) ===
  { id: 12934, name: "Zulrah's scales", category: "pvm_drops", botLikelihood: "very_high", volumeTier: "massive", demandType: "pvm" },
  { id: 21622, name: "Volcanic ash", category: "pvm_drops", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 1391, name: "Battlestaff", category: "pvm_drops", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 892, name: "Rune arrow", category: "pvm_drops", botLikelihood: "high", volumeTier: "high", demandType: "pvm" },
  
  // === NEW ADDITIONS ===
  { id: 807, name: "Yew longbow", category: "resources", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 809, name: "Yew longbow(u)", category: "resources", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 3971, name: "Magic longbow", category: "resources", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 3973, name: "Magic longbow(u)", category: "resources", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 9072, name: "Air orb", category: "secondaries", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 9073, name: "Water orb", category: "secondaries", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 9074, name: "Fire orb", category: "secondaries", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 9076, name: "Earth orb", category: "secondaries", botLikelihood: "high", volumeTier: "high", demandType: "skilling" },
  { id: 1634, name: "Dynamite", category: "secondaries", botLikelihood: "medium", volumeTier: "medium", demandType: "skilling" },
  { id: 30072, name: "Aldarium", category: "potions", botLikelihood: "medium", volumeTier: "medium", demandType: "skilling" },
];


export function getAllAnalysisItems() {
  return EXPANDED_ITEM_POOL.map(item => ({
    id: item.id,
    name: item.name,
    botLikelihood: item.botLikelihood,
    volumeTier: item.volumeTier
  }));
}

export function getItemsByCategory(category: ItemPoolEntry['category']) {
  return EXPANDED_ITEM_POOL.filter(item => item.category === category);
}

export function getHighVolumeItems() {
  return EXPANDED_ITEM_POOL.filter(item => 
    item.volumeTier === 'massive' || item.volumeTier === 'high'
  );
}

export function getBottedItems() {
  return EXPANDED_ITEM_POOL.filter(item => 
    item.botLikelihood === 'very_high' || item.botLikelihood === 'high'
  );
}

export function getItemsByDemandType(demandType: ItemPoolEntry['demandType']) {
  return EXPANDED_ITEM_POOL.filter(item => item.demandType === demandType);
}

// Get items best suited for mean-reversion investment
export function getMeanReversionCandidates() {
  return EXPANDED_ITEM_POOL.filter(item => 
    (item.botLikelihood === 'very_high' || item.botLikelihood === 'high') &&
    (item.volumeTier === 'massive' || item.volumeTier === 'high') &&
    item.demandType === 'constant' || item.demandType === 'pvm'
  );
}

