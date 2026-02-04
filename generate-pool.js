const https = require('https');
const fs = require('fs');

const itemNames = [
  'Air rune', 'Water rune', 'Earth rune', 'Fire rune', 'Mind rune', 'Body rune', 'Chaos rune', 'Cosmic rune',
  'Nature rune', 'Law rune', 'Death rune', 'Blood rune', 'Soul rune', 'Wrath rune', 'Astral rune', 'Mist rune',
  'Dust rune', 'Smoke rune', 'Steam rune', 'Lava rune', 'Mud rune', 'Feather', 'Arrow shaft',
  'Headless arrow', 'Broad bolts', 'Amethyst broad bolts', 'Adamant bolts', 'Runite bolts', 'Runite bolts',
  'Dragon bolts', 'Dragon bolts (unf)', 'Ruby bolts (e)', 'Diamond bolts (e)', 'Emerald bolts (e)', 
  'Sapphire bolts (e)', 'Ruby dragon bolts (e)', 'Diamond dragon bolts (e)', 'Dragonstone dragon bolts (e)',
  'Onyx dragon bolts (e)', 'Dragon arrow', 'Dragon arrowtips', 'Amethyst arrow', 'Amethyst arrowtips',
  'Rune arrow', 'Rune arrowtips', 'Dragon dart', 'Dragon dart tip', 'Amethyst dart', 'Amethyst dart tip',
  'Rune dart', 'Rune dart tip', 'Chinchompa', 'Red chinchompa', 'Black chinchompa', 'Logs', 'Oak logs',
  'Willow logs', 'Maple logs', 'Yew logs', 'Magic logs', 'Teak logs', 'Mahogany logs', 'Arctic pine logs',
  'Flax', 'Bale of flax', 'Bow string', 'Oak shortbow (u)', 'Willow shortbow (u)', 'Maple shortbow (u)',
  'Yew shortbow (u)', 'Magic shortbow (u)', 'Oak longbow (u)', 'Willow longbow (u)', 'Maple longbow (u)',
  'Yew longbow (u)', 'Magic longbow (u)', 'Maple longbow', 'Yew longbow', 'Magic longbow', 'Maple shortbow',
  'Yew shortbow', 'Magic shortbow', 'Copper ore', 'Tin ore', 'Iron ore', 'Silver ore', 'Gold ore', 'Coal',
  'Mithril ore', 'Adamantite ore', 'Runite ore', 'Bronze bar', 'Iron bar', 'Steel bar', 'Silver bar',
  'Gold bar', 'Mithril bar', 'Adamantite bar', 'Runite bar', 'Steel nails', 'Mithril nails', 'Adamantite nails',
  'Rune nails', 'Plank', 'Oak plank', 'Teak plank', 'Mahogany plank', 'Bucket of sand', 'Sandstone (1kg)',
  'Soda ash', 'Seaweed', 'Giant seaweed', 'Molten glass', 'Leather', 'Hard leather', 'Cowhide',
  'Green dragonhide', 'Blue dragonhide', 'Red dragonhide', 'Black dragonhide', 'Green dragon leather',
  'Blue dragon leather', 'Red dragon leather', 'Black dragon leather', 'Bones', 'Big bones', 'Dragon bones',
  'Babydragon bones', 'Wyvern bones', 'Superior dragon bones', 'Crushed superior dragon bones',
  'Raw karambwan', 'Cooked karambwan', 'Cooked karambwan', 'Raw shark', 'Shark', 'Raw manta ray', 'Manta ray',
  'Raw anglerfish', 'Anglerfish', 'Raw monkfish', 'Monkfish', 'Dark crab', 'Lobster', 'Raw lobster',
  'Prayer potion(4)', 'Super restore(4)', 'Saradomin brew(4)', 'Stamina potion(4)', 'Super combat potion(4)',
  'Ranging potion(4)', 'Bastion potion(4)', 'Magic potion(4)', 'Antivenom+(4)', 'Super antifire potion(4)',
  'Extended super antifire(4)', 'Zamorak brew(4)', 'Divine super combat potion(4)', 'Divine ranging potion(4)',
  'Divine bastion potion(4)', 'Blighted anglerfish', 'Blighted manta ray', 'Blighted karambwan',
  'Blighted super restore(4)', 'Saradomin brew(4)', 'Super combat potion(4)',
  'Prayer potion(4)', 'Vial of water', 'Vial',
  'Grimy guam leaf', 'Grimy marrentill', 'Grimy tarromin', 'Grimy harralander', 'Grimy ranarr weed',
  'Grimy toadflax', 'Grimy irit leaf', 'Grimy avantoe', 'Grimy kwuarm', 'Grimy snapdragon',
  'Grimy cadantine', 'Grimy lantadyme', 'Grimy dwarf weed', 'Grimy torstol', 'Guam leaf', 'Marrentill',
  'Tarromin', 'Harralander', 'Ranarr weed', 'Toadflax', 'Irit leaf', 'Avantoe', 'Kwuarm', 'Snapdragon',
  'Cadantine', 'Lantadyme', 'Dwarf weed', 'Torstol', 'Guam seed', 'Marrentill seed', 'Tarromin seed',
  'Harralander seed', 'Ranarr seed', 'Toadflax seed', 'Irit seed', 'Avantoe seed', 'Kwuarm seed',
  'Snapdragon seed', 'Cadantine seed', 'Lantadyme seed', 'Dwarf weed seed', 'Torstol seed',
  'Guam potion (unf)', 'Marrentill potion (unf)', 'Tarromin potion (unf)', 'Harralander potion (unf)',
  'Ranarr potion (unf)', 'Toadflax potion (unf)', 'Irit potion (unf)', 'Avantoe potion (unf)',
  'Kwuarm potion (unf)', 'Snapdragon potion (unf)', 'Cadantine potion (unf)', 'Lantadyme potion (unf)',
  'Dwarf weed potion (unf)', 'Torstol potion (unf)', 'Snape grass', 'Limpwurt root', 'Mort myre fungus',
  'Potato cactus', 'White berries', 'Wine of zamorak',
  'Unicorn horn dust', 'Goat horn dust', 'Chocolate dust', 'Red spiders\' eggs', 'Blue dragon scale',
  'Eye of newt', 'Snakeskin', 'Dragon scale dust', 'Bird nest', 'Crushed nest', 'Compost', 'Supercompost',
  'Ultracompost', 'Volcanic ash', 'Battlestaff', 'Unpowered orb', 'Water orb', 'Earth orb', 'Fire orb',
  'Air orb', 'Water battlestaff', 'Earth battlestaff', 'Fire battlestaff', 'Air battlestaff',
  'Uncut sapphire', 'Uncut emerald', 'Uncut ruby', 'Uncut diamond', 'Uncut dragonstone', 'Sapphire',
  'Emerald', 'Ruby', 'Diamond', 'Dragonstone', 'Abyssal whip', 'Abyssal tentacle', 'Dragon claws',
  'Dragon warhammer', 'Osmumten\'s fang', 'Zamorakian hasta', 'Saradomin sword', 'Toxic blowpipe',
  'Zulrah\'s scales', 'Armadyl crossbow', 'Dragon hunter crossbow', 'Trident of the seas (full)',
  'Trident of the swamp', 'Occult necklace', 'Berserker ring', 'Seers ring', 'Archers ring',
  'Ring of the gods', 'Tyrannical ring', 'Treasonous ring', 'Dragon boots', 'Primordial boots',
  'Pegasian boots', 'Eternal boots', 'Bandos chestplate', 'Bandos tassets', 'Bandos boots',
  'Armadyl chestplate', 'Armadyl chainskirt', 'Ring of suffering', 'Necklace of anguish',
  'Amulet of torture', 'Tormented bracelet', 'Lightbearer', 'Avernic defender hilt', 'Ferocious gloves',
  'Dragonfire shield', 'Dragonfire ward', 'Bow of faerdhinen (c)', 'Crystal armour seed',
  'Crystal weapon seed', 'Enhanced crystal weapon seed', 'Twisted bow', 'Scythe of vitur (uncharged)',
  "Tumeken's shadow (uncharged)", 'Elysian spirit shield', 'Arcane spirit shield', 'Spectral spirit shield',
  'Elidinis\' ward', 'Elidinis\' ward (or)', 'Twisted buckler', 'Dinh\'s bulwark', 'Zaryte crossbow',
  'Dragon hunter lance', 'Ghrazi rapier', 'Sanguinesti staff (uncharged)', 'Kodai wand', 'Nightmare staff',
  'Harmonised orb', 'Eldritch orb', 'Volatile orb', 'Inquisitor\'s mace',
  'Inquisitor\'s great helm', 'Inquisitor\'s hauberk', 'Inquisitor\'s plateskirt', 'Justiciar faceguard', 'Justiciar chestguard',
  'Justiciar legguards', 'Torva full helm', 'Torva platebody', 'Torva platelegs', 'Masori mask',
  'Masori body', 'Masori chaps', 'Masori mask (f)', 'Masori body (f)', 'Masori chaps (f)', 'Ancestral hat',
  'Ancestral robe top', 'Ancestral robe bottom', 'Virtus mask', 'Virtus robe top', 'Virtus robe legs',
  'Crystal helm', 'Crystal body', 'Crystal legs', 'Bandos godsword', 'Armadyl godsword',
  'Saradomin godsword', 'Zamorak godsword', 'Abyssal dagger', 'Abyssal bludgeon', 'Voidwaker',
  'Ancient godsword', 'Webweaver bow', 'Ursine chainmace', 'Accursed sceptre (u)', 'Dragon pickaxe',
  'Dragon axe', 'Imbued heart', 'Eternal gem', 'Hydra\'s claw', 'Dexterous prayer scroll',
  'Arcane prayer scroll'
];

// Category mapping based on item names
function categorizeItem(name) {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('rune') && !nameLower.includes('runite')) return 'runes';
  if (nameLower.includes('arrow') || nameLower.includes('bolt') || nameLower.includes('dart') || 
      nameLower.includes('chinchompa') || nameLower.includes('cannonball')) return 'ammo';
  if (nameLower.includes('potion') || nameLower.includes('brew') || nameLower.includes('antivenom') ||
      nameLower.includes('antifire')) return 'potions';
  if (nameLower.includes('grimy') || nameLower.includes('herb') || nameLower.includes('seed') ||
      nameLower.includes('guam') || nameLower.includes('marrentill') || nameLower.includes('tarromin') ||
      nameLower.includes('harralander') || nameLower.includes('ranarr') || nameLower.includes('toadflax') ||
      nameLower.includes('irit') || nameLower.includes('avantoe') || nameLower.includes('kwuarm') ||
      nameLower.includes('snapdragon') || nameLower.includes('cadantine') || nameLower.includes('lantadyme') ||
      nameLower.includes('dwarf weed') || nameLower.includes('torstol')) return 'herbs';
  if (nameLower.includes('logs') || nameLower.includes('ore') || nameLower.includes('bar') ||
      nameLower.includes('plank') || nameLower.includes('hide') || nameLower.includes('leather') ||
      nameLower.includes('flax') || nameLower.includes('bow string') || nameLower.includes('nails') ||
      nameLower.includes('glass') || nameLower.includes('seaweed') || nameLower.includes('sand') ||
      nameLower.includes('ash') || nameLower.includes('orb') || nameLower.includes('cowhide') ||
      nameLower.includes('compost') || nameLower.includes('scale')) return 'resources';
  if (nameLower.includes('bones')) return 'bones';
  if (nameLower.includes('shark') || nameLower.includes('manta') || nameLower.includes('anglerfish') ||
      nameLower.includes('karambwan') || nameLower.includes('monkfish') || nameLower.includes('crab') ||
      nameLower.includes('lobster')) return 'food';
  if (nameLower.includes('chestplate') || nameLower.includes('platebody') || nameLower.includes('platelegs') ||
      nameLower.includes('tassets') || nameLower.includes('chainskirt') || nameLower.includes('helm') ||
      nameLower.includes('hat') || nameLower.includes('mask') || nameLower.includes('robe') ||
      nameLower.includes('boots') || nameLower.includes('body') || nameLower.includes('chaps') ||
      nameLower.includes('legs') || nameLower.includes('hauberk') || nameLower.includes('guard')) return 'armor';
  if (nameLower.includes('bow') || nameLower.includes('crossbow') || nameLower.includes('whip') ||
      nameLower.includes('claws') || nameLower.includes('warhammer') || nameLower.includes('fang') ||
      nameLower.includes('hasta') || nameLower.includes('sword') || nameLower.includes('blowpipe') ||
      nameLower.includes('trident') || nameLower.includes('staff') || nameLower.includes('wand') ||
      nameLower.includes('rapier') || nameLower.includes('mace') || nameLower.includes('scythe') ||
      nameLower.includes('shadow') || nameLower.includes('lance') || nameLower.includes('dagger') ||
      nameLower.includes('bludgeon') || nameLower.includes('godsword') || nameLower.includes('chainmace') ||
      nameLower.includes('sceptre') || nameLower.includes('pickaxe') || nameLower.includes('axe')) return 'weapons';
  if (nameLower.includes('ring') || nameLower.includes('necklace') || nameLower.includes('amulet') ||
      nameLower.includes('bracelet') || nameLower.includes('lightbearer')) return 'jewelry';
  if (nameLower.includes('shield') || nameLower.includes('ward') || nameLower.includes('buckler') ||
      nameLower.includes('bulwark') || nameLower.includes('defender')) return 'shields';
  if (nameLower.includes('gem') || nameLower.includes('heart') || nameLower.includes('scroll') ||
      nameLower.includes('claw') || nameLower.includes('gloves') || nameLower.includes('seed') && 
      (nameLower.includes('crystal') || nameLower.includes('enhanced'))) return 'upgrades';
      
  return 'other';
}

function getTier(name) {
  const nameLower = name.toLowerCase();
  
  // High tier items
  if (nameLower.includes('twisted bow') || nameLower.includes('scythe') || nameLower.includes('shadow') ||
      nameLower.includes('elysian') || nameLower.includes('arcane') || nameLower.includes('torva') ||
      nameLower.includes('masori') || nameLower.includes('ancestral') || nameLower.includes('virtus') ||
      nameLower.includes('inquisitor') || nameLower.includes('zaryte') || nameLower.includes('kodai') ||
      nameLower.includes('harmonised') || nameLower.includes('eldritch') || nameLower.includes('volatile')) {
    return 'high';
  }
  
  // Medium tier
  if (nameLower.includes('bandos') || nameLower.includes('armadyl') || nameLower.includes('dragon') ||
      nameLower.includes('primordial') || nameLower.includes('pegasian') || nameLower.includes('eternal') ||
      nameLower.includes('anguish') || nameLower.includes('torture') || nameLower.includes('suffering') ||
      nameLower.includes('occult') || nameLower.includes('berserker ring') || nameLower.includes('seers ring') ||
      nameLower.includes('archers ring')) {
    return 'medium';
  }
  
  return 'low';
}

console.log(`Fetching IDs for ${itemNames.length} items...`);

const options = {
  hostname: 'prices.runescape.wiki',
  path: '/api/v1/osrs/mapping',
  headers: {
    'User-Agent': 'OSRS Flipping Dashboard - Item ID Fetcher'
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const mapping = JSON.parse(data);
    const mapByName = new Map(mapping.map(item => [item.name.toLowerCase(), item]));
    const results = [];
    const notFound = [];
    
    itemNames.forEach(name => {
      const item = mapByName.get(name.toLowerCase());
      if (item) {
        results.push({
          id: item.id,
          name: item.name,
          category: categorizeItem(item.name),
          tier: getTier(item.name)
        });
      } else {
        notFound.push(name);
      }
    });
    
    console.log(`\nMatched: ${results.length} items`);
    console.log(`Not found: ${notFound.length} items\n`);
    
    if (notFound.length > 0) {
      console.log('Items not found (these will be excluded from the pool):');
      notFound.forEach(name => console.log(`  - ${name}`));
      console.log('');
    }
    
    // Generate TypeScript file
    let tsContent = `// Auto-generated curated item pool
// This file contains ${results.length} carefully selected items for flipping analysis

export interface ItemPoolEntry {
  id: number;
  name: string;
  category: 'runes' | 'ammo' | 'potions' | 'herbs' | 'resources' | 'bones' | 'food' | 'armor' | 'weapons' | 'jewelry' | 'shields' | 'upgrades' | 'other';
  tier: 'high' | 'medium' | 'low';
}

export const EXPANDED_ITEM_POOL: ItemPoolEntry[] = [\n`;
    
    results.forEach((item, index) => {
      const comma = index < results.length - 1 ? ',' : '';
      tsContent += `  { id: ${item.id}, name: "${item.name}", category: "${item.category}", tier: "${item.tier}" }${comma}\n`;
    });
    
    tsContent += `];

export function getAllAnalysisItems() {
  return EXPANDED_ITEM_POOL.map(item => ({
    id: item.id,
    name: item.name
  }));
}

export function getItemsByCategory(category: ItemPoolEntry['category']) {
  return EXPANDED_ITEM_POOL.filter(item => item.category === category);
}

export function getItemsByTier(tier: ItemPoolEntry['tier']) {
  return EXPANDED_ITEM_POOL.filter(item => item.tier === tier);
}
`;
    
    fs.writeFileSync('lib/expandedItemPool.ts', tsContent);
    console.log('✅ Successfully generated lib/expandedItemPool.ts with ${results.length} items!');
  });
}).on('error', err => console.error('Error:', err));
