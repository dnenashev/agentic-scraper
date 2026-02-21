const fs = require('fs');

const inputFile = process.argv[2] || 'data/otzovik_all.json';
const outputFile = process.argv[3] || 'data/otzovik_parsed.json';

function parseMarkdown(markdown, url, platformId) {
  const reviews = [];
  
  const reviewBlocks = markdown.split(/\n\n(?=\[!\[)/);
  
  for (const block of reviewBlocks) {
    if (!block.trim()) continue;
    
    const review = {
      platform: 'otzovik',
      platformId: platformId,
      url: null,
      author: null,
      authorUrl: null,
      date: null,
      rating: null,
      text: null,
      pros: null,
      cons: null
    };
    
    const authorMatch = block.match(/\[!\[([^\]]+)\]\([^)]+\)\]\(([^)]+)\)/);
    if (authorMatch) {
      review.author = authorMatch[1];
      review.authorUrl = authorMatch[2];
    }
    
    const titleMatch = block.match(/### \[([^\]]+)\]\(([^)]+)\)/);
    if (titleMatch) {
      review.url = titleMatch[2];
    }
    
    const textMatch = block.match(/### \[[^\]]+\]\([^)]+\)\n\n([\s\S]*?)(?=\n\n\*\*Достоинства:|$)/);
    if (textMatch) {
      review.text = textMatch[1].trim();
    }
    
    const prosMatch = block.match(/\*\*Достоинства:\*\*\s*([^\n]+)/);
    if (prosMatch) {
      review.pros = prosMatch[1].trim();
    }
    
    const consMatch = block.match(/\*\*Недостатки:\*\*\s*([^\n]+)/);
    if (consMatch) {
      review.cons = consMatch[1].trim();
    }
    
    if (review.author || review.url) {
      reviews.push(review);
    }
  }
  
  return reviews;
}

function main() {
  const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const allReviews = [];
  
  const platformIds = [
    'otzovik-3',
    'otzovik-4', 
    'otzovik-5',
    'otzovik-2',
    'otzovik-1'
  ];
  
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const platformId = platformIds[i] || `otzovik-${i + 1}`;
    
    console.log(`Parsing: ${item.title} (${platformId})`);
    
    const reviews = parseMarkdown(item.markdownContent, item.url, platformId);
    console.log(`  Found ${reviews.length} reviews`);
    
    allReviews.push(...reviews);
  }
  
  console.log(`\nTotal reviews: ${allReviews.length}`);
  
  fs.writeFileSync(outputFile, JSON.stringify(allReviews, null, 2));
  console.log(`Saved to: ${outputFile}`);
}

main();
