import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function test() {
  const res = await fetch('https://animesalt.ac/series/naruto-shippuden/');
  const html = await res.text();
  const $ = cheerio.load(html);
  
  console.log('Title:', $('h1').text().trim());
  console.log('Description:', $('.wp-content').text().trim().substring(0, 100));
  console.log('Image:', $('.poster img').attr('src') || $('.poster img').attr('data-src'));
  
  console.log('HTML snippet:', $('.sheader').html()?.substring(0, 500));
  console.log('Episodes snippet:', $('.episodios').html()?.substring(0, 500));
}

test();
