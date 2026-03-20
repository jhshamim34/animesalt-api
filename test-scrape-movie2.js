import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function test() {
  const res = await fetch('https://animesalt.ac/?s=your+name');
  const html = await res.text();
  const $ = cheerio.load(html);
  
  const movies = [];
  $('article.item').each((i, el) => {
    const link = $(el).find('a.lnk-blk').attr('href');
    if (link && link.includes('/movies/')) {
      movies.push(link);
    }
  });
  console.log('Movies:', movies.slice(0, 3));
  
  if (movies.length > 0) {
    const mRes = await fetch(movies[0]);
    const mHtml = await mRes.text();
    const $m = cheerio.load(mHtml);
    console.log('Movie Title:', $m('h1').text().trim());
    console.log('Movie Links:', $m('a[href*="/episode/"], a[href*="/movies/"]').map((i, el) => $m(el).attr('href')).get().slice(0, 5));
  }
}

test();
