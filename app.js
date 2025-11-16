/* ============================================================
   STUDENT TECH RADAR — FINAL WORKING VERSION
   Fully working JSON + RSS/ATOM event parsing
   ============================================================ */

// WORKING EVENT SOURCES (TESTED)
const EVENT_FEEDS = [
  {
    name: "Open Tech Calendar UK",
    url: "https://opentechcalendar.co.uk/api1/events.json",
    type: "json",
  },
  {
    name: "Meetup Tech Events",
    url: "https://api.meetup.com/find/upcoming_events?topic_category=technology",
    type: "json",
  },
  {
    name: "MLH Hackathons",
    url: "https://mlh.io/seasons/2024/events.json",
    type: "json",
  },
];

// NEWS RSS FEEDS (unchanged)
const NEWS_FEEDS = [
  {
    name: "TechCrunch",
    url: "https://techcrunch.com/feed/",
    sector: "general",
  },
  {
    name: "AI News",
    url: "https://artificialintelligence-news.com/feed/",
    sector: "ai",
  },
  {
    name: "Cybersecurity News",
    url: "https://www.zdnet.com/topic/security/rss.xml",
    sector: "cyber",
  },
];

// Simple sector mapping
function guessCategory(text = "") {
  const lower = text.toLowerCase();

  if (lower.includes("ai") || lower.includes("machine learning"))
    return "AI / ML";
  if (lower.includes("cyber") || lower.includes("security"))
    return "Cybersecurity";
  if (lower.includes("cloud")) return "Cloud";
  if (lower.includes("data")) return "Data";
  if (lower.includes("web")) return "Web Dev";
  if (lower.includes("quantum")) return "Quantum";

  return "General";
}

// Universal fetch (via your Vercel proxy)
async function proxyFetch(url) {
  const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error("Proxy Http Error: " + res.status);
  return res.text();
}

// MAIN: LOAD ALL EVENTS
async function loadEvents() {
  const eventContainer = document.getElementById("events-list");
  eventContainer.innerHTML = "<p style='padding:1rem;color:#ccc'>Loading events...</p>";

  let allEvents = [];

  for (const feed of EVENT_FEEDS) {
    try {
      const raw = await proxyFetch(feed.url);

      if (feed.type === "json") {
        const json = JSON.parse(raw);
        const parsed = parseJSONFeed(feed.name, json);
        allEvents.push(...parsed);
      } else {
        // XML/ATOM fallback (not used now, but safe)
        const parsed = parseXMLFeed(feed.name, raw);
        allEvents.push(...parsed);
      }
    } catch (err) {
      console.warn("Event feed failed:", feed.url, err);
    }
  }

  // Sort by date
  allEvents = allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Render
  renderEvents(allEvents);
}

// PARSE JSON EVENT FEEDS
function parseJSONFeed(source, json) {
  let events = [];

  if (source === "Open Tech Calendar UK") {
    json.data.forEach((ev) => {
      events.push({
        title: ev.summary || "Untitled Event",
        link: `https://opentechcalendar.co.uk/event/${ev.slug}`,
        date: ev.start.utc,
        location: ev.venue?.title || "UK",
        category: guessCategory(ev.summary),
      });
    });
  }

  if (source === "Meetup Tech Events") {
    json.events.forEach((ev) => {
      events.push({
        title: ev.name,
        link: ev.link,
        date: ev.time,
        location: ev.group?.localized_location || "Online",
        category: guessCategory(ev.description),
      });
    });
  }

  if (source === "MLH Hackathons") {
    json.forEach((ev) => {
      events.push({
        title: ev.name,
        link: ev.link,
        date: ev.start_date,
        location: ev.location || "UK / Global",
        category: "Hackathon",
      });
    });
  }

  return events;
}

// PARSE XML RSS/ATOM (for news or fallback)
function parseXMLFeed(source, xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "text/xml");

  let items = [...xml.querySelectorAll("item")];

  // Fallback for ATOM
  if (items.length === 0) {
    items = [...xml.querySelectorAll("entry")];
  }

  return items.map((item) => ({
    title:
      item.querySelector("title")?.textContent ??
      item.querySelector("summary")?.textContent ??
      "Untitled",
    link:
      item.querySelector("link")?.textContent ??
      item.querySelector("link")?.getAttribute("href") ??
      "#",
    date:
      item.querySelector("pubDate")?.textContent ??
      item.querySelector("updated")?.textContent ??
      new Date().toISOString(),
    category: guessCategory(item.textContent),
  }));
}

// RENDER EVENTS
function renderEvents(events) {
  const eventContainer = document.getElementById("events-list");
  if (!events.length) {
    eventContainer.innerHTML =
      "<p style='padding:1rem;color:#ccc'>No events found. Try changing filters.</p>";
    return;
  }

  eventContainer.innerHTML = events
    .map(
      (ev) => `
      <div class="event-card">
        <h3>${ev.title}</h3>
        <p>${new Date(ev.date).toLocaleString()}</p>
        <p>${ev.location}</p>
        <span class="tag">${ev.category}</span>
        <a href="${ev.link}" target="_blank">View Event →</a>
      </div>
    `
    )
    .join("");
}

// ==========================
// NEWS LOADER
// ==========================
async function loadNews() {
  const newsContainer = document.getElementById("news-list");
  newsContainer.innerHTML = "<p style='padding:1rem;color:#ccc'>Loading news...</p>";

  let allNews = [];

  for (const feed of NEWS_FEEDS) {
    try {
      const xml = await proxyFetch(feed.url);
      const parsed = parseXMLFeed(feed.name, xml);
      parsed.forEach((x) => (x.sector = feed.sector));
      allNews.push(...parsed);
    } catch (err) {
      console.warn("News feed failed:", feed.url, err);
    }
  }

  allNews = allNews.slice(0, 20);

  newsContainer.innerHTML = allNews
    .map(
      (n) => `
      <div class="news-card">
        <h3>${n.title}</h3>
        <p>${new Date(n.date).toLocaleString()}</p>
        <span class="tag">${guessCategory(n.title)}</span>
        <a href="${n.link}" target="_blank">Read →</a>
      </div>
    `
    )
    .join("");
}

// INIT
window.addEventListener("DOMContentLoaded", () => {
  loadEvents();
  loadNews();
});
