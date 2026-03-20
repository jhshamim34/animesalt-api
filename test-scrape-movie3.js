import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function test() {
  const res = await fetch('https://animesalt.ac/?s=naruto');
  const html = await res.text();
  const $ = cheerio.load(html);
  
  $('article.item').each((i, el) => {
    const link = $(el).find('a.lnk-blk').attr('href');
    console.log('Link:', link);
  });
}

test();
