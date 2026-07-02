import * as cheerio from "cheerio";

/**
 * Fetch an offer/landing page and reduce it to the signal Claude needs:
 * title, meta description, headings, and visible body copy. We strip scripts,
 * styles and nav chrome and cap the length to keep prompts tight.
 */
export async function scrapeOffer(url: string): Promise<{ title: string; text: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Present as a normal browser so most landing pages return real HTML.
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) throw new Error(`Fetch failed (${res.status})`);

    const html = await res.text();
    const $ = cheerio.load(html);
    $("script, style, noscript, svg, iframe, header nav, footer").remove();

    const title = $("title").first().text().trim() || $("h1").first().text().trim();
    const metaDesc = $('meta[name="description"]').attr("content") ?? "";
    const headings = $("h1, h2, h3")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean);
    const body = $("body").text().replace(/\s+/g, " ").trim();

    const text = [metaDesc, headings.join(" · "), body]
      .filter(Boolean)
      .join("\n")
      .slice(0, 6000);

    return { title, text };
  } finally {
    clearTimeout(timeout);
  }
}
