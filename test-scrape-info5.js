import * as cheerio from 'cheerio';
import fs from 'fs';

const html = fs.readFileSync('naruto.html', 'utf-8');
const $ = cheerio.load(html);

console.log('Title:', $('h1').text().trim());
console.log('Image:', $('img').first().attr('src'));
console.log('All images:', $('img').map((i, el) => $(el).attr('src') || $(el).attr('data-src')).get().slice(0, 5));
console.log('Description:', $('p').map((i, el) => $(el).text().trim()).get().filter(t => t.length > 50).slice(0, 2));

console.log('Links:', $('a').map((i, el) => $(el).attr('href')).get().filter(h => h && h.includes('episode')).slice(0, 5));

console.log('Episode elements:', $('[class*="ep"]').length);
console.log('Episode classes:', $('[class*="ep"]').map((i, el) => $(el).attr('class')).get().slice(0, 5));

