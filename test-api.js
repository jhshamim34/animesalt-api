import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/anime/search?q=naruto');
    const data = await res.json();
    console.log('Search:', data.results?.length, 'results');
    
    if (data.results?.length > 0) {
      const id = data.results[0].id;
      const res2 = await fetch(`http://localhost:3000/api/anime/info?id=${id}`);
      const data2 = await res2.json();
      console.log('Info:', data2.title, data2.episodes?.length, 'episodes');
    }
  } catch (err) {
    console.error(err);
  }
}

test();
