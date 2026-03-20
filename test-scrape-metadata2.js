import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function test() {
  const url = 'https://animesalt.ac/series/naruto-shippuden/';
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);
  
  console.log('--- HTML Dump ---');
  // Find the container that holds the title "Naruto Shippuden"
  const titleEl = $('h1').first();
  console.log('Title parent HTML:', titleEl.parent().parent().html());
}

test();
