import * as cheerio from 'cheerio';
import fs from 'fs';

const html = fs.readFileSync('naruto.html', 'utf-8');
const $ = cheerio.load(html);

console.log('Image:', $('img[data-src]').first().attr('data-src'));
console.log('Episodes:', $('.episodes li').length);
console.log('Episodes (a):', $('a[href*="/episode/"]').length);

const episodes = [];
$('a[href*="/episode/"]').each((i, el) => {
  const title = $(el).text().trim();
  const link = $(el).attr('href');
  if (title) episodes.push({ title, link });
});
console.log('Episodes sample:', episodes.slice(0, 5));

const info = {};
$('.info p, .custom-fields p, .meta p, .sgeneros a').each((i, el) => {
  console.log($(el).text().trim());
});
