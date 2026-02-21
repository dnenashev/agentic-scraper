const fs = require('fs');

const inputFile = process.argv[2] || 'data/otzovik_cheerio.json';
const outputFile = process.argv[3] || 'data/otzovik_normalized.json';

const platformIdMap = {
  'nou_vpo_mezhdunarodnaya_akademiya_biznesa_i_upravleniya_russia_moscow': 'otzovik-1',
  'kolledzh_sovremennih_professiy_singularity_russia_cheboksari': 'otzovik-2',
  'kolledzh_sovremennih_professiy_skypro_russia_krasnoyarsk': 'otzovik-3',
  'kolledzh_sovremennih_professiy_skypro_russia_nizhniy_novgorod': 'otzovik-4',
  'kolledzh_sovremennih_professiy_skypro_russia_tyumen': 'otzovik-5'
};

function getPlatformId(sourceUrl) {
  const match = sourceUrl.match(/\/reviews\/([^\/\?]+)/);
  return match ? platformIdMap[match[1]] || null : null;
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
}

function main() {
  const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  
  const normalized = data.map(review => ({
    platform: 'otzovik',
    platformId: getPlatformId(review.source_url),
    author: review.author || null,
    date: formatDate(review.date),
    rating: review.rating || null,
    title: review.title || null,
    text: review.text || null,
    pros: review.pros || null,
    cons: review.cons || null,
    likes: review.likes || 0,
    comments: review.comments || 0,
    url: review.review_url || null,
    sourceUrl: review.source_url
  })).filter(r => r.platformId);
  
  console.log(`Normalized ${normalized.length} reviews`);
  
  const byPlatform = normalized.reduce((acc, r) => {
    acc[r.platformId] = (acc[r.platformId] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\nBy platform:');
  Object.entries(byPlatform).forEach(([id, count]) => {
    console.log(`  ${id}: ${count}`);
  });
  
  fs.writeFileSync(outputFile, JSON.stringify(normalized, null, 2));
  console.log(`\nSaved to: ${outputFile}`);
}

main();
