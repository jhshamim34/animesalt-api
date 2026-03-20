import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import * as cheerio from "cheerio";
import axios from "axios";

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
        const response = await axios.get(targetUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
          }
        });
        const $ = cheerio.load(response.data);
        const results = parseAnimeList($, $("article"));
        res.json({ results });
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
      const description = $("p").map((i, el) => $(el).text().trim()).get().filter(t => t.length > 50).join("\\n");
      
      const images = $("img").map((i, el) => $(el).attr("data-src") || $(el).attr("src")).get();
      const poster = images.find(src => src && src.includes("tmdb.org/t/p/w342")) 
        || images.find(src => src && src.includes("tmdb.org")) 
        || images[1] 
        || null;

      const genres: string[] = [];
      $('h4:contains("Genres")').next('div').find('a').each((i, el) => {
        genres.push($(el).text().trim());
      });

      const languages: string[] = [];
      $('h4:contains("Languages")').next('div').find('a').each((i, el) => {
        languages.push($(el).text().trim());
      });

      let totalSeasons = 0;
      let totalEpisodes = 0;

      $('div').each((i, el) => {
        const text = $(el).text().trim();
        if (text.match(/^\d+\s+Seasons$/i)) {
          totalSeasons = parseInt(text, 10);
        }
        if (text.match(/^\d+\s+Episodes$/i)) {
          totalEpisodes = parseInt(text, 10);
        }
      });

      const seasons: any[] = [];
      $('.season-btn').each((i, el) => {
        const seasonNum = $(el).attr('data-season');
        const text = $(el).text().trim();
        if (seasonNum) {
          seasons.push({ season: seasonNum, text });
        }
      });

      res.json({
        id,
        title,
        type,
        description,
        poster: poster ? (poster.startsWith("//") ? "https:" + poster : poster) : null,
        genres,
        languages,
        totalSeasons,
        totalEpisodes,
        seasons: type === "series" ? seasons : undefined
      });
    } catch (error: any) {
      console.error("Info error:", error.message);
      if (error.response && error.response.status === 404) {
        return res.status(404).json({ error: "Anime not found" });
      }
      res.status(500).json({ error: "Failed to fetch anime info" });
    }
  });

  app.get("/api/anime/episodes", async (req, res) => {
    try {
      const { id, season } = req.query;
      if (!id || !season) {
        return res.status(400).json({ error: "Query parameters 'id' and 'season' are required" });
      }

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
          return res.status(404).json({ error: "Anime not found" });
        }
        throw err;
      }

      const $ = cheerio.load(response.data);
      const postIdMatch = $("body").attr("class")?.match(/postid-(\d+)/);
      const postId = postIdMatch ? postIdMatch[1] : null;

      if (!postId) {
        return res.status(404).json({ error: "Could not find anime post ID" });
      }

      const ajaxUrl = `https://animesalt.ac/wp-admin/admin-ajax.php?action=action_select_season&season=${season}&post=${postId}`;
      const epRes = await axios.get(ajaxUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
      
      const $ep = cheerio.load(epRes.data);
      const episodes: any[] = [];
      
      $ep("li").each((i, el) => {
        const epNum = $ep(el).find(".num-epi").text().trim();
        const epTitle = $ep(el).find(".entry-title").text().trim();
        const link = $ep(el).find("a.lnk-blk").attr("href");
        const date = $ep(el).find(".date").text().trim();
        const image = $ep(el).find("img").attr("src");
        
        if (epTitle && link) {
          const parts = link.split("/").filter(Boolean);
          const episodeId = parts[parts.length - 1];
          episodes.push({ 
            id: episodeId, 
            num: epNum, 
            title: epTitle, 
            date, 
            image 
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
      if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Missing or invalid id parameter" });
      }

      const isEpisode = /-\d+x\d+$/.test(id);
      let url = isEpisode 
        ? `https://animesalt.ac/episode/${id}/`
        : `https://animesalt.ac/movies/${id}/`;

      let response;
      try {
        response = await axios.get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
          }
        });
      } catch (e: any) {
        if (e.response && e.response.status === 404) {
          // If 404, try the other URL format just in case
          url = isEpisode 
            ? `https://animesalt.ac/movies/${id}/`
            : `https://animesalt.ac/episode/${id}/`;
            
          response = await axios.get(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
          });
        } else {
          throw e;
        }
      }

      const $ = cheerio.load(response.data);
      const streams: any[] = [];
      const iframes = $(".player iframe").map((i, el) => $(el).attr("src") || $(el).attr("data-src")).get();
      
      iframes.forEach(src => {
        if (!src) return;
        
        if (src.includes("data=")) {
          try {
            const data = src.split("data=")[1];
            const decoded = Buffer.from(data, 'base64').toString('utf-8');
            const parsed = JSON.parse(decoded);
            if (Array.isArray(parsed)) {
              parsed.forEach(item => {
                streams.push({
                  language: item.language || "Unknown",
                  link: item.link
                });
              });
            }
          } catch (e) {
            console.error("Failed to decode base64 stream data");
          }
        } else {
          streams.push({
            language: "Default",
            link: src
          });
        }
      });

      // Find the target URL to extract (prefer as-cdn21.top)
      const targetStream = streams.find(s => s.link.includes('as-cdn21.top')) || streams[0];
      
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
