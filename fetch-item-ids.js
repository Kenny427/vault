const https = require('https');

const itemNames = [
  'Air rune', 'Water rune', 'Earth rune', 'Fire rune', 'Mind rune', 'Body rune', 'Chaos rune', 'Cosmic rune',
  'Nature rune', 'Law rune', 'Death rune', 'Blood rune', 'Soul rune', 'Wrath rune', 'Astral rune', 'Mist rune',
  'Dust rune', 'Smoke rune', 'Steam rune', 'Lava rune', 'Mud rune', 'Cannonball', 'Feather', 'Arrow shaft',
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
  'Prayer potion(4)', 'Vial of water', 'Vial', 'Grimy guam leaf', 'Grimy marrentill',
  'Grimy tarromin', 'Grimy harralander', 'Grimy ranarr weed', 'Grimy toadflax', 'Grimy irit leaf',
  'Grimy avantoe', 'Grimy kwuarm', 'Grimy snapdragon', 'Grimy cadantine', 'Grimy lantadyme',
  'Grimy dwarf weed', 'Grimy torstol', 'Guam leaf', 'Marrentill', 'Tarromin', 'Harralander', 'Ranarr weed',
  'Toadflax', 'Irit leaf', 'Avantoe', 'Kwuarm', 'Snapdragon', 'Cadantine', 'Lantadyme', 'Dwarf weed',
  'Torstol', 'Guam seed', 'Marrentill seed', 'Tarromin seed', 'Harralander seed', 'Ranarr seed',
  'Toadflax seed', 'Irit seed', 'Avantoe seed', 'Kwuarm seed', 'Snapdragon seed', 'Cadantine seed',
  'Lantadyme seed', 'Dwarf weed seed', 'Torstol seed', 'Guam potion (unf)', 'Marrentill potion (unf)',
  'Tarromin potion (unf)', 'Harralander potion (unf)', 'Ranarr potion (unf)', 'Toadflax potion (unf)',
  'Irit potion (unf)', 'Avantoe potion (unf)', 'Kwuarm potion (unf)', 'Snapdragon potion (unf)',
  'Cadantine potion (unf)', 'Lantadyme potion (unf)', 'Dwarf weed potion (unf)', 'Torstol potion (unf)',
  'Snape grass', 'Limpwurt root', 'Mort myre fungus', 'Potato cactus', 'White berries', 'Wine of zamorak',
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
  'Harmonised orb', 'Eldritch orb', 'Volatile orb', 'Inquisitor\'s mace', 'Inquisitor\'s great helm',
  'Inquisitor\'s hauberk', 'Inquisitor\'s plateskirt', 'Justiciar faceguard', 'Justiciar chestguard',
  'Justiciar legguards', 'Torva full helm', 'Torva platebody', 'Torva platelegs', 'Masori mask',
  'Masori body', 'Masori chaps', 'Masori mask (f)', 'Masori body (f)', 'Masori chaps (f)', 'Ancestral hat',
  'Ancestral robe top', 'Ancestral robe bottom', 'Virtus mask', 'Virtus robe top', 'Virtus robe legs',
  'Crystal helm', 'Crystal body', 'Crystal legs', 'Bandos godsword', 'Armadyl godsword',
  'Saradomin godsword', 'Zamorak godsword', 'Abyssal dagger', 'Abyssal bludgeon', 'Voidwaker',
  'Ancient godsword', 'Webweaver bow', 'Ursine chainmace', 'Accursed sceptre (u)', 'Dragon pickaxe',
  'Dragon axe', 'Imbued heart', 'Eternal gem', 'Hydra\'s claw', 'Dexterous prayer scroll',
  'Arcane prayer scroll'
];

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
        results.push({ id: item.id, name: item.name });
      } else {
        notFound.push(name);
      }
    });
    
    console.log(`\nMatched: ${results.length} items`);
    console.log(`Not found: ${notFound.length} items\n`);
    
    if (notFound.length > 0) {
      console.log('Items not found:');
      notFound.forEach(name => console.log(`  - ${name}`));
    }
    
    console.log(JSON.stringify({ results, notFound }, null, 2));
  });
}).on('error', err => console.error('Error:', err));
