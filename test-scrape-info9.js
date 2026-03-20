import * as cheerio from 'cheerio';
import fs from 'fs';

const html = fs.readFileSync('naruto.html', 'utf-8');
const $ = cheerio.load(html);

console.log('Text:', $('body').text().replace(/\s+/g, ' ').substring(0, 1000));
