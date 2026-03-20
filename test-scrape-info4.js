import * as cheerio from 'cheerio';
import fs from 'fs';

const html = fs.readFileSync('naruto.html', 'utf-8');
const $ = cheerio.load(html);

console.log('Title:', $('h1').text().trim());
console.log('Description:', $('.wp-content').text().trim().substring(0, 100));
console.log('Image:', $('.poster img').attr('src') || $('.poster img').attr('data-src'));

console.log('---');
console.log('Body classes:', $('body').attr('class'));
console.log('Main content:', $('#info').html()?.substring(0, 200));
console.log('Seasons:', $('.seasons').length);
console.log('Episodes:', $('.episodios li').length);

const firstEpisode = $('.episodios li').first();
console.log('First episode:', firstEpisode.html());

const info = {};
$('.sgeneros a').each((i, el) => {
  info['genres'] = info['genres'] || [];
  info['genres'].push($(el).text().trim());
});
console.log('Genres:', info['genres']);

