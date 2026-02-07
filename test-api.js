const https = require('https');

https.get('https://prices.runescape.wiki/api/v1/osrs/latest', {
  timeout: 5000,
  headers: { 'User-Agent': 'test' }
}, (res) => {
  console.log('Status:', res.statusCode);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response length:', data.length);
    
    try {
      const parsed = JSON.parse(data);
      console.log('Top-level keys:', Object.keys(parsed));
      
      // Check if we have data property
      if (parsed.data) {
        const allKeys = Object.keys(parsed.data);
        console.log('Total items in API:', allKeys.length);
        console.log('First 20 item IDs:', allKeys.slice(0, 20));
        
        // Check specific items from our pool
        const testItems = [2, 43, 44, 47, 127, 1073];
        console.log('\nTest items from pool:');
        testItems.forEach(id => {
          if (parsed.data[id]) {
            console.log(`  ${id}: ${JSON.stringify(parsed.data[id])}`);
          } else {
            console.log(`  ${id}: NOT FOUND`);
          }
        });
      }
    } catch (e) {
      console.log('Parse error:', e.message);
    }
  });
}).on('error', err => console.error('Error:', err.message));
