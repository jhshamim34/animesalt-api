import * as cheerio from 'cheerio';
import fs from 'fs';

const html = fs.readFileSync('naruto.html', 'utf-8');
const $ = cheerio.load(html);

console.log('Seasons:', $('.seasons-list li, .seasons select option, [id^="season-"]').length);
console.log('Season elements:', $('.seasons-list li, .seasons select option, [id^="season-"]').map((i, el) => $(el).text().trim()).get());

console.log('Image:', $('.poster img').attr('src') || $('.poster img').attr('data-src'));
