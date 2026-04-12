import express from "express";
import cors from "cors";
import axios from "axios";
import * as cheerio from "cheerio";
import NodeCache from "node-cache";

const app = express();
app.use(cors());

// Initialize cache: 1 hour TTL, check every 10 mins
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// Helper function to fetch with cache
async function fetchWithCache(key: string, fetcher: () => Promise<any>) {
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }
  const data = await fetcher();
  cache.set(key, data);
  return data;
}

// Helper to parse anime list from HTML
function parseAnimeList($: cheerio.CheerioAPI, elements: cheerio.Cheerio<any>) {
  const results: any[] = [];
  elements.each((i, el) => {
    const title = $(el).find(".entry-title").text().trim();
    const link = $(el).find("a.lnk-blk").attr("href");
    const image = $(el).find("img").attr("data-src") || $(el).find("img").attr("src");
    const type = $(el).find(".type").text().trim();
    const status = $(el).find(".status").text().trim();
    const episode = $(el).find(".epx").text().trim();

    let id = "";
    if (link) {
      const parts = link.split("/").filter(Boolean);
      id = parts[parts.length - 1];
    }

    if (title && id) {
      results.push({
        id,
        title,
        image: image ? (image.startsWith("//") ? "https:" + image : image) : null,
        type,
        status,
        episode,
        link
      });
    }
  });
  return results;
}

async function fetchAllPages(baseUrl: string, typeParam?: string) {
  const firstPageUrl = typeParam ? `${baseUrl}?type=${typeParam}` : baseUrl;
  const response = await axios.get(firstPageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
  });
  const $ = cheerio.load(response.data);
  let maxPage = 1;
  $(".pagination .page-link").each((i, el) => {
    const text = $(el).text();
    const num = parseInt(text);
    if (!isNaN(num) && num > maxPage) {
      maxPage = num;
    }
  });

  let allResults = parseAnimeList($, $("article"));
  
  if (maxPage > 1) {
    const urls = [];
    for (let i = 2; i <= maxPage; i++) {
      urls.push(typeParam ? `${baseUrl}page/${i}/?type=${typeParam}` : `${baseUrl}page/${i}/`);
    }
    
    // Process in chunks of 5 to avoid rate limits
    const chunkSize = 5;
    for (let i = 0; i < urls.length; i += chunkSize) {
      const chunk = urls.slice(i, i + chunkSize);
      const promises = chunk.map(url => 
        axios.get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
          }
        }).catch(() => null)
      );
      
      const results = await Promise.all(promises);
      for (const r of results) {
        if (r && r.status === 200) {
          const $page = cheerio.load(r.data);
          allResults = allResults.concat(parseAnimeList($page, $page("article")));
        }
      }
      
      // Small delay between chunks
      if (i + chunkSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
  
  return { results: allResults, totalPages: maxPage, totalItems: allResults.length };
}

app.get("/api/anime/search", async (req, res) => {
  try {
    const { q, page = 1 } = req.query;
    if (!q) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const cacheKey = `search_${q}_${page}`;
    const data = await fetchWithCache(cacheKey, async () => {
      const url = `https://animesalt.ac/page/${page}/?s=${encodeURIComponent(q as string)}`;
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
      const $ = cheerio.load(response.data);
      const results = parseAnimeList($, $("article"));
      
      const hasNextPage = $(".pagination .next").length > 0;
      
      return { results, hasNextPage, page: Number(page) };
    });

    res.json(data);
  } catch (error: any) {
    console.error("Search error:", error.message);
    res.status(500).json({ error: "Failed to fetch search results" });
  }
});

app.get("/api/anime/trending", async (req, res) => {
  try {
    const cacheKey = "trending";
    const data = await fetchWithCache(cacheKey, async () => {
      const url = "https://animesalt.ac/";
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
      const $ = cheerio.load(response.data);
      const section = $("h3:contains('Trending')").closest("section");
      const results = parseAnimeList($, section.find("article"));
      return { results };
    });
    res.json(data);
  } catch (error: any) {
    console.error("Error fetching trending:", error.message);
    res.status(500).json({ error: "Failed to fetch trending anime" });
  }
});

app.get("/api/anime/recent", async (req, res) => {
  try {
    const cacheKey = "recent";
    const data = await fetchWithCache(cacheKey, async () => {
      const url = "https://animesalt.ac/";
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
      const $ = cheerio.load(response.data);
      const section = $("h3:contains('Recent Releases')").closest("section");
      const results = parseAnimeList($, section.find("article"));
      return { results };
    });
    res.json(data);
  } catch (error: any) {
    console.error("Error fetching recent:", error.message);
    res.status(500).json({ error: "Failed to fetch recent releases" });
  }
});

app.get("/api/anime/freshdrops", async (req, res) => {
  try {
    const cacheKey = "freshdrops";
    const data = await fetchWithCache(cacheKey, async () => {
      const url = "https://animesalt.ac/";
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
      const $ = cheerio.load(response.data);
      const section = $("h3:contains('Fresh Drops')").closest("section");
      const results = parseAnimeList($, section.find("article"));
      return { results };
    });
    res.json(data);
  } catch (error: any) {
    console.error("Error fetching freshdrops:", error.message);
    res.status(500).json({ error: "Failed to fetch fresh drops" });
  }
});

app.get("/api/anime/series", async (req, res) => {
  try {
    const cacheKey = `series_all`;
    const data = await fetchWithCache(cacheKey, async () => {
      return await fetchAllPages("https://animesalt.ac/category/type/anime/", "series");
    });
    res.json(data);
  } catch (error: any) {
    console.error("Error fetching series:", error.message);
    res.status(500).json({ error: "Failed to fetch series" });
  }
});

app.get("/api/anime/movies", async (req, res) => {
  try {
    const cacheKey = `movies_all`;
    const data = await fetchWithCache(cacheKey, async () => {
      return await fetchAllPages("https://animesalt.ac/category/type/anime/", "movies");
    });
    res.json(data);
  } catch (error: any) {
    console.error("Error fetching movies:", error.message);
    res.status(500).json({ error: "Failed to fetch movies" });
  }
});

app.get("/api/anime/cartoon", async (req, res) => {
  try {
    const cacheKey = `cartoon_all`;
    const data = await fetchWithCache(cacheKey, async () => {
      return await fetchAllPages("https://animesalt.ac/category/type/cartoon/");
    });
    res.json(data);
  } catch (error: any) {
    console.error("Error fetching cartoon:", error.message);
    res.status(500).json({ error: "Failed to fetch cartoon" });
  }
});

app.get("/api/anime/hindidub", async (req, res) => {
  try {
    const cacheKey = `hindidub_all`;
    const data = await fetchWithCache(cacheKey, async () => {
      return await fetchAllPages("https://animesalt.ac/category/language/hindi/");
    });
    res.json(data);
  } catch (error: any) {
    console.error("Error fetching hindidub:", error.message);
    res.status(500).json({ error: "Failed to fetch hindi dub" });
  }
});

async function fetchAnilistId(title: string): Promise<number | null> {
  try {
    const query = `
      query ($search: String) {
        Media (search: $search, type: ANIME) {
          id
        }
      }
    `;
    const variables = { search: title };
    const response = await axios.post("https://graphql.anilist.co", { query, variables }, {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });
    return response.data?.data?.Media?.id || null;
  } catch (error: any) {
    console.error("Failed to fetch Anilist ID:", error.message);
    return null;
  }
}

app.get("/api/anime/info", async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "Query parameter 'id' is required" });
    }

    const cacheKey = `info_${id}`;
    const data = await fetchWithCache(cacheKey, async () => {
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
          try {
            response = await axios.get(url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
              }
            });
          } catch (movieErr: any) {
            if (movieErr.response && movieErr.response.status === 404) {
              const notFoundErr = new Error("Anime not found");
              (notFoundErr as any).status = 404;
              throw notFoundErr;
            }
            throw movieErr;
          }
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

      // Extract seasons
      const seasons: any[] = [];
      $(".season-btn").each((i, el) => {
        const sTitle = $(el).text().trim();
        const sId = $(el).attr("data-season");
        const postId = $(el).attr("data-post");
        if (sTitle && sId) {
          seasons.push({ id: sId, title: sTitle, postId });
        }
      });

      // Extract episodes if it's a series
      const episodes: any[] = [];
      if (type === "series") {
        $("article").each((i, el) => {
          const epTitle = $(el).find(".entry-title").text().trim();
          const epNum = $(el).find(".num-epi").text().trim();
          const epLink = $(el).find("a.lnk-blk").attr("href");
          let epId = "";
          if (epLink) {
            const parts = epLink.split("/").filter(Boolean);
            epId = parts[parts.length - 1];
          }
          
          if (epTitle && epId && epLink.includes("/episode/")) {
            episodes.push({
              id: epId,
              number: epNum || String(i + 1),
              title: epTitle,
              link: epLink
            });
          }
        });
      }

      const anilistId = await fetchAnilistId(title);

      return {
        id,
        title,
        anilistId,
        type,
        description,
        image: image ? (image.startsWith("//") ? "https:" + image : image) : null,
        metadata,
        seasons: seasons.length > 0 ? seasons : undefined,
        episodes: episodes.length > 0 ? episodes : undefined,
        url
      };
    });

    res.json(data);
  } catch (error: any) {
    console.error("Info error:", error.message);
    if (error.status === 404 || error.message === "Anime not found") {
      res.status(404).json({ error: "Anime not found" });
    } else {
      res.status(500).json({ error: "Failed to fetch anime info" });
    }
  }
});

app.get("/api/anime/episodes", async (req, res) => {
  try {
    const { id, season } = req.query;
    if (!id) {
      return res.status(400).json({ error: "Query parameter 'id' is required" });
    }

    const cacheKey = `episodes_${id}_${season || "1"}`;
    const data = await fetchWithCache(cacheKey, async () => {
      let url = `https://animesalt.ac/series/${id}/`;
      let response;
      let isMovie = false;

      try {
        response = await axios.get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
          }
        });
      } catch (err: any) {
        if (err.response && err.response.status === 404) {
          // It might be a movie
          url = `https://animesalt.ac/movies/${id}/`;
          try {
            response = await axios.get(url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
              }
            });
            isMovie = true;
          } catch (movieErr: any) {
            if (movieErr.response && movieErr.response.status === 404) {
              const notFoundErr = new Error("Anime not found");
              (notFoundErr as any).status = 404;
              throw notFoundErr;
            }
            throw movieErr;
          }
        } else {
          throw err;
        }
      }

      if (isMovie) {
        // Movies don't have episodes
        return { id, episodes: [] };
      }

      const $ = cheerio.load(response.data);
      const postId = $(".season-btn").first().attr("data-post");
      const targetSeason = season || "1";

      let episodesHtml = response.data;

      if (postId) {
        // Fetch episodes for the specific season via AJAX
        try {
          const formData = new URLSearchParams();
          formData.append("action", "action_select_season");
          formData.append("season", targetSeason as string);
          formData.append("post", postId);

          const ajaxRes = await axios.post("https://animesalt.ac/wp-admin/admin-ajax.php", formData, {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
          });
          episodesHtml = ajaxRes.data;
        } catch (ajaxErr) {
          console.error("AJAX error fetching season episodes:", ajaxErr);
          // Fallback to the main page HTML if AJAX fails
        }
      }

      const $episodes = cheerio.load(episodesHtml);
      const episodes: any[] = [];

      $episodes("article").each((i, el) => {
        const epTitle = $episodes(el).find(".entry-title").text().trim();
        const epNum = $episodes(el).find(".num-epi").text().trim();
        const epLink = $episodes(el).find("a.lnk-blk").attr("href");
        let epId = "";
        if (epLink) {
          const parts = epLink.split("/").filter(Boolean);
          epId = parts[parts.length - 1];
        }
        
        if (epTitle && epId && epLink && epLink.includes("/episode/")) {
          episodes.push({
            id: epId,
            number: epNum || String(i + 1),
            title: epTitle,
            link: epLink
          });
        }
      });

      return { id, season: targetSeason, episodes };
    });

    res.json(data);
  } catch (error: any) {
    console.error("Episodes error:", error.message);
    if (error.status === 404 || error.message === "Anime not found") {
      res.status(404).json({ error: "Anime not found" });
    } else {
      res.status(500).json({ error: "Failed to fetch episodes" });
    }
  }
});

app.get("/api/anime/stream", async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "Query parameter 'id' is required" });
    }

    const cacheKey = `stream_${id}`;
    const data = await fetchWithCache(cacheKey, async () => {
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
          try {
            response = await axios.get(url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
              }
            });
          } catch (movieErr: any) {
            if (movieErr.response && movieErr.response.status === 404) {
              const notFoundErr = new Error("Stream not found");
              (notFoundErr as any).status = 404;
              throw notFoundErr;
            }
            throw movieErr;
          }
        } else {
          throw err;
        }
      }

      const $ = cheerio.load(response.data);
      const streams: any[] = [];

      // Get server names
      const serverNames: string[] = [];
      $(".server-btn").each((i, el) => {
        serverNames.push($(el).find(".server-name").text().trim() || `Server ${i+1}`);
      });
      
      $("[id^=options-]").each((i, el) => {
        const iframeSrc = $(el).find("iframe").attr("src") || $(el).find("iframe").attr("data-src");
        if (iframeSrc) {
          if (iframeSrc.includes("multi-lang-plyr")) {
            try {
              const urlObj = new URL(iframeSrc);
              const data = urlObj.searchParams.get("data");
              if (data) {
                const decoded = Buffer.from(data, "base64").toString("utf-8");
                const parsed = JSON.parse(decoded);
                parsed.forEach((p: any) => {
                  streams.push({
                    server: `${serverNames[i] || "Server " + (i+1)} - ${p.language}`,
                    link: p.link
                  });
                });
              }
            } catch (e) {
              console.error("Failed to parse multi-lang", e);
            }
          } else {
            streams.push({
              server: serverNames[i] || `Server ${i+1}`,
              link: iframeSrc
            });
          }
        }
      });

      // Find a stream that can be extracted (e.g. as-cdn21.top)
      const targetStream = streams.find(s => s.link.includes("as-cdn21.top") || s.link.includes("hindi") || s.link.includes("dub")) || streams[0];
      
      if (targetStream && targetStream.link) {
        try {
          const extractorUrl = `https://hindi-dub-extractor-apia-1.jhshamim81.workers.dev/api/extract?url=${encodeURIComponent(targetStream.link)}`;
          const extractorRes = await axios.get(extractorUrl);
          if (extractorRes.data && extractorRes.data.success) {
            const extractedData = extractorRes.data;
            const urls: any[] = [];
            if (extractedData.files) {
              for (const [lang, fileData] of Object.entries(extractedData.files)) {
                urls.push({
                  language: lang,
                  url: (fileData as any).m3u8_url
                });
              }
            }
            return { ...extractedData, urls, originalStreams: streams };
          }
        } catch (extractError: any) {
          console.error("Extractor error:", extractError.message);
          // Fallback to returning the streams array
        }
      }

      return { streams, urls: [] };
    });

    res.json(data);
  } catch (error: any) {
    console.error("Stream error:", error.message);
    if (error.status === 404 || error.message === "Stream not found") {
      res.status(404).json({ error: "Stream not found" });
    } else {
      res.status(500).json({ error: "Failed to fetch stream URLs" });
    }
  }
});

export default app;
