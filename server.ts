import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import * as cheerio from "cheerio";
import axios from "axios";

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

      const results: any[] = [];
      $("article").each((i, el) => {
        const title = $(el).find(".entry-title").text().trim();
        const link = $(el).find("a.lnk-blk").attr("href");
        const image = $(el).find("img").attr("data-src") || $(el).find("img").attr("src");
        const typeText = $(el).find(".watch.btn.sm").text().trim().toLowerCase();
        
        let id = "";
        let type = "series";
        if (link) {
          const parts = link.split("/").filter(Boolean);
          id = parts[parts.length - 1];
          if (link.includes("/movies/")) {
            type = "movie";
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

      res.json({ results });
    } catch (error: any) {
      console.error("Search error:", error.message);
      res.status(500).json({ error: "Failed to fetch search results" });
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
      $(".sgeneros a").each((i, el) => {
        genres.push($(el).text().trim());
      });

      const episodes: any[] = [];
      if (type === "series") {
        $("a[href*='/episode/']").each((i, el) => {
          const epTitle = $(el).text().trim().replace(/\\s+/g, " ");
          const link = $(el).attr("href");
          if (epTitle && link) {
            episodes.push({ title: epTitle, link });
          }
        });
      }

      res.json({
        id,
        title,
        type,
        description,
        poster: poster ? (poster.startsWith("//") ? "https:" + poster : poster) : null,
        genres,
        episodes: type === "series" ? episodes : undefined
      });
    } catch (error: any) {
      console.error("Info error:", error.message);
      if (error.response && error.response.status === 404) {
        return res.status(404).json({ error: "Anime not found" });
      }
      res.status(500).json({ error: "Failed to fetch anime info" });
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
