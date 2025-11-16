// ====== BASIC CONFIG ======

// Event RSS feeds (some may hit CORS limits – you can swap over time)
const EVENT_FEEDS = [
  {
    name: "Dev.to Events",
    url: "https://dev.to/events/feed"
  },
  {
    name: "Hashnode Events",
    url: "https://hashnode.com/rss/events"
  },
  {
    name: "Open Tech Calendar UK",
    url: "https://opentechcalendar.co.uk/api1/events.atom"
  },
  {
    name: "Hackathons Near Me",
    url: "https://www.hackathonsnear.me/rss"
  }
];



// News RSS feeds
const NEWS_FEEDS = [
  {
    name: "TechCrunch",
    url: "https://techcrunch.com/feed/",
  },
  {
    name: "The Hacker News",
    url: "https://feeds.feedburner.com/TheHackersNews",
  },
  {
    name: "ZDNet · Latest News",
    url: "https://www.zdnet.com/news/rss.xml",
  },
];

const eventsListEl = document.getElementById("eventsList");
const eventsStatusEl = document.getElementById("eventsStatus");
const newsListEl = document.getElementById("newsList");
const newsStatusEl = document.getElementById("newsStatus");

const categoryFilterEl = document.getElementById("categoryFilter");
const cityFilterEl = document.getElementById("cityFilter");
const freeOnlyEl = document.getElementById("freeOnly");
const refreshBtn = document.getElementById("refreshBtn");

const xpFillEl = document.getElementById("xpFill");
const xpTextEl = document.getElementById("xpText");

// Simple XP system for "game" feel
let xp = 0;
function addXP(amount) {
  xp = Math.min(100, xp + amount);
  xpFillEl.style.width = xp + "%";
  xpTextEl.textContent = `${xp} / 100 XP`;
}

// Set year in footer
document.getElementById("year").textContent = new Date().getFullYear();

// ====== RSS FETCHING + PARSING ======
async function fetchRSS(url) {
  try {
    const proxyUrl = "/api/proxy?url=" + encodeURIComponent(url);
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");
    const items = Array.from(xml.querySelectorAll("item"));

    return items.map((item) => ({
      title: item.querySelector("title")?.textContent ?? "Untitled",
      link: item.querySelector("link")?.textContent ?? "#",
      description: item.querySelector("description")?.textContent ?? "",
      pubDate: item.querySelector("pubDate")?.textContent ?? "",
      raw: item,
    }));
  } catch (err) {
    console.warn("Failed to load RSS:", url, err);
    return [];
  }
}

// Category inference based on keywords
function inferCategory(text) {
  const t = text.toLowerCase();
  if (t.includes("quantum")) return "quantum";
  if (t.includes("ai") || t.includes("machine learning") || t.includes("ml"))
    return "ai";
  if (t.includes("cloud") || t.includes("aws") || t.includes("azure") || t.includes("gcp"))
    return "cloud";
  if (t.includes("security") || t.includes("cyber") || t.includes("hacking"))
    return "cyber";
  if (t.includes("data") || t.includes("analytics") || t.includes("database"))
    return "data";
  if (t.includes("web") || t.includes("frontend") || t.includes("javascript") || t.includes("react"))
    return "web";
  return "general";
}

// City inference for events
function inferCity(text) {
  const t = text.toLowerCase();
  if (t.includes("london")) return "london";
  if (t.includes("manchester")) return "manchester";
  if (t.includes("birmingham")) return "birmingham";
  if (t.includes("online") || t.includes("remote") || t.includes("virtual"))
    return "online";
  return "other";
}

// Free vs paid (very rough, but good for students)
function inferFree(text) {
  const t = text.toLowerCase();
  if (t.includes("free") || t.includes("no cost") || t.includes("£0")) return true;
  return false;
}

// Truncate helper
function truncate(text, max = 200) {
  const clean = text.replace(/(<([^>]+)>)/gi, "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 3) + "...";
}

// Nice date
function formatDate(raw) {
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ====== RENDERING ======
let eventsData = [];
let newsData = [];

function renderEvents() {
  const category = categoryFilterEl.value;
  const city = cityFilterEl.value;
  const freeOnly = freeOnlyEl.checked;

  eventsListEl.innerHTML = "";

  let shownCount = 0;

  for (const ev of eventsData) {
    if (category !== "all" && ev.category !== category) continue;
    if (city !== "all" && ev.city !== city) continue;
    if (freeOnly && !ev.isFree) continue;

    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <a href="${ev.link}" target="_blank" rel="noopener noreferrer">
        <h3 class="card-title">${ev.title}</h3>
        <div class="card-meta">
          ${ev.date ? `<span>📅 ${ev.date}</span>` : ""}
          ${ev.cityLabel ? `<span>📍 ${ev.cityLabel}</span>` : ""}
        </div>
        <p class="card-body">${truncate(ev.description, 180)}</p>
        <div class="card-tags">
          <span class="tag tag-primary">${ev.categoryLabel}</span>
          ${ev.isFree ? `<span class="tag tag-free">Free</span>` : ""}
          ${ev.cityLabel ? `<span class="tag tag-city">${ev.cityLabel}</span>` : ""}
          ${ev.isBeginner ? `<span class="tag tag-beginner">Beginner friendly</span>` : ""}
        </div>
      </a>
    `;

    card.addEventListener("click", () => addXP(5));

    eventsListEl.appendChild(card);
    shownCount++;
  }

  if (shownCount === 0) {
    eventsListEl.innerHTML = `
      <div class="card">
        <h3 class="card-title">No events matched your filters.</h3>
        <p class="card-body">
          Try switching sectors or cities, or turn off "Free only".
        </p>
      </div>
    `;
  }

  eventsStatusEl.textContent = `Showing ${shownCount} event${shownCount === 1 ? "" : "s"} from ${
    eventsData.length
  } loaded.`;
}

function renderNews() {
  const category = categoryFilterEl.value;
  newsListEl.innerHTML = "";
  let shownCount = 0;

  for (const item of newsData) {
    if (category !== "all" && item.category !== category) continue;

    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <a href="${item.link}" target="_blank" rel="noopener noreferrer">
        <h3 class="card-title">${item.title}</h3>
        <div class="card-meta">
          ${item.date ? `<span>🕒 ${item.date}</span>` : ""}
          <span>${item.source}</span>
        </div>
        <p class="card-body">${truncate(item.description, 160)}</p>
        <div class="card-tags">
          <span class="tag tag-primary">${item.categoryLabel}</span>
        </div>
      </a>
    `;

    card.addEventListener("click", () => addXP(3));

    newsListEl.appendChild(card);
    shownCount++;
  }

  if (shownCount === 0) {
    newsListEl.innerHTML = `
      <div class="card">
        <h3 class="card-title">No news matched this sector.</h3>
        <p class="card-body">
          Try switching to "All sectors" to see everything.
        </p>
      </div>
    `;
  }

  newsStatusEl.textContent = `Showing ${shownCount} news item${
    shownCount === 1 ? "" : "s"
  } from ${newsData.length} loaded.`;
}

// ====== LOAD DATA ======
async function loadEvents() {
  eventsStatusEl.textContent = "Loading events from multiple feeds…";
  eventsData = [];

  for (const feed of EVENT_FEEDS) {
    const items = await fetchRSS(feed.url);
    if (!items.length) continue;

    const mapped = items.slice(0, 12).map((item) => {
      const combinedText = `${item.title} ${item.description}`;
      const category = inferCategory(combinedText);
      const city = inferCity(combinedText);
      const isFree = inferFree(combinedText);
      const beginner =
        /beginner|intro|getting started|for students|for beginners|entry-level/i.test(
          combinedText
        );

      return {
        title: item.title,
        link: item.link,
        description: item.description,
        date: formatDate(item.pubDate),
        source: feed.name,
        category,
        categoryLabel: categoryLabel(category),
        city,
        cityLabel: cityLabel(city),
        isFree,
        isBeginner: beginner,
      };
    });

    eventsData.push(...mapped);
  }

  if (!eventsData.length) {
    eventsStatusEl.textContent =
      "Could not load event feeds (may be blocked by CORS). You can still use this layout and later plug in a small proxy or different feeds.";
  } else {
    eventsStatusEl.textContent = `Loaded ${eventsData.length} events. Use filters to narrow down.`;
  }

  renderEvents();
}

async function loadNews() {
  newsStatusEl.textContent = "Loading latest tech news…";
  newsData = [];

  for (const feed of NEWS_FEEDS) {
    const items = await fetchRSS(feed.url);
    if (!items.length) continue;

    const mapped = items.slice(0, 15).map((item) => {
      const combinedText = `${item.title} ${item.description}`;
      const category = inferCategory(combinedText);
      return {
        title: item.title,
        link: item.link,
        description: item.description,
        date: formatDate(item.pubDate),
        source: feed.name,
        category,
        categoryLabel: categoryLabel(category),
      };
    });

    newsData.push(...mapped);
  }

  if (!newsData.length) {
    newsStatusEl.textContent =
      "Could not load news feeds (may be blocked by CORS). Try opening this file using a simple web server instead of file://.";
  } else {
    newsStatusEl.textContent = `Loaded ${newsData.length} news items across feeds.`;
  }

  renderNews();
}

function categoryLabel(cat) {
  switch (cat) {
    case "ai":
      return "AI / ML";
    case "cloud":
      return "Cloud / DevOps";
    case "cyber":
      return "Cybersecurity";
    case "web":
      return "Web / App Dev";
    case "data":
      return "Data / Analytics";
    case "quantum":
      return "Quantum";
    default:
      return "General Tech";
  }
}

function cityLabel(city) {
  switch (city) {
    case "london":
      return "London";
    case "manchester":
      return "Manchester";
    case "birmingham":
      return "Birmingham";
    case "online":
      return "Online";
    default:
      return "";
  }
}

// ====== EVENT HANDLERS ======
categoryFilterEl.addEventListener("change", () => {
  renderEvents();
  renderNews();
});

cityFilterEl.addEventListener("change", () => {
  renderEvents();
});

freeOnlyEl.addEventListener("change", () => {
  renderEvents();
});

refreshBtn.addEventListener("click", () => {
  addXP(10);
  loadAll();
});

function loadAll() {
  loadEvents();
  loadNews();
}

// Start
loadAll();
