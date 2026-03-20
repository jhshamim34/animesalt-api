import * as cheerio from 'cheerio';
import fs from 'fs';

const html = fs.readFileSync('naruto.html', 'utf-8');
const $ = cheerio.load(html);

$('img').each((i, el) => {
  console.log($(el).attr('src'), $(el).attr('data-src'), $(el).attr('alt'));
});

console.log('---');
$('.sgeneros a').each((i, el) => {
  console.log('Genre:', $(el).text().trim());
});

console.log('---');
$('.custom-fields, .meta, .info').each((i, el) => {
  console.log('Info block:', $(el).text().trim());
});
