import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';

async function test() {
  const res = await fetch('https://animesalt.ac/series/naruto-shippuden/');
  const html = await res.text();
  fs.writeFileSync('naruto.html', html);
  console.log('Saved to naruto.html');
}

test();
