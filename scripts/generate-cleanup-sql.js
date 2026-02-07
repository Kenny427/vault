const fs = require('fs');

// Read the analysis report
const report = JSON.parse(fs.readFileSync('./pool-volume-analysis.json', 'utf-8'));

// Items to KEEP (user specified)
const keepNames = new Set([
  'Rune arrow', 'Grapes', 'Bow string', 'Yew longbow', 'Dragonstone bolts (e)',
  'Amethyst dart tip', 'Demon tear', 'Raw karambwan', 'Soul rune', 'Mort myre fungus',
  'Sapphire', 'Uncut sapphire', 'Wrath rune', 'Mahogany logs', 'Frozen tear',
  'Yew longbow (u)', 'Amethyst broad bolts', 'Raw monkfish', 'Blood rune', 'Amethyst dart',
  'Amethyst arrowtips', 'Diamond bolts (e)', 'Adamant bolts(unf)', 'Adamant bolts',
  'Ruby bolts (e)', 'Rune dart', 'Coal', "Zulrah's scales", 'Amethyst arrow',
  'Diamond bolt tips', 'Amethyst bolt tips', 'Runite bolts (unf)', 'Runite bolts',
  'Death rune', 'Yew logs', 'Gold ore', 'Teak logs', 'Law rune',
  'Cadantine potion (unf)', 'Eclectic impling jar', 'Kwuarm potion (unf)',
  'Toadflax potion (unf)', 'Avantoe potion (unf)', 'Dwarf weed potion (unf)',
  'Irit potion (unf)', 'Lantadyme potion (unf)', 'Gourmet impling jar',
  'Baby impling jar', 'Teak plank', 'Impling jar', 'Harralander potion (unf)'
]);

// Items to DEFINITELY remove:
// - All trash tier (<100gp): 90 items
// - All low tier (100-500gp): 221 items  
// These are mostly consumables, unfinished items, low-value resources

const removeIds = new Set();

// Add trash tier
report.trashTier.forEach(item => {
  if (!keepNames.has(item.name)) {
    removeIds.add(item.id);
  }
});

// Add low tier
report.lowTier.forEach(item => {
  if (!keepNames.has(item.name)) {
    removeIds.add(item.id);
  }
});

// Also check medium tier for obvious junk:
// - Teleport tablets
// - Seeds (except high-value ones)
// - Quest items
// - Incomplete items
const junkPatterns = [
  'teleport',
  'tablet',
  'seed',
  'potion (unf)',
  'unfinished',
  'bird house',
  'impling jar',
  'pages',
  'ashes',
  'tea',
];

report.mediumTier.forEach(item => {
  const name = item.name.toLowerCase();
  if (junkPatterns.some(pattern => name.includes(pattern)) && !keepNames.has(item.name)) {
    removeIds.add(item.id);
  }
});

const removeArray = Array.from(removeIds).sort((a, b) => a - b);

// Count what was kept from each tier
const keptFromTrash = report.trashTier.filter(i => keepNames.has(i.name));
const keptFromLow = report.lowTier.filter(i => keepNames.has(i.name));

console.log(`\n📊 REMOVAL ANALYSIS`);
console.log(`${'='.repeat(80)}`);
console.log(`Trash tier items (<100gp): ${report.trashTier.length} (kept ${keptFromTrash.length})`);
console.log(`Low tier items (100-500gp): ${report.lowTier.length} (kept ${keptFromLow.length})`);
console.log(`Medium tier junk: ~${removeArray.length - (report.trashTier.length - keptFromTrash.length) - (report.lowTier.length - keptFromLow.length)}`);
console.log(`\nTOTAL REMOVALS: ${removeArray.length} items`);
console.log(`REMAINING: ${795 - removeArray.length} items`);

if (keptFromTrash.length > 0 || keptFromLow.length > 0) {
  console.log(`\n✅ User-requested keeps:`);
  [...keptFromTrash, ...keptFromLow].forEach(item => {
    console.log(`   - ${item.name} (${item.price}gp)`);
  });
}
console.log();

// Generate SQL
const sql = `-- Remove low-quality items from pool
BEGIN;

DELETE FROM custom_pool_items WHERE item_id IN (
${removeArray.map((id, idx) => {
  const line = `  ${id}${idx < removeArray.length - 1 ? ',' : ''}`;
  if ((idx + 1) % 10 === 0) {
    return line + ' -- ' + Math.floor((idx + 1) / removeArray.length * 100) + '%';
  }
  return line;
}).join('\n')}
);

COMMIT;
`;

fs.writeFileSync('./cleanup-pool.sql', sql);

console.log('✅ Saved to: cleanup-pool.sql');
console.log('   Ready to import into Supabase\n');

// Also save a CSV with what's being removed
const csvHeaders = 'ID,Name,Price,Tier,Action';
const csvRows = [
  ...report.trashTier.map(i => `${i.id},"${i.name}",${i.price},trash,${removeIds.has(i.id) ? 'REMOVE' : 'KEPT'}`),
  ...report.lowTier.map(i => `${i.id},"${i.name}",${i.price},low,${removeIds.has(i.id) ? 'REMOVE' : 'KEPT'}`),
  ...report.mediumTier.filter(i => removeIds.has(i.id)).map(i => `${i.id},"${i.name}",${i.price},junk,REMOVE`)
];

const csv = [csvHeaders, ...csvRows].join('\n');
fs.writeFileSync('./pool-removals.csv', csv);

console.log('✅ Saved to: pool-removals.csv');
console.log('   For reference and audit trail\n');
