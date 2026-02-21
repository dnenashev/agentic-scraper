const fs = require('fs');

const inputFile = process.argv[2] || 'data/otzovik_normalized.json';
const outputFile = process.argv[3] || 'data/otzovik_final.json';
const limit = parseInt(process.argv[4]) || 3;

function main() {
  const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  
  const grouped = data.reduce((acc, review) => {
    if (!acc[review.platformId]) acc[review.platformId] = [];
    acc[review.platformId].push(review);
    return acc;
  }, {});
  
  const latest = [];
  for (const [platformId, reviews] of Object.entries(grouped)) {
    reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
    const top = reviews.slice(0, limit);
    latest.push(...top);
    console.log(`${platformId}: ${top.length} из ${reviews.length}`);
  }
  
  console.log(`\nИтого: ${latest.length} отзывов`);
  
  fs.writeFileSync(outputFile, JSON.stringify(latest, null, 2));
  console.log(`Сохранено: ${outputFile}`);
}

main();
