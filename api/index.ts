import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";
import axios from "axios";

const app = express();
app.use(cors());
app.use(express.json());

const parseAnimeList = ($: any, elements: any) => {
  const results: any[] = [];
  elements.each((i: number, el: any) => {
    const title = $(el).find(".entry-title").text().trim();
    const link = $(el).find("a.lnk-blk").attr("href");
    const image = $(el).find("img").attr("data-src") || $(el).find("img").attr("src");
    
    let id = "";
    let type = "series";
    if (link) {
      const parts = link.split("/").filter(Boolean);
      id = parts[parts.length - 1];
      if (link.includes("/movies/")) {
        type = "movie";
      } else if (link.includes("/episode/")) {
        type = "episode";
      }
    }

    if (title && id) {
      results.push({
        id,
        title,
        link,
        image: image ? (image.startsWith("//") ? "https:" + image : image) : null,
        type
      });
    }
  });
  return results;
};

// API Routes
app.get("/api/anime/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const url = `https://animesalt.ac/?s=${encodeURIComponent(q as string)}`;
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    const $ = cheerio.load(response.data);

    const results = parseAnimeList($, $("article"));
    res.json({ results });
  } catch (error: any) {
    console.error("Search error:", error.message);
    res.status(500).json({ error: "Failed to fetch search results" });
  }
});

const createListEndpoint = (path: string, targetUrl: string) => {
  app.get(path, async (req, res) => {
    try {
      const { page } = req.query;
      
      // Fetch first page to get total pages and first page results
      const firstPageUrl = targetUrl;
      const response = await axios.get(firstPageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
      const $ = cheerio.load(response.data);
      let results = parseAnimeList($, $("article"));
      
      // Determine total pages
      let totalPages = 1;
      const lastPageLink = $(".nav-links .page-link").not(".current").last().text();
      if (lastPageLink && !isNaN(parseInt(lastPageLink))) {
        totalPages = parseInt(lastPageLink);
      }

      // If a specific page is requested
      if (page && page !== 'all') {
        const pageNum = parseInt(page as string);
        if (pageNum === 1) {
          return res.json({ results, page: 1, totalPages });
        } else if (pageNum > 1 && pageNum <= totalPages) {
          const pageUrl = `${targetUrl}page/${pageNum}/`;
          const pageRes = await axios.get(pageUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
          });
          const $page = cheerio.load(pageRes.data);
          const pageResults = parseAnimeList($page, $page("article"));
          return res.json({ results: pageResults, page: pageNum, totalPages });
        } else {
          return res.status(404).json({ error: "Page not found" });
        }
      }

      // If no page is specified or page=all, fetch ALL pages concurrently
      if (totalPages > 1) {
        const promises = [];
        for (let i = 2; i <= totalPages; i++) {
          const pageUrl = `${targetUrl}page/${i}/`;
          promises.push(
            axios.get(pageUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
              }
            }).then(pageRes => {
              const $page = cheerio.load(pageRes.data);
              return parseAnimeList($page, $page("article"));
            }).catch(err => {
              console.error(`Failed to fetch page ${i}:`, err.message);
              return [];
            })
          );
        }
        const remainingPagesResults = await Promise.all(promises);
        remainingPagesResults.forEach(pageResults => {
          results = results.concat(pageResults);
        });
      }

      res.json({ results, totalPages, totalItems: results.length });
    } catch (error: any) {
      console.error(`Error fetching ${path}:`, error.message);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });
};

createListEndpoint("/api/anime/series", "https://animesalt.ac/series/");
createListEndpoint("/api/anime/movies", "https://animesalt.ac/movies/");
createListEndpoint("/api/anime/cartoon", "https://animesalt.ac/category/cartoon/");
createListEndpoint("/api/anime/hindidub", "https://animesalt.ac/category/language/hindi/");

app.get("/api/anime/freshdrops", async (req, res) => {
  try {
    const response = await axios.get("https://animesalt.ac/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    const $ = cheerio.load(response.data);
    const section = $("h3:contains('Fresh Drops')").closest("section");
    const results = parseAnimeList($, section.find("article"));
    res.json({ results });
  } catch (error: any) {
    console.error("Error fetching freshdrops:", error.message);
    res.status(500).json({ error: "Failed to fetch fresh drops" });
  }
});

app.get("/api/anime/info", async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "Query parameter 'id' is required" });
    }

    let type = "series";
    let url = `https://animesalt.ac/series/${id}/`;
    let response;

    try {
      response = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
    } catch (err: any) {
      if (err.response && err.response.status === 404) {
        // Try movie URL
        type = "movie";
        url = `https://animesalt.ac/movies/${id}/`;
        response = await axios.get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
          }
        });
      } else {
        throw err;
      }
    }

    const $ = cheerio.load(response.data);

    const title = $("h1").text().trim();
    const description = $("p").map((i, el) => $(el).text().trim()).get().filter(t => t.length > 50).join("\n");
    const image = $(".post-thumbnail img").attr("data-src") || $(".post-thumbnail img").attr("src");
    
    // Extract metadata
    const metadata: Record<string, string> = {};
    $(".info-content .info-item").each((i, el) => {
      const key = $(el).find(".info-title").text().replace(":", "").trim();
      const value = $(el).find(".info-desc").text().trim();
      if (key && value) {
        metadata[key] = value;
      }
    });

    // Extract episodes if it's a series
    const episodes: any[] = [];
    if (type === "series") {
      $(".eplister ul li").each((i, el) => {
        const epTitle = $(el).find(".epl-title").text().trim();
        const epNum = $(el).find(".epl-num").text().trim();
        const epLink = $(el).find("a").attr("href");
        let epId = "";
        if (epLink) {
          const parts = epLink.split("/").filter(Boolean);
          epId = parts[parts.length - 1];
        }
        
        if (epTitle && epId) {
          episodes.push({
            id: epId,
            number: epNum,
            title: epTitle,
            link: epLink
          });
        }
      });
    }

    res.json({
      id,
      title,
      type,
      description,
      image: image ? (image.startsWith("//") ? "https:" + image : image) : null,
      metadata,
      episodes: episodes.length > 0 ? episodes : undefined,
      url
    });
  } catch (error: any) {
    console.error("Info error:", error.message);
    res.status(500).json({ error: "Failed to fetch anime info" });
  }
});

app.get("/api/anime/episodes", async (req, res) => {
  try {
    const { id, season } = req.query;
    if (!id || !season) {
      return res.status(400).json({ error: "Query parameters 'id' and 'season' are required" });
    }

    // This endpoint is a placeholder as AnimeSalt usually lists episodes on the main series page
    // We'll just fetch the series info and return its episodes
    const url = `https://animesalt.ac/series/${id}/`;
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    const $ = cheerio.load(response.data);

    const episodes: any[] = [];
    $(".eplister ul li").each((i, el) => {
      const epTitle = $(el).find(".epl-title").text().trim();
      const epNum = $(el).find(".epl-num").text().trim();
      const epLink = $(el).find("a").attr("href");
      let epId = "";
      if (epLink) {
        const parts = epLink.split("/").filter(Boolean);
        epId = parts[parts.length - 1];
      }
      
      if (epTitle && epId) {
        episodes.push({
          id: epId,
          number: epNum,
          title: epTitle,
          link: epLink
        });
      }
    });

    res.json({ episodes });
  } catch (error: any) {
    console.error("Episodes error:", error.message);
    res.status(500).json({ error: "Failed to fetch episodes" });
  }
});

app.get("/api/anime/stream", async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "Query parameter 'id' is required" });
    }

    // Try episode URL first, then movie URL
    let url = `https://animesalt.ac/episode/${id}/`;
    let response;
    
    try {
      response = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
    } catch (err: any) {
      if (err.response && err.response.status === 404) {
        url = `https://animesalt.ac/movies/${id}/`;
        response = await axios.get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
          }
        });
      } else {
        throw err;
      }
    }

    const $ = cheerio.load(response.data);
    const streams: any[] = [];

    // Extract video player iframes
    $(".mobius select option").each((i, el) => {
      const serverName = $(el).text().trim();
      const encodedData = $(el).attr("value");
      
      if (encodedData) {
        try {
          // The value is base64 encoded HTML containing an iframe
          const decodedHtml = Buffer.from(encodedData, 'base64').toString('utf-8');
          const $iframe = cheerio.load(decodedHtml);
          const src = $iframe("iframe").attr("src");
          
          if (src) {
            streams.push({
              server: serverName,
              link: src
            });
          }
        } catch (e) {
          // Ignore decoding errors
        }
      }
    });

    // If we have a Hindi Dub stream, try to extract the direct m3u8 using the external API
    const targetStream = streams.find(s => s.server.toLowerCase().includes("hindi") || s.server.toLowerCase().includes("dub")) || streams[0];
    
    if (targetStream && targetStream.link) {
      try {
        const extractorUrl = `https://hindi-dub-extractor-apia-1.jhshamim81.workers.dev/api/extract?url=${encodeURIComponent(targetStream.link)}`;
        const extractorRes = await axios.get(extractorUrl);
        return res.json(extractorRes.data);
      } catch (extractError: any) {
        console.error("Extractor error:", extractError.message);
        return res.status(500).json({ 
          error: "Failed to extract stream", 
          details: extractError.message,
          originalStreams: streams 
        });
      }
    }

    res.json({ streams });
  } catch (error: any) {
    console.error("Stream error:", error.message);
    res.status(500).json({ error: "Failed to fetch stream URLs" });
  }
});

export default app;
