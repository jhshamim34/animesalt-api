import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function test() {
  const url = 'https://animesalt.ac/series/naruto-shippuden/';
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);
  
  console.log('--- Info Dump ---');
  // Check common metadata containers
  $('.info, .custom_fields, .meta, .sgeneros, .episodios').each((i, el) => {
    console.log($(el).text().replace(/\s+/g, ' ').trim());
  });
  
  // Look for specific keywords
  $('span, div, li, p').each((i, el) => {
    const text = $(el).text().trim();
    if (text.toLowerCase().includes('season') || 
        text.toLowerCase().includes('episode') || 
        text.toLowerCase().includes('language') ||
        text.toLowerCase().includes('sub') ||
        text.toLowerCase().includes('dub')) {
      // console.log('Found keyword in:', text.substring(0, 100));
    }
  });

  // Let's just print all text from a likely container
  console.log('Content:', $('#info, .content, article').text().replace(/\s+/g, ' ').substring(0, 1000));
}

test();
