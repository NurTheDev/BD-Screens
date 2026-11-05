/**
 * @file catalogue.js
 * @description The bundled "BD Screens Originals" catalogue.
 *
 * Why this exists:
 *  - TMDB has no Bangladeshi originals, and the platform is called BD Screens.
 *  - A portfolio demo must work with zero configuration and zero network.
 *  - Editorial rows ("Late Night", "Family Drama") need titles with real metadata.
 *
 * Everything here is fiction written for this project, with artwork generated for
 * the demo. Each entry uses the exact same shape the TMDB adapter returns, so the
 * UI has one render path (see normalizeTitle in server/lib/tmdb.js).
 *
 * Fields are intentionally verbose: synopsis, tagline, cinema notes, cast. That is
 * what makes a browse page feel authored instead of generated.
 */

/** @typedef {import("../lib/tmdb.js").Title} Title */

const POSTER = (/** @type {string} */ slug) => `/art/poster-${slug}.jpg`;
const PLATE = (/** @type {string} */ slug) => `/art/plates/plate-${slug}.jpg`;
const HERO = (/** @type {string} */ slug) => `/art/hero/hero-${slug}.jpg`;

/**
 * The eight generated originals each have their own key art. The remaining
 * catalogue entries reuse those stills — the same way a real catalogue borrows
 * stock imagery — but each is assigned deliberately (tone-matched to its genre)
 * rather than randomly, so a row never looks duplicated side by side.
 */
const ART_SLUGS = [
  "monsoon-express",
  "last-rickshaw",
  "nodir-deshe",
  "megacity",
  "sonar-tori",
  "zero-hour",
  "chaya",
  "khola-akash",
];

/** Stable, tone-matched art assignment. */
const ART_MAP = {
  "bazar-nights": "khola-akash",
  "the-605-local": "monsoon-express",
  "salt-and-turmeric": "nodir-deshe",
  "radio-chittagong": "last-rickshaw",
  "paper-boats": "khola-akash",
  "dhanmondi-27": "sonar-tori",
  "hilsa-season": "nodir-deshe",
  "eid-rush": "sonar-tori",
  karnafuli: "monsoon-express",
  "winter-in-sylhet": "chaya",
  "tin-shed-cinema": "chaya",
  "night-shift-dhaka": "megacity",
  "rooftop-kabaddi": "khola-akash",
  "the-audacity": "megacity",
  bhola: "last-rickshaw",
  "monsoon-tapes": "zero-hour",
};

/* ------------------------------------------------------------------ *
 * Originals — the eight titles that have full detail pages
 * ------------------------------------------------------------------ */

export const ORIGINALS = [
  {
    id: "demo-original-monsoon-express",
    kind: "movie",
    title: "Monsoon Express",
    tagline: "Every train leaves someone behind.",
    year: 2024,
    releaseDate: "2024-08-16",
    runtime: 118,
    maturity: "U/A 13+",
    language: "Bengali",
    genres: ["Drama", "Mystery"],
    rating: 8.4,
    votes: 12480,
    accent: "#ff6b57",
    moods: ["slow-burn", "crying", "late-night"],
    overview:
      "A ticket collector on the night express notices the same quiet passenger boarding at every station between Dhaka and Chattogram — always with the same cracked suitcase, always paying in old notes. Over one long monsoon, he starts keeping a ledger of her comings and goings, and finds himself inside a story he was never meant to see.",
    notes: [
      {
        title: "Shot on real platforms",
        body: "Most of the station footage was captured between 11pm and 4am at Kamalapur and Feni junction, with the crew riding the actual trains. Nothing was built in a studio.",
      },
      {
        title: "The ledger is the screenplay",
        body: "The collector's notebook entries double as the film's chapter cards — every act break is a fresh page, dated by rainfall.",
      },
      {
        title: "One sound design rule",
        body: "No rain sound is ever mixed clean. Every drop the audience hears is borrowed from a scene that has already happened.",
      },
    ],
    cast: [
      { name: "Rafiqul Hasan", role: "Kuddus, the collector", photo: "/art/cast-1.jpg" },
      { name: "Tahmina Begum", role: "The passenger", photo: "/art/cast-woman.jpg" },
      { name: "Sohel Mahmud", role: "Station master", photo: "/art/cast-stranger.jpg" },
      { name: "Rumana Haque", role: "Kuddus' sister", photo: "/art/cast-2.jpg" },
    ],
    crew: [
      { name: "Nusrat Ara", job: "Director" },
      { name: "Adnan Chowdhury", job: "Writer" },
    ],
    slug: "monsoon-express",
  },
  {
    id: "demo-original-last-rickshaw",
    kind: "movie",
    title: "Last Rickshaw",
    tagline: "He knows every street. None of them lead home.",
    year: 2023,
    releaseDate: "2023-11-03",
    runtime: 102,
    maturity: "U/A 16+",
    language: "Bengali",
    genres: ["Drama", "Slice of Life"],
    rating: 8.1,
    votes: 8932,
    accent: "#e0a458",
    moods: ["slow-burn", "crying", "hopeful"],
    overview:
      "For nineteen years, Salam has pulled the same route through old Dhaka before sunrise. When a developer announces a flyover that will erase his street, he decides to make one last run — inviting every passenger he has ever carried to ride for free, on the same frozen February morning.",
    notes: [
      {
        title: "One morning, one take",
        body: "The final fourteen-minute ride is a single unbroken take, rehearsed for six weeks with a route map painted on the studio floor.",
      },
      {
        title: "Rickshaw as a character",
        body: "The hero vehicle was restored by a family in Narayanganj and is credited in the end titles by its own name, 'Chandni'.",
      },
      {
        title: "No score for the first act",
        body: "Silence until the flyover appears on screen — the score enters exactly when the street ends.",
      },
    ],
    cast: [
      { name: "Jahangir Alam", role: "Salam", photo: "/art/cast-puller.jpg" },
      { name: "Farhana Yasmin", role: "Reba", photo: "/art/cast-2.jpg" },
      { name: "Ashraf Uddin", role: "Contractor", photo: "/art/cast-1.jpg" },
    ],
    crew: [
      { name: "Shahnaz Parvin", job: "Director" },
      { name: "Imran Hossain", job: "Writer" },
    ],
    slug: "last-rickshaw",
  },
  {
    id: "demo-original-nodir-deshe",
    kind: "movie",
    title: "Nodir Deshe",
    tagline: "The river remembers what the village forgets.",
    year: 2022,
    releaseDate: "2022-06-24",
    runtime: 134,
    maturity: "U/A 13+",
    language: "Bengali",
    genres: ["Drama", "Family"],
    rating: 8.7,
    votes: 21044,
    accent: "#3ddc97",
    moods: ["crying", "with-family", "slow-burn"],
    overview:
      "When Hasina inherits a strip of land that the Padma has been quietly swallowing for a decade, she returns to the village she left at nineteen to argue with a river. Her brother wants to sell, the neighbours want a shrine, and her mother, who has stopped speaking, wants to be buried where the water will eventually reach.",
    notes: [
      {
        title: "Filmed across three monsoons",
        body: "The production waited two years to shoot the final flood, then discovered the location had moved 400 metres downstream.",
      },
      {
        title: "Mother's silence was a script choice",
        body: "The character has exactly four lines. The director cut 60 pages of dialogue to get there.",
      },
      {
        title: "Locals wrote the wedding scene",
        body: "The mid-film ceremony is performed by actual residents of Naria, using their own family songs.",
      },
    ],
    cast: [
      { name: "Sabina Akter", role: "Hasina", photo: "/art/cast-woman.jpg" },
      { name: "Mitu Rahman", role: "Amma", photo: "/art/cast-2.jpg" },
      { name: "Rashed Khan", role: "Karim", photo: "/art/cast-1.jpg" },
    ],
    crew: [
      { name: "Taher Bhuiyan", job: "Director" },
      { name: "Samira Kabir", job: "Writer" },
    ],
    slug: "nodir-deshe",
  },
  {
    id: "demo-original-megacity",
    kind: "series",
    title: "Megacity",
    tagline: "The city has eleven million alibis.",
    year: 2025,
    releaseDate: "2025-02-07",
    runtime: 48,
    seasons: 2,
    maturity: "18+",
    language: "Bengali",
    genres: ["Crime", "Thriller", "Mystery"],
    rating: 8.9,
    votes: 33810,
    accent: "#7aa2ff",
    moods: ["adrenaline", "late-night", "slow-burn"],
    overview:
      "A night-shift crime reporter, a burnt-out homicide detective and a courier who delivers things he never looks at are pulled into the same three-day investigation when a body appears in the elevator shaft of an unfinished tower in Hatirjheel. Every witness is lying, and all three of them are hiding the same thing.",
    notes: [
      {
        title: "Written like a wire service",
        body: "Each episode opens with the timestamp of the call that started it, and the two timelines never quite line up on purpose.",
      },
      {
        title: "Practical city",
        body: "The production shut down one lane of Hatirjheel for nine nights and lit it with nothing but the tower's own construction lamps.",
      },
      {
        title: "The courier's route is real",
        body: "Every address he visits can be walked in 40 minutes, and viewers have mapped it.",
      },
    ],
    cast: [
      { name: "Tanvir Ahmed", role: "Rony, reporter", photo: "/art/cast-1.jpg" },
      { name: "Nusrat Ara", role: "Detective Shoma", photo: "/art/cast-2.jpg" },
      { name: "Saikat Barua", role: "The courier", photo: "/art/cast-stranger.jpg" },
    ],
    crew: [
      { name: "Kabir Anwar", job: "Creator" },
      { name: "Nusrat Ara", job: "Director" },
    ],
    slug: "megacity",
  },
  {
    id: "demo-original-sonar-tori",
    kind: "movie",
    title: "Sonar Tori",
    tagline: "Two boys, one boat, and the last summer before everything changed.",
    year: 2021,
    releaseDate: "2021-12-10",
    runtime: 96,
    maturity: "U",
    language: "Bengali",
    genres: ["Coming of Age", "Adventure", "Drama"],
    rating: 7.9,
    votes: 6410,
    accent: "#f0a93b",
    moods: ["hopeful", "with-family", "crying"],
    overview:
      "Robi and Shanto have one week to get a rusted ferry to the district fair before it is sold for scrap. Their route: forty kilometres of river, one stolen engine part, and every secret they have been keeping since class six.",
    notes: [
      {
        title: "The boys are not actors",
        body: "Both leads were cast from a river-side school in Barisal. The script was rewritten around how they actually talk.",
      },
      {
        title: "Golden hour, exactly",
        body: "The whole shoot was scheduled around 57 minutes of usable light per day. The film has no night scenes.",
      },
      {
        title: "The ferry still floats",
        body: "It was restored after filming and now runs a weekend tourist route from Sadarghat.",
      },
    ],
    cast: [
      { name: "Arif Sikder", role: "Robi", photo: "/art/cast-boy.jpg" },
      { name: "Shuvo Das", role: "Shanto", photo: "/art/cast-stranger.jpg" },
    ],
    crew: [{ name: "Zahid Karim", job: "Director" }],
    slug: "sonar-tori",
  },
  {
    id: "demo-original-zero-hour",
    kind: "series",
    title: "Zero Hour",
    tagline: "She has four hours to prove the outage was not an accident.",
    year: 2025,
    releaseDate: "2025-07-18",
    runtime: 42,
    seasons: 1,
    maturity: "16+",
    language: "Bengali",
    genres: ["Thriller", "Tech", "Mystery"],
    rating: 8.2,
    votes: 15602,
    accent: "#4ea8de",
    moods: ["adrenaline", "late-night"],
    overview:
      "At 2:14am the country's largest payment switch goes dark for eleven minutes. A junior security analyst finds a log entry that should not exist, and a clock that keeps resetting to zero. The six-episode season unfolds in real time, one hour per episode.",
    notes: [
      {
        title: "Every screen is real",
        body: "The terminal output on screen is from a working test environment built for the show; the commands actually run.",
      },
      {
        title: "Real-time structure",
        body: "Episodes are 42 minutes because the clock jumps 60 — the missing 18 minutes are where the audience is meant to get suspicious.",
      },
      {
        title: "No hacking music",
        body: "The composer was told the score must never make breaking in sound exciting. It is mostly room tone and typing.",
      },
    ],
    cast: [
      { name: "Rumana Haque", role: "Nabila", photo: "/art/cast-2.jpg" },
      { name: "Imtiaz Rahman", role: "Ops lead", photo: "/art/cast-1.jpg" },
    ],
    crew: [{ name: "Samira Kabir", job: "Creator" }],
    slug: "zero-hour",
  },
  {
    id: "demo-original-chaya",
    kind: "movie",
    title: "Chaya",
    tagline: "Three people, one kettle, and the longest night of the highway.",
    year: 2023,
    releaseDate: "2023-03-31",
    runtime: 89,
    maturity: "U/A 13+",
    language: "Bengali",
    genres: ["Drama", "Anthology"],
    rating: 8.0,
    votes: 7420,
    accent: "#e8b04b",
    moods: ["late-night", "slow-burn", "crying"],
    overview:
      "A tea stall on the Dhaka–Sylhet highway stays open until the last bus. Over one foggy night, three strangers who will never meet again each tell the stall owner one true thing they have not told anyone else.",
    notes: [
      {
        title: "One location, one night",
        body: "Shot in sequence from 9pm to 5am across four consecutive weekends, with the same crew and the same kettle.",
      },
      {
        title: "The kettle is the clock",
        body: "Every story ends when the kettle boils, which is also the only edit point between chapters.",
      },
      {
        title: "Improvised middle act",
        body: "The second story is 11 pages of script and 41 minutes of footage. The film kept the longest version.",
      },
    ],
    cast: [
      { name: "Jahangir Alam", role: "Kartik, stall owner", photo: "/art/cast-1.jpg" },
      { name: "Nusrat Ara", role: "The nurse", photo: "/art/cast-woman.jpg" },
      { name: "Shuvo Das", role: "The student", photo: "/art/cast-stranger.jpg" },
    ],
    crew: [{ name: "Taher Bhuiyan", job: "Director" }],
    slug: "chaya",
  },
  {
    id: "demo-original-khola-akash",
    kind: "movie",
    title: "Khola Akash",
    tagline: "One rooftop. One kite. One afternoon that lasts a childhood.",
    year: 2024,
    releaseDate: "2024-04-12",
    runtime: 104,
    maturity: "U",
    language: "Bengali",
    genres: ["Family", "Coming of Age", "Musical"],
    rating: 8.5,
    votes: 18430,
    accent: "#e6739f",
    moods: ["with-family", "hopeful", "crying"],
    overview:
      "On the last afternoon before his family is moved out of a condemned building in Old Dhaka, twelve-year-old Nayeem enters the neighbourhood kite tournament with a kite his father left unfinished. The whole rooftop — tenants, rivals, the man who is evicting them — is watching.",
    notes: [
      {
        title: "Twelve kites per shot",
        body: "The kite festival scenes used 900 hand-made kites. Six kite masters from Old Dhaka worked on the film.",
      },
      {
        title: "Rooftop is a stage",
        body: "The building's residents play the crowd. Most of them had never been on camera; two now run a small theatre group.",
      },
      {
        title: "A song the father never finished",
        body: "The final song is assembled from three separate takes recorded by the actor and the composer's own father.",
      },
    ],
    cast: [
      { name: "Arif Sikder", role: "Nayeem", photo: "/art/cast-boy.jpg" },
      { name: "Sabina Akter", role: "Rokeya", photo: "/art/cast-2.jpg" },
      { name: "Ashraf Uddin", role: "Saleh", photo: "/art/cast-1.jpg" },
    ],
    crew: [{ name: "Zahid Karim", job: "Director" }],
    slug: "khola-akash",
  },
];

/* ------------------------------------------------------------------ *
 * Catalogue titles — lighter entries used to fill editorial rows
 * ------------------------------------------------------------------ */

const PLAIN = [
  [
    "bazar-nights",
    "Bazar Nights",
    2023,
    ["Comedy", "Slice of Life"],
    7.6,
    5210,
    "#f0a93b",
    ["laughing", "late-night"],
    "A vegetable vendor and a new supermarket go to war over the same single corner of a Mirpur bazar — with the entire street picking sides.",
  ],
  [
    "the-605-local",
    "The 6:05 Local",
    2022,
    ["Drama", "Romance"],
    7.8,
    6180,
    "#4ea8de",
    ["slow-burn", "crying"],
    "Two commuters share the same window seat for four years without ever exchanging a word. Then the schedule changes.",
  ],
  [
    "salt-and-turmeric",
    "Salt & Turmeric",
    2024,
    ["Family", "Drama"],
    8.0,
    9400,
    "#e0a458",
    ["with-family", "hopeful"],
    "Three generations of women run a small spice shop in Shakhari Bazar while deciding, separately, whether to close it.",
  ],
  [
    "radio-chittagong",
    "Radio Chittagong",
    2021,
    ["Drama", "History"],
    8.2,
    11250,
    "#c08457",
    ["slow-burn", "hopeful"],
    "In 1998 a coastal radio station has one night to broadcast a cyclone warning to villages the authorities have forgotten.",
  ],
  [
    "paper-boats",
    "Paper Boats",
    2020,
    ["Coming of Age", "Drama"],
    7.4,
    3980,
    "#7aa2ff",
    ["crying", "hopeful"],
    "A class-seven dropout decides to teach his younger sister everything he was taught, using the back of old election posters.",
  ],
  [
    "dhanmondi-27",
    "Dhanmondi 27",
    2025,
    ["Romance", "Comedy"],
    7.2,
    4620,
    "#e6739f",
    ["laughing", "hopeful"],
    "Two food delivery riders keep arriving at the same address at the same time with someone else's order.",
  ],
  [
    "hilsa-season",
    "Hilsa Season",
    2019,
    ["Drama", "Family"],
    7.9,
    8330,
    "#3ddc97",
    ["with-family", "slow-burn"],
    "A father promises his daughter the biggest hilsa in the river. The river is not cooperating, and neither is the wedding.",
  ],
  [
    "eid-rush",
    "Eid Rush",
    2023,
    ["Comedy", "Family"],
    7.1,
    5140,
    "#f0a93b",
    ["laughing", "with-family"],
    "Six relatives, one train ticket, and four hours to get from Kamalapur to Sylhet before the qurbani.",
  ],
  [
    "karnafuli",
    "Karnafuli",
    2022,
    ["Drama", "Sport"],
    7.7,
    6890,
    "#4ea8de",
    ["hopeful", "adrenaline"],
    "A girls' rowing team from a port town trains for a national race on a river that keeps taking their boats.",
  ],
  [
    "winter-in-sylhet",
    "Winter in Sylhet",
    2024,
    ["Drama", "Mystery"],
    8.1,
    13300,
    "#9b7ede",
    ["slow-burn", "late-night"],
    "A retired tea broker returns to an estate he managed in 1979 to settle a debt nobody remembers agreeing to.",
  ],
  [
    "tin-shed-cinema",
    "Tin Shed Cinema",
    2020,
    ["Drama", "Slice of Life"],
    7.5,
    3210,
    "#c08457",
    ["with-family", "hopeful"],
    "A single-screen cinema with 41 seats refuses to close, showing the same film every Saturday to a shrinking audience.",
  ],
  [
    "night-shift-dhaka",
    "Night Shift Dhaka",
    2025,
    ["Thriller", "Crime"],
    7.8,
    7720,
    "#7aa2ff",
    ["adrenaline", "late-night"],
    "A taxi driver picks up the same passenger three nights in a row. Each time, the destination is different, and the passenger knows his name.",
  ],
  [
    "rooftop-kabaddi",
    "Rooftop Kabaddi",
    2021,
    ["Sport", "Comedy"],
    7.3,
    4050,
    "#3ddc97",
    ["laughing", "adrenaline"],
    "A rooftop kabaddi league of sixteen teams is threatened by a new water tank. The league responds by adding two more teams.",
  ],
  [
    "the-audacity",
    "The Audacity",
    2022,
    ["Comedy", "Drama"],
    7.6,
    5660,
    "#e6739f",
    ["laughing", "late-night"],
    "A wedding planner and a photographer sabotage each other for one client's wedding, which is happening in eighteen hours.",
  ],
  [
    "bhola",
    "Bhola",
    2018,
    ["Drama", "Family"],
    8.3,
    15900,
    "#e0a458",
    ["crying", "with-family"],
    "A ferry mechanic on the Meghna spends a decade building a boat to bring his mother's belongings across a river that no longer has her house.",
  ],
  [
    "monsoon-tapes",
    "Monsoon Tapes",
    2024,
    ["Documentary", "Music"],
    8.4,
    2980,
    "#9b7ede",
    ["hopeful", "late-night"],
    "Five Bangladeshi indie bands record an album in a flooded studio during the 2024 monsoon. This is the film of that week.",
  ],
];

/**
 * Key art for a catalogue entry.
 * @param {string} slug
 */
function artFor(slug) {
  return ART_MAP[slug] ?? ART_SLUGS[slug.length % ART_SLUGS.length];
}

/**
 * Build the plain catalogue into full Title objects.
 * @returns {Title[]}
 */
function buildCatalogue() {
  return PLAIN.map(([slug, title, year, genres, rating, votes, accent, moods, overview]) => ({
    id: `demo-title-${slug}`,
    source: /** @type {const} */ ("demo"),
    kind: /** @type {const} */ ("movie"),
    title: String(title),
    overview: String(overview),
    year: /** @type {number} */ (year),
    releaseDate: `${year}-06-01`,
    genres: /** @type {string[]} */ (genres),
    rating: /** @type {number} */ (rating),
    votes: /** @type {number} */ (votes),
    poster: POSTER(artFor(slug)),
    backdrop: PLATE(artFor(slug)),
    hero: HERO(artFor(slug)),
    accent: String(accent),
    moods: /** @type {string[]} */ (moods),
    runtime: 90 + (String(slug).length % 7) * 6,
    maturity: rating >= 8 ? "U/A 13+" : "16+",
  }));
}

/**
 * Originals in the normalized shape, with extra detail fields used by the
 * title page (cast, crew, notes, seasons).
 * @returns {Title[]}
 */
function buildOriginals() {
  return ORIGINALS.map((item) => ({
    id: item.id,
    source: "demo",
    kind: item.kind,
    title: item.title,
    overview: item.overview,
    year: item.year,
    releaseDate: item.releaseDate,
    genres: item.genres,
    rating: item.rating,
    votes: item.votes,
    poster: POSTER(item.slug),
    backdrop: PLATE(item.slug),
    hero: HERO(item.slug),
    accent: item.accent,
    // Detail-only fields:
    tagline: item.tagline,
    runtime: item.runtime ?? null,
    seasons: item.seasons ?? null,
    maturity: item.maturity,
    language: item.language,
    moods: item.moods,
    cast: item.cast,
    crew: item.crew,
    notes: item.notes,
    similar: [],
  }));
}

export const CATALOGUE = Object.freeze(buildCatalogue());
export const ORIGINAL_TITLES = Object.freeze(buildOriginals());

/** Everything the demo source can serve. */
export const ALL_DEMO_TITLES = Object.freeze([...ORIGINAL_TITLES, ...CATALOGUE]);

/**
 * @param {string} id
 */
export function findDemoTitle(id) {
  return ALL_DEMO_TITLES.find((title) => title.id === id) ?? null;
}

/**
 * Naive but honest search: token match across title, genres and overview.
 * @param {string} query
 * @returns {Title[]}
 */
export function searchDemo(query) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  return ALL_DEMO_TITLES.map((title) => {
    const haystack = `${title.title} ${title.genres.join(" ")} ${title.overview}`.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (title.title.toLowerCase().includes(token)) score += 8;
      else if (title.genres.join(" ").toLowerCase().includes(token)) score += 4;
      else if (haystack.includes(token)) score += 1;
    }
    return { title, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.title.rating - a.title.rating)
    .map((entry) => entry.title);
}

/** Mood definitions used by the Mood Match feature and the discovery page. */
export const MOODS = Object.freeze([
  { id: "slow-burn", label: "Slow burn", blurb: "Let it unfold. No rush.", accent: "#7aa2ff" },
  {
    id: "adrenaline",
    label: "Adrenaline",
    blurb: "Something is always about to happen.",
    accent: "#ff6b57",
  },
  {
    id: "crying",
    label: "Need a good cry",
    blurb: "Bring tissues, not answers.",
    accent: "#e6739f",
  },
  { id: "laughing", label: "Make me laugh", blurb: "Light, sharp, warm.", accent: "#f0a93b" },
  {
    id: "with-family",
    label: "With family",
    blurb: "Everyone in the room, one screen.",
    accent: "#3ddc97",
  },
  {
    id: "late-night",
    label: "Late night",
    blurb: "2am, lights off, headphones on.",
    accent: "#9b7ede",
  },
  {
    id: "hopeful",
    label: "Hopeful",
    blurb: "Things can still turn out fine.",
    accent: "#4ea8de",
  },
]);

/**
 * Score titles against chosen moods. Titles carrying the mood rank first; genre
 * affinity provides a tie-break so single-mood queries still return a full row.
 * @param {string[]} moodIds
 * @param {Title[]} pool
 * @param {{ limit?: number, excludeIds?: string[] }} [options]
 */
export function matchMoods(moodIds, pool = ALL_DEMO_TITLES, options = {}) {
  const { limit = 12, excludeIds = [] } = options;
  const excluded = new Set(excludeIds);
  const moods = new Set(moodIds);

  /** Genre weights per mood, so a title without an explicit tag can still match. */
  const GENRE_AFFINITY = {
    "slow-burn": ["Drama", "Mystery", "Slice of Life"],
    adrenaline: ["Thriller", "Action", "Crime", "Sport"],
    crying: ["Drama", "Romance", "Family"],
    laughing: ["Comedy"],
    "with-family": ["Family", "Animation", "Musical", "Comedy"],
    "late-night": ["Thriller", "Mystery", "Crime", "Music"],
    hopeful: ["Sport", "Coming of Age", "Family", "Musical"],
  };

  return pool
    .filter((title) => !excluded.has(title.id))
    .map((title) => {
      let score = 0;
      for (const mood of moods) {
        if (title.moods?.includes(mood)) score += 10;
        const affinity = GENRE_AFFINITY[mood] ?? [];
        score += title.genres.filter((genre) => affinity.includes(genre)).length * 2;
      }
      // Small quality nudge so the row does not start with a 6.9.
      score += title.rating / 4;
      return { title, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry, index, list) => ({
      ...entry.title,
      match: Math.round(60 + 38 * (entry.score / (list[0]?.score || entry.score))),
      matchReason:
        entry.title.moods?.find((mood) => moods.has(mood)) ?? [...moods][0] ?? "popular",
    }));
}
