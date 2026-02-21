const fs = require('fs');

const existingFile = process.argv[2] || 'data/reviews.json';
const newFile = process.argv[3] || 'data/otzovik_final.json';
const outputFile = process.argv[4] || 'data/reviews.json';

function main() {
  let existingData = { reviews: [] };
  try {
    existingData = JSON.parse(fs.readFileSync(existingFile, 'utf8'));
    console.log(`Загружено: ${existingData.reviews?.length || 0} существующих отзывов`);
  } catch (e) {
    console.log('Создаём новую базу');
  }
  
  const existing = existingData.reviews || [];
  const newReviews = JSON.parse(fs.readFileSync(newFile, 'utf8'));
  console.log(`Новых отзывов: ${newReviews.length}`);
  
  const existingKeys = new Set(existing.map(r => `${r.author}|${r.date}|${r.text?.substring(0,100)}`));
  
  const unique = newReviews.filter(r => {
    const key = `${r.author}|${r.date}|${r.text?.substring(0,100)}`;
    return !existingKeys.has(key);
  });
  
  console.log(`Уникальных: ${unique.length}`);
  
  const merged = [...existing, ...unique];
  
  const result = {
    reviews: merged
  };
  
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
  console.log(`\nИтого в базе: ${merged.length} отзывов`);
  console.log(`Сохранено: ${outputFile}`);
}

main();
