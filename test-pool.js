const https = require('https');

// Test the pool by fetching items
async function testPool() {
  try {
    // Make request to getPopularItems 
    const module = await import('./lib/api/osrs.ts');
    // This won't work directly, so let's just list the POPULAR_CATEGORIES from the code
    
    const POPULAR_CATEGORIES = [
      // Logs / fletching base
      'oak logs', 'willow logs', 'maple logs', 'yew logs', 'magic logs', 'teak logs', 'mahogany logs',
      'bow string', 'flax', 'bale of flax', 'feather', 'arrow shaft', 'headless arrow',

      // Unstrung bows
      'maple longbow (u)', 'yew longbow (u)', 'magic longbow (u)',
      'maple shortbow (u)', 'yew shortbow (u)', 'magic shortbow (u)',

      // Ores / bars
      'iron ore', 'coal', 'mithril ore', 'adamantite ore', 'runite ore', 'gold ore',
      'steel bar', 'mithril bar', 'adamantite bar', 'runite bar', 'gold bar',

      // Construction inputs
      'plank', 'oak plank', 'teak plank', 'mahogany plank',
      'steel nails', 'mithril nails', 'adamant nails', 'rune nails',

      // Dragonhides / leathers
      'green dragonhide', 'blue dragonhide', 'red dragonhide', 'black dragonhide',
      'green dragon leather', 'blue dragon leather', 'red dragon leather', 'black dragon leather',

      // Bones
      'dragon bones', 'babydragon bones', 'wyvern bones', 'superior dragon bones', 'crushed superior dragon bones',

      // Herblore herbs (grimy + clean)
      'grimy ranarr weed', 'grimy snapdragon', 'grimy toadflax', 'grimy avantoe', 'grimy kwuarm',
      'grimy cadantine', 'grimy torstol', 'grimy dwarf weed', 'grimy lantadyme',
      'ranarr weed', 'snapdragon', 'toadflax', 'avantoe', 'kwuarm', 'cadantine',
      'torstol', 'dwarf weed', 'lantadyme',

      // Seeds
      'ranarr seed', 'snapdragon seed', 'toadflax seed', 'torstol seed',
      'cadantine seed', 'dwarf weed seed', 'lantadyme seed',

      // Unfinished potions
      'ranarr potion (unf)', 'snapdragon potion (unf)', 'toadflax potion (unf)', 'avantoe potion (unf)',
      'kwuarm potion (unf)', 'cadantine potion (unf)', 'torstol potion (unf)', 'dwarf weed potion (unf)',
      'lantadyme potion (unf)', 'vial of water',

      // Herblore secondaries
      'snape grass', 'limpwurt root', 'mort myre fungus', 'potato cactus', 'white berries',
      'wine of zamorak', 'unicorn horn dust', 'goat horn dust', 'chocolate dust',
      "red spiders' eggs", 'blue dragon scale', 'eye of newt', 'snakeskin',
      'buckets of compost', 'supercompost', 'ultracompost', 'volcanic ash',

      // Glassmaking / skilling bulk
      'bucket of sand', 'soda ash', 'seaweed', 'giant seaweed', 'molten glass',

      // Ammo/components
      'cannonball', 'dragon bolts (unf)', 'amethyst arrowtips', 'amethyst dart tip', 'dragon dart tip',
    ];

    console.log(`Total items in POPULAR_CATEGORIES: ${POPULAR_CATEGORIES.length}`);
    console.log('Items:', POPULAR_CATEGORIES.map((name, i) => `${i+1}. ${name}`).join('\n'));
  } catch (error) {
    console.error('Error:', error);
  }
}

testPool();
