import axios from "axios";
import * as cheerio from "cheerio";

async function test() {
  try {
    const res2 = await axios.get("https://animesalt.ac/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    const $2 = cheerio.load(res2.data);
    
    // Find Fresh Drops section
    const freshDropsHeading = $2("h3:contains('Fresh Drops')");
    console.log("Fresh Drops heading:", freshDropsHeading.length);
    if (freshDropsHeading.length > 0) {
      const section = freshDropsHeading.closest("section");
      if (section.length) {
        console.log("Found section");
        console.log("Items in section:", section.find("article").length);
      } else {
        const parent = freshDropsHeading.parent().parent();
        console.log("Parent class:", parent.attr("class"));
        console.log("Items in parent:", parent.parent().find("article").length);
      }
    }

  } catch (err: any) {
    console.error("Error:", err.message);
  }
}
test();
