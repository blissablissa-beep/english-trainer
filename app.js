"use strict";

// ==================================================
// Constants
// ==================================================

const CARDS_VERSION = "2026-09-01-1";

const STORAGE = {
  language: "et_language",
  view: "et_view",
  bookmarks: "et_bookmarks",
  bookmarkOnly: "et_bookmark_only",
  theme: "et_theme",
  seed: "et_seed"
};

const UI = {
  ja: {
    title: "English Trainer",
    subtitle: "個人用 / PWA / JP⇄EN表示切替",

    todayTab: "Today",
    wordsTab: "Words",

    todayTitle: "今日の5語",
    wordsTitle: "単語一覧",
    searchTitle: "検索結果",

    allLevels: "全レベル",
    allPartsOfSpeech: "全品詞",
    commonTags: "主要タグ",
    moreWords: "さらに表示",
    backToWords: "← 単語一覧へ戻る",
    themeToggle: "白／黒モードを切り替える",

    shuffle: "シャッフル",

    searchPlaceholder:
      "検索（例: thrive / 繁栄 / gedeihen / prospérer）",

    meaning: "意味",
    nuance: "語感・ニュアンス",
    minimal: "最小対立（近い語との違い）",
    etymology: "語源",
    synonyms: "類義語",
    equivalents: "他言語の相当語",
    collocations: "コロケーション",
    examples: "例文",

    noCards: "該当するカードがありません。",

    install:
      "Tip: iPhone Safari → 共有 → ホーム画面に追加",

    us: "米",
    uk: "英",

    freq: {
      often: "頻出",
      sometimes: "時々",
      rare: "稀"
    },

    tags: {
      core: "基本",
      business: "ビジネス",
      academic: "学術",
      formal: "硬め",
      coll: "コロケ"
    }
  },

  en: {
    title: "English Trainer",
    subtitle: "Private / PWA / JP⇄EN display",

    todayTab: "Today",
    wordsTab: "Words",

    todayTitle: "Today's 5 words",
    wordsTitle: "Word index",
    searchTitle: "Search results",

    allLevels: "All levels",
    allPartsOfSpeech: "All parts of speech",
    commonTags: "Common tags",
    moreWords: "Show more",
    backToWords: "← Back to word index",
    themeToggle: "Toggle light/dark mode",

    shuffle: "Shuffle",

    searchPlaceholder:
      "Search (e.g. thrive / flourish / gedeihen / prosperar)",

    meaning: "Meaning",
    nuance: "Nuance and usage",
    minimal: "Minimal contrast",
    etymology: "Etymology",
    synonyms: "Synonyms",
    equivalents: "Equivalents",
    collocations: "Collocations",
    examples: "Examples",

    noCards: "No matching cards.",

    install:
      "Tip: iPhone Safari → Share → Add to Home Screen",

    us: "US",
    uk: "UK",

    freq: {
      often: "frequent",
      sometimes: "occasional",
      rare: "rare"
    },

    tags: {
      core: "core",
      business: "business",
      academic: "academic",
      formal: "formal",
      coll: "collocation"
    }
  }
};

const CARD_FILES = [
  "./cards.json",
  "./cards2.json",
  "./cards3.json",
  "./cards4.json",
  "./cards5.json",
  "./cards6.json",
  "./cards7.json",
  "./cards8.json",
  "./cards9.json",
  "./cards10.json",
  "./cards11.json",
  "./data/cards12.json",
  "./data/cards13.json"
];

const WORDS_PAGE_SIZE = 120;
const TODAY_CARD_COUNT = 5;
const SEARCH_CARD_LIMIT = 20;

let CARDS = [];
let QUERY = "";
let WORDS_LIMIT = WORDS_PAGE_SIZE;
let LEVEL_FILTER = "";
let POS_FILTER = "";
let TAG_FILTER = "";

// ==================================================
// Basic utilities
// ==================================================

function isString(value) {
  return typeof value === "string";
}

function isNonEmptyString(value) {
  return isString(value) && value.trim().length > 0;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeRegExp(value) {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function normalizeText(value) {
  if (Array.isArray(value)) {
    return value
      .filter(isString)
      .map(item => item.trim())
      .filter(Boolean);
  }

  if (isString(value) && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function getLanguage() {
  return localStorage.getItem(STORAGE.language) || "ja";
}

function setLanguage(language) {
  localStorage.setItem(STORAGE.language, language);
}

function getTheme() {
  const stored = localStorage.getItem(STORAGE.theme);

  if (stored === "light" || stored === "dark") {
    return stored;
  }

  const prefersDark =
    typeof window.matchMedia === "function" &&
    window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

  return prefersDark ? "dark" : "light";
}

function applyTheme(theme, persist = true) {
  const dark = theme === "dark";

  document.documentElement.classList.toggle(
    "dark",
    dark
  );

  if (persist) {
    localStorage.setItem(
      STORAGE.theme,
      dark ? "dark" : "light"
    );
  }

  const themeColor = document.querySelector(
    'meta[name="theme-color"]'
  );

  if (themeColor) {
    themeColor.content = dark
      ? "#111916"
      : "#176b5b";
  }

  const button = document.getElementById(
    "themeButton"
  );

  if (button) {
    button.setAttribute(
      "aria-pressed",
      dark ? "true" : "false"
    );
  }
}

function getView() {
  const stored =
    localStorage.getItem(STORAGE.view) || "today";

  /*
   * 旧版でReviewを開いたままだった場合は、
   * 新しいWords表示へ移行する。
   */
  return stored === "review" ? "words" : stored;
}

function setView(view) {
  localStorage.setItem(STORAGE.view, view);
}

function text(key) {
  return UI[getLanguage()][key] ?? key;
}

function highlight(value) {
  const source = String(value);
  const query = QUERY.trim();

  if (query.length < 2) {
    return escapeHtml(source);
  }

  const expression = new RegExp(
    escapeRegExp(query),
    "ig"
  );

  let marked = source.replace(
    expression,
    match =>
      `__MARK_OPEN__${match}__MARK_CLOSE__`
  );

  marked = escapeHtml(marked);

  return marked
    .replaceAll("__MARK_OPEN__", "<mark>")
    .replaceAll("__MARK_CLOSE__", "</mark>");
}

// ==================================================
// Validation
// ==================================================

function isLocalizedBlock(value) {
  if (value === undefined || value === null) {
    return true;
  }

  if (
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  for (const language of ["ja", "en"]) {
    const item = value[language];

    if (
      item !== undefined &&
      !isString(item) &&
      !(
        Array.isArray(item) &&
        item.every(isString)
      )
    ) {
      return false;
    }
  }

  return true;
}

function validateCards(cards) {
  const errors = [];
  const ids = new Set();
  const sids = new Set();

  if (!Array.isArray(cards)) {
    return {
      ok: false,
      errors: [
        "cards.json must contain an array."
      ]
    };
  }

  cards.forEach((card, index) => {
    const number = index + 1;
    const prefix = `Card #${number}`;

    if (
      !card ||
      typeof card !== "object" ||
      Array.isArray(card)
    ) {
      errors.push(`${prefix}: invalid object`);
      return;
    }

    if (!isNonEmptyString(card.id)) {
      errors.push(`${prefix}: id is required`);
    }

    if (!isNonEmptyString(card.sid)) {
      errors.push(`${prefix}: sid is required`);
    }

    if (!isNonEmptyString(card.word)) {
      errors.push(`${prefix}: word is required`);
    }

    if (
      isNonEmptyString(card.sid) &&
      !/^\d{4}-\d{5}$/.test(card.sid)
    ) {
      errors.push(
        `${prefix}: sid must use YYYY-00000 format`
      );
    }

    if (ids.has(card.id)) {
      errors.push(
        `${prefix}: duplicate id "${card.id}"`
      );
    }

    if (sids.has(card.sid)) {
      errors.push(
        `${prefix}: duplicate sid "${card.sid}"`
      );
    }

    ids.add(card.id);
    sids.add(card.sid);

    for (
      const field of [
        "meaning",
        "nuance",
        "minimal",
        "etymology",
        "collocations",
        "example"
      ]
    ) {
      if (!isLocalizedBlock(card[field])) {
        errors.push(
          `${prefix}: ${field} must contain ja/en`
        );
      }
    }

    if (
      card.synonyms !== undefined &&
      !Array.isArray(card.synonyms)
    ) {
      errors.push(
        `${prefix}: synonyms must be an array`
      );
    }

    if (
      card.equivalents !== undefined &&
      (
        typeof card.equivalents !== "object" ||
        Array.isArray(card.equivalents)
      )
    ) {
      errors.push(
        `${prefix}: equivalents must be an object`
      );
    }
  });

  return {
    ok: errors.length === 0,
    errors
  };
}

// ==================================================
// Loading
// ==================================================

async function loadCards() {
  try {
    const allCards = [];

    for (const file of CARD_FILES) {
      const response = await fetch(
        `${file}?v=${encodeURIComponent(
          CARDS_VERSION
        )}`,
        {
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(
          `${file}: HTTP ${response.status}`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error(
          `${file} is not a JSON array`
        );
      }

      allCards.push(...data);
    }

    const result = validateCards(allCards);

    if (!result.ok) {
      CARDS = [];

      showError(
        "カードデータに問題があります。\n\n" +
        result.errors
          .map(error => `・${error}`)
          .join("\n")
      );

      return;
    }

    CARDS = allCards;
    hideError();
 } catch (error) {
  console.error(error);

  CARDS = [];

  showError(
    "カードデータを読み込めませんでした。\n\n" +
    "実際のエラー：\n" +
    (error?.message || String(error)) +
    "\n\n次を確認してください。\n" +
    "・ファイル名が app.js の指定と完全に一致している\n" +
    "・JSONの末尾カンマや引用符に誤りがない\n" +
    "・GitHub Pagesの反映が完了している"
  );
}
}

function showError(message) {
  const element =
    document.getElementById("errorBox");

  element.innerHTML = escapeHtml(message)
    .replaceAll("\n", "<br>");

  element.classList.remove("hidden");
}

function hideError() {
  const element =
    document.getElementById("errorBox");

  element.classList.add("hidden");
  element.innerHTML = "";
}

// ==================================================
// Bookmarks
// ==================================================

function loadBookmarks() {
  try {
    const value = JSON.parse(
      localStorage.getItem(STORAGE.bookmarks) ||
      "[]"
    );

    return Array.isArray(value)
      ? value.filter(isNonEmptyString)
      : [];
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks) {
  localStorage.setItem(
    STORAGE.bookmarks,
    JSON.stringify(bookmarks)
  );
}

function hasBookmark(id) {
  return loadBookmarks().includes(id);
}

function toggleBookmark(id) {
  const bookmarks = loadBookmarks();
  const index = bookmarks.indexOf(id);

  if (index >= 0) {
    bookmarks.splice(index, 1);
  } else {
    bookmarks.push(id);
  }

  saveBookmarks(bookmarks);

  return bookmarks.includes(id);
}

function getBookmarkOnly() {
  return (
    localStorage.getItem(
      STORAGE.bookmarkOnly
    ) === "1"
  );
}

function setBookmarkOnly(value) {
  localStorage.setItem(
    STORAGE.bookmarkOnly,
    value ? "1" : "0"
  );
}

function updateBookmarkButton(visibleCount) {
  const button = document.getElementById(
    "bookmarkFilterButton"
  );

  const total = loadBookmarks().length;

  button.textContent = getBookmarkOnly()
    ? `★ ${visibleCount ?? total}/${total}`
    : `☆ ${total}`;
}

// ==================================================
// Search
// ==================================================

function flattenLocalized(value) {
  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.values(value)
    .flatMap(normalizeText);
}

function cardSearchText(card) {
  const synonyms =
    Array.isArray(card.synonyms)
      ? card.synonyms.flatMap(item => [
          item.word,
          ...flattenLocalized(item.note)
        ])
      : [];

  return [
    card.word,
    card.level,
    card.freq,

    ...(card.tags || []),

    card.pronunciation?.ipa?.us,
    card.pronunciation?.ipa?.uk,

    ...flattenLocalized(card.meaning),
    ...flattenLocalized(card.nuance),
    ...flattenLocalized(card.minimal),
    ...flattenLocalized(card.etymology),
    ...flattenLocalized(card.collocations),
    ...flattenLocalized(card.example),

    ...synonyms,

    card.equivalents?.de,
    card.equivalents?.it,
    card.equivalents?.fr,
    card.equivalents?.es
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function filterCards(cards) {
  const query =
    QUERY.trim().toLowerCase();

  if (!query) {
    return cards;
  }

  return cards.filter(card =>
    cardSearchText(card).includes(query)
  );
}

// ==================================================
// Lightweight dictionary index
// ==================================================

function getOpenCardId() {
  const value =
    (location.hash || "").replace(/^#/, "");

  return value
    ? new URLSearchParams(value).get("id") || ""
    : "";
}

function setOpenCardId(id) {
  if (!isNonEmptyString(id)) {
    history.replaceState(
      null,
      "",
      location.pathname + location.search
    );

    return;
  }

  const parameters =
    new URLSearchParams();

  parameters.set("id", id);
  location.hash = parameters.toString();
}

function cardPartOfSpeechKeys(card) {
  const source = String(
    card.grammar?.pos || ""
  ).toLowerCase();

  const keys = [];

  if (/\bnoun\b/.test(source)) {
    keys.push("noun");
  }

  if (/\bverb\b/.test(source)) {
    keys.push("verb");
  }

  if (/\b(adjective|adj)\b/.test(source)) {
    keys.push("adjective");
  }

  if (/\b(adverb|adv)\b/.test(source)) {
    keys.push("adverb");
  }

  if (/\bpreposition\b/.test(source)) {
    keys.push("preposition");
  }

  if (/\bconjunction\b/.test(source)) {
    keys.push("conjunction");
  }

  if (/\bpron(oun)?\b/.test(source)) {
    keys.push("pronoun");
  }

  if (
    /phrase|idiom|proverb|sentence|expression|construction/
      .test(source)
  ) {
    keys.push("phrase");
  }

  return [
    ...new Set(
      keys.length ? keys : ["other"]
    )
  ];
}

function dictionaryMatches(card) {
  if (
    LEVEL_FILTER &&
    card.level !== LEVEL_FILTER
  ) {
    return false;
  }

  if (
    POS_FILTER &&
    !cardPartOfSpeechKeys(card)
      .includes(POS_FILTER)
  ) {
    return false;
  }

  if (
    TAG_FILTER &&
    !(card.tags || []).includes(TAG_FILTER)
  ) {
    return false;
  }

  const query =
    QUERY.trim().toLowerCase();

  if (!query) {
    return true;
  }

  return [
    card.word,
    card.id,
    card.sid,
    card.level,
    card.grammar?.pos,
    ...(card.tags || [])
  ]
    .filter(Boolean)
    .some(value =>
      String(value)
        .toLowerCase()
        .includes(query)
    );
}

function dictionaryCards() {
  return CARDS
    .filter(dictionaryMatches)
    .sort((left, right) =>
      String(left.word || "").localeCompare(
        String(right.word || ""),
        "en",
        {
          sensitivity: "base"
        }
      )
    );
}

function filterOption(
  value,
  label,
  selected
) {
  return `
    <option
      value="${escapeHtml(value)}"
      ${value === selected ? "selected" : ""}
    >${escapeHtml(label)}</option>
  `;
}

function renderDictionaryFilters(container) {
  const levels = [
    "A1",
    "A2",
    "B1",
    "B2",
    "C1",
    "C2"
  ];

  const partsOfSpeech = [
    "noun",
    "verb",
    "adjective",
    "adverb",
    "phrase",
    "preposition",
    "conjunction",
    "pronoun",
    "other"
  ].filter(key =>
    CARDS.some(card =>
      cardPartOfSpeechKeys(card)
        .includes(key)
    )
  );

  const tagCounts = new Map();

  for (const card of CARDS) {
    for (const tag of card.tags || []) {
      tagCounts.set(
        tag,
        (tagCounts.get(tag) || 0) + 1
      );
    }
  }

  /*
   * 1回しか使われていないタグまで候補に並べると
   * 選択欄が巨大になるため、5件以上のタグを表示。
   * 検索欄からは、それ以外のタグも検索できる。
   */
  const tags = [...tagCounts.entries()]
    .filter(([, count]) => count >= 5)
    .sort((a, b) =>
      a[0].localeCompare(
        b[0],
        "en",
        {
          sensitivity: "base"
        }
      )
    );

  container.innerHTML = `
    <div class="dictionary-tools">
      <select
        id="levelFilter"
        aria-label="Level"
      >
        ${filterOption(
          "",
          text("allLevels"),
          LEVEL_FILTER
        )}

        ${levels
          .map(level =>
            filterOption(
              level,
              level,
              LEVEL_FILTER
            )
          )
          .join("")}
      </select>

      <select
        id="partOfSpeechFilter"
        aria-label="Part of speech"
      >
        ${filterOption(
          "",
          text("allPartsOfSpeech"),
          POS_FILTER
        )}

        ${partsOfSpeech
          .map(part =>
            filterOption(
              part,
              partOfSpeechLabel(part),
              POS_FILTER
            )
          )
          .join("")}
      </select>

      <select
        id="tagFilter"
        aria-label="Tag"
      >
        ${filterOption(
          "",
          text("commonTags"),
          TAG_FILTER
        )}

        ${tags
          .map(([tag, count]) =>
            filterOption(
              tag,
              `${tagLabel(tag)} (${count})`,
              TAG_FILTER
            )
          )
          .join("")}
      </select>
    </div>
  `;

  const resetPage = () => {
    WORDS_LIMIT = WORDS_PAGE_SIZE;
    render();
  };

  container
    .querySelector("#levelFilter")
    .addEventListener(
      "change",
      event => {
        LEVEL_FILTER =
          event.target.value;

        resetPage();
      }
    );

  container
    .querySelector(
      "#partOfSpeechFilter"
    )
    .addEventListener(
      "change",
      event => {
        POS_FILTER =
          event.target.value;

        resetPage();
      }
    );

  container
    .querySelector("#tagFilter")
    .addEventListener(
      "change",
      event => {
        TAG_FILTER =
          event.target.value;

        resetPage();
      }
    );
}

// ==================================================
// Seeded shuffle
// ==================================================

function todaySeed() {
  const date = new Date();

  return Number(
    [
      date.getFullYear(),
      String(date.getMonth() + 1)
        .padStart(2, "0"),
      String(date.getDate())
        .padStart(2, "0")
    ].join("")
  );
}

function getSeed() {
  let seed =
    localStorage.getItem(STORAGE.seed);

  if (!seed) {
    seed = String(todaySeed());

    localStorage.setItem(
      STORAGE.seed,
      seed
    );
  }

  return Number(seed);
}

function rotateSeed() {
  localStorage.setItem(
    STORAGE.seed,
    String(
      Math.floor(
        Math.random() * 1_000_000_000
      )
    )
  );
}

function seededShuffle(items, seed) {
  const result = items.slice();
  let value = seed;

  for (
    let index = result.length - 1;
    index > 0;
    index -= 1
  ) {
    value =
      (
        value * 1664525 +
        1013904223
      ) %
      4294967296;

    const randomIndex =
      value % (index + 1);

    [
      result[index],
      result[randomIndex]
    ] = [
      result[randomIndex],
      result[index]
    ];
  }

  return result;
}

// ==================================================
// Formatting
// ==================================================

function partOfSpeechLabel(
  partOfSpeech
) {
  const labels = {
    noun: "N",
    verb: "V",
    adj: "Adj",
    adjective: "Adj",
    adv: "Adv",
    adverb: "Adv",
    prep: "Prep",
    preposition: "Prep",
    conj: "Conj",
    conjunction: "Conj",
    pron: "Pron",
    pronoun: "Pron",
    phrase: "Phrase",
    other: "Other",

    "phrasal verb": "Phr.V",
    "verb phrase": "V Phrase",
    "verb / noun": "V / N",
    "modal construction": "Modal"
  };

  return (
    labels[partOfSpeech] ||
    partOfSpeech ||
    ""
  );
}

function frequencyLabel(frequency) {
  return (
    UI[getLanguage()].freq[frequency] ||
    frequency ||
    ""
  );
}

function tagLabel(tag) {
  return (
    UI[getLanguage()].tags[tag] ||
    tag
  );
}

function formatVerbForms(forms) {
  if (!forms) {
    return "";
  }

  if (typeof forms === "string") {
    return forms;
  }

  if (
    typeof forms !== "object" ||
    Array.isArray(forms)
  ) {
    return "";
  }

  return [
    forms.base,
    forms.past,
    forms.past_participle
  ]
    .filter(Boolean)
    .join(" – ");
}

function grammarLine(grammar) {
  if (!grammar) {
    return "";
  }

  const position = String(
    grammar.pos || ""
  ).toLowerCase();

  if (position.includes("verb")) {
    return [
      formatVerbForms(grammar.forms),
      grammar.transitivity,
      grammar.separability
    ]
      .filter(Boolean)
      .join(" / ");
  }

  if (position.includes("noun")) {
    return [
      grammar.countability,
      grammar.plural
        ? `pl. ${grammar.plural}`
        : ""
    ]
      .filter(Boolean)
      .join(" / ");
  }

  if (
    position === "modal construction"
  ) {
    return [
      grammar.structure,
      grammar.forms?.negative,
      grammar.forms?.passive
    ]
      .filter(Boolean)
      .join(" / ");
  }

  return grammar.structure || "";
}

function renderPills(card) {
  const values = [];

  const partOfSpeech =
    partOfSpeechLabel(
      card.grammar?.pos
    );

  if (partOfSpeech) {
    values.push({
      value: partOfSpeech,
      className: "pos"
    });
  }

  if (card.level) {
    values.push({
      value: card.level,
      className: "level"
    });
  }

  if (card.freq) {
    values.push({
      value:
        frequencyLabel(card.freq),
      className: "usage"
    });
  }

  for (const tag of card.tags || []) {
    values.push({
      value: tagLabel(tag),
      className: "tag"
    });
  }

  return values
    .map(item => `
      <span class="pill ${item.className}">
        ${escapeHtml(item.value)}
      </span>
    `)
    .join("");
}

function renderTextBlock(
  label,
  values,
  className = ""
) {
  const lines = normalizeText(values);

  if (!lines.length) {
    return "";
  }

  if (lines.length === 1) {
    return `
      <div class="label">
        ${escapeHtml(label)}
      </div>

      <p class="text ${className}">
        ${highlight(lines[0])}
      </p>
    `;
  }

  return `
    <div class="label">
      ${escapeHtml(label)}
    </div>

    <ul class="text ${className}">
      ${lines
        .map(
          line =>
            `<li>${highlight(line)}</li>`
        )
        .join("")}
    </ul>
  `;
}

function renderPronunciation(card) {
  const ipa =
    card.pronunciation?.ipa || {};

  const parts = [];

  if (isNonEmptyString(ipa.us)) {
    parts.push(`
      <span>
        <span class="ipa-label">
          ${escapeHtml(text("us"))}
        </span>

        ${escapeHtml(ipa.us)}
      </span>
    `);
  }

  if (
    isNonEmptyString(ipa.uk) &&
    ipa.uk !== ipa.us
  ) {
    parts.push(`
      <span>
        <span class="ipa-label">
          ${escapeHtml(text("uk"))}
        </span>

        ${escapeHtml(ipa.uk)}
      </span>
    `);
  }

  if (!parts.length) {
    return "";
  }

  return `
    <div class="ipa mono">
      ${parts.join(" &nbsp; ")}

      <button
        class="speak-btn"
        type="button"
        data-speak="${escapeHtml(
          card.word
        )}"
        aria-label="Pronounce"
      >
        🔊
      </button>
    </div>
  `;
}

function renderSynonyms(card) {
  if (
    !Array.isArray(card.synonyms) ||
    !card.synonyms.length
  ) {
    return "";
  }

  const language = getLanguage();

  const rows = card.synonyms
    .map(item => {
      const note = normalizeText(
        item.note?.[language]
      ).join(" ");

      return `
        <div class="synonym-item">
          <span class="synonym-word">
            ${highlight(item.word)}
          </span>

          ${
            note
              ? `
                <span class="synonym-note">
                  — ${highlight(note)}
                </span>
              `
              : ""
          }
        </div>
      `;
    })
    .join("");

  return `
    <div class="label">
      ${escapeHtml(text("synonyms"))}
    </div>

    <div>${rows}</div>
  `;
}

function renderEquivalents(card) {
  const equivalents =
    card.equivalents || {};

  const rows = [];

  const languages = [
    ["de", "Deutsch"],
    ["it", "Italiano"],
    ["fr", "Français"],
    ["es", "Español"]
  ];

  for (const [key, label] of languages) {
    if (
      isNonEmptyString(
        equivalents[key]
      )
    ) {
      rows.push(`
        <div class="equivalent-lang">
          ${escapeHtml(label)}
        </div>

        <div class="equivalent-word">
          ${highlight(equivalents[key])}
        </div>
      `);
    }
  }

  if (!rows.length) {
    return "";
  }

  return `
    <div class="label">
      ${escapeHtml(text("equivalents"))}
    </div>

    <div class="equivalent-grid">
      ${rows.join("")}
    </div>
  `;
}

// ==================================================
// Speech
// ==================================================

function speak(word) {
  if (
    !("speechSynthesis" in window) ||
    !isNonEmptyString(word)
  ) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(word);

  utterance.lang = "en-US";
  utterance.rate = 0.85;

  window.speechSynthesis.speak(
    utterance
  );
}

// ==================================================
// Rendering
// ==================================================

function renderCard(card) {
  const language = getLanguage();

  const element =
    document.createElement("section");

  element.className = "card";

  element.innerHTML = `
    <div class="card-top">

      <div class="card-main">

        <h2 class="word">
          ${highlight(card.word)}
        </h2>

        ${renderPronunciation(card)}

        <div>
          ${renderPills(card)}
        </div>

        ${
          grammarLine(card.grammar)
            ? `
              <div class="grammar-line">
                ${escapeHtml(
                  grammarLine(card.grammar)
                )}
              </div>
            `
            : ""
        }

      </div>

      <div class="meta-right">
        <button
          class="bookmark-btn"
          type="button"
          data-bookmark="${escapeHtml(
            card.id
          )}"
          aria-label="Bookmark"
        >
          ${
            hasBookmark(card.id)
              ? "★"
              : "☆"
          }
        </button>

        <div class="mono">
          ${escapeHtml(card.sid)}
        </div>
      </div>

    </div>

    ${renderTextBlock(
      text("meaning"),
      card.meaning?.[language]
    )}

    ${renderTextBlock(
      text("nuance"),
      card.nuance?.[language]
    )}

    ${renderTextBlock(
      text("minimal"),
      card.minimal?.[language]
    )}

    ${renderTextBlock(
      text("etymology"),
      card.etymology?.[language]
    )}

    ${renderSynonyms(card)}

    ${renderEquivalents(card)}

    ${renderTextBlock(
      text("collocations"),
      card.collocations?.[language],
      "mono"
    )}

    ${renderTextBlock(
      text("examples"),
      card.example?.[language],
      "mono"
    )}
  `;

  element
    .querySelectorAll("[data-speak]")
    .forEach(button => {
      button.addEventListener(
        "click",
        () =>
          speak(
            button.getAttribute(
              "data-speak"
            )
          )
      );
    });

  const bookmarkButton =
    element.querySelector(
      "[data-bookmark]"
    );

  bookmarkButton.addEventListener(
    "click",
    () => {
      const bookmarked =
        toggleBookmark(card.id);

      bookmarkButton.textContent =
        bookmarked ? "★" : "☆";

      updateBookmarkButton();

      if (getBookmarkOnly()) {
        render();
      }
    }
  );

  return element;
}

function updateScreenCount(visible) {
  const total = CARDS.length;
  const bookmarks =
    loadBookmarks().length;

  document.getElementById(
    "screenCount"
  ).textContent = total
    ? `${visible} / ${total}` +
      (
        bookmarks
          ? `（★${bookmarks}）`
          : ""
      )
    : "";
}

function renderWordDetail(
  list,
  card
) {
  document.getElementById(
    "screenTitle"
  ).textContent = card.word;

  const backButton =
    document.createElement("button");

  backButton.className = "btn";
  backButton.type = "button";
  backButton.textContent =
    text("backToWords");

  backButton.addEventListener(
    "click",
    () => {
      setOpenCardId("");
      render();
    }
  );

  list.appendChild(backButton);
  list.appendChild(renderCard(card));

  updateScreenCount(1);
  updateBookmarkButton(1);
}

function renderWordIndex(list) {
  const filters =
    document.createElement("div");

  renderDictionaryFilters(filters);
  list.appendChild(filters);

  let cards = dictionaryCards();

  if (getBookmarkOnly()) {
    const bookmarks =
      new Set(loadBookmarks());

    cards = cards.filter(card =>
      bookmarks.has(card.id)
    );
  }

  const visibleCards =
    cards.slice(0, WORDS_LIMIT);

  if (!visibleCards.length) {
    const empty =
      document.createElement("div");

    empty.className = "empty";
    empty.textContent =
      text("noCards");

    list.appendChild(empty);
  } else {
    const index =
      document.createElement("div");

    index.className = "word-index";

    const fragment =
      document.createDocumentFragment();

    for (const card of visibleCards) {
      const button =
        document.createElement("button");

      button.className = "word-link";
      button.type = "button";
      button.textContent = card.word;

      button.addEventListener(
        "click",
        () => {
          setOpenCardId(card.id);
        }
      );

      fragment.appendChild(button);
    }

    index.appendChild(fragment);
    list.appendChild(index);

    if (
      visibleCards.length <
      cards.length
    ) {
      const row =
        document.createElement("div");

      row.className = "more-row";

      const moreButton =
        document.createElement("button");

      moreButton.className = "btn";
      moreButton.type = "button";

      moreButton.textContent =
        `${text("moreWords")} ` +
        `(${visibleCards.length} / ` +
        `${cards.length})`;

      moreButton.addEventListener(
        "click",
        () => {
          WORDS_LIMIT +=
            WORDS_PAGE_SIZE;

          render();
        }
      );

      row.appendChild(moreButton);
      list.appendChild(row);
    }
  }

  updateScreenCount(cards.length);

  updateBookmarkButton(
    visibleCards.length
  );
}

function renderToday(list) {
  let cards = filterCards(CARDS);

  if (getBookmarkOnly()) {
    const bookmarks =
      new Set(loadBookmarks());

    cards = cards.filter(card =>
      bookmarks.has(card.id)
    );
  }

  if (QUERY) {
    const needle =
      QUERY.trim().toLowerCase();

    /*
     * 検索結果で完全一致を先頭へ置く。
     * 詳細カードは最大20枚に制限する。
     */
    cards = [...cards]
      .sort((a, b) => {
        const aWord = String(
          a.word || ""
        )
          .trim()
          .toLowerCase();

        const bWord = String(
          b.word || ""
        )
          .trim()
          .toLowerCase();

        const aExact =
          aWord === needle;

        const bExact =
          bWord === needle;

        if (aExact && !bExact) {
          return -1;
        }

        if (!aExact && bExact) {
          return 1;
        }

        return aWord.localeCompare(
          bWord
        );
      })
      .slice(0, SEARCH_CARD_LIMIT);
  } else {
    cards = seededShuffle(
      cards,
      getSeed()
    ).slice(0, TODAY_CARD_COUNT);
  }

  if (!cards.length) {
    list.innerHTML = `
      <div class="empty">
        ${escapeHtml(text("noCards"))}
      </div>
    `;

    updateScreenCount(0);
    updateBookmarkButton(0);

    return;
  }

  for (const card of cards) {
    list.appendChild(
      renderCard(card)
    );
  }

  updateScreenCount(cards.length);
  updateBookmarkButton(cards.length);
}

function render() {
  const language = getLanguage();
  const view = getView();

  document.documentElement.lang =
    language === "ja"
      ? "ja"
      : "en";

  document.getElementById(
    "appTitle"
  ).textContent = text("title");

  document.getElementById(
    "appSubtitle"
  ).textContent = text("subtitle");

  document.getElementById(
    "languageButton"
  ).textContent =
    language === "ja"
      ? "JP"
      : "EN";

  const themeButton =
    document.getElementById(
      "themeButton"
    );

  themeButton.setAttribute(
    "aria-label",
    text("themeToggle")
  );

  themeButton.title =
    text("themeToggle");

  document.getElementById(
    "todayButton"
  ).textContent =
    text("todayTab");

  document.getElementById(
    "wordsButton"
  ).textContent =
    text("wordsTab");

  document.getElementById(
    "shuffleButton"
  ).textContent =
    `↻ ${text("shuffle")}`;

  document.getElementById(
    "searchInput"
  ).placeholder =
    text("searchPlaceholder");

  document.getElementById(
    "installTip"
  ).textContent =
    text("install");

  document.getElementById(
    "todayButton"
  ).classList.toggle(
    "primary",
    view === "today"
  );

  document.getElementById(
    "wordsButton"
  ).classList.toggle(
    "primary",
    view === "words"
  );

  const list =
    document.getElementById(
      "cardList"
    );

  list.innerHTML = "";

  document.getElementById(
    "screenTitle"
  ).textContent = QUERY
    ? text("searchTitle")
    : view === "words"
      ? text("wordsTitle")
      : text("todayTitle");

  if (view === "words") {
    const openCard = CARDS.find(
      card =>
        card.id === getOpenCardId()
    );

    if (openCard) {
      renderWordDetail(
        list,
        openCard
      );
    } else {
      renderWordIndex(list);
    }

    return;
  }

  renderToday(list);
}

// ==================================================
// Events
// ==================================================

document.getElementById(
  "languageButton"
).addEventListener(
  "click",
  () => {
    setLanguage(
      getLanguage() === "ja"
        ? "en"
        : "ja"
    );

    render();
  }
);

document.getElementById(
  "themeButton"
).addEventListener(
  "click",
  () => {
    applyTheme(
      document.documentElement
        .classList
        .contains("dark")
        ? "light"
        : "dark"
    );
  }
);

document.getElementById(
  "todayButton"
).addEventListener(
  "click",
  () => {
    setView("today");
    setOpenCardId("");
    render();
  }
);

document.getElementById(
  "wordsButton"
).addEventListener(
  "click",
  () => {
    setView("words");
    setOpenCardId("");

    WORDS_LIMIT =
      WORDS_PAGE_SIZE;

    render();
  }
);

document.getElementById(
  "shuffleButton"
).addEventListener(
  "click",
  () => {
    rotateSeed();
    render();
  }
);

document.getElementById(
  "bookmarkFilterButton"
).addEventListener(
  "click",
  () => {
    setBookmarkOnly(
      !getBookmarkOnly()
    );

    render();
  }
);

const searchInput =
  document.getElementById(
    "searchInput"
  );

searchInput.addEventListener(
  "input",
  () => {
    QUERY =
      searchInput.value.trim();

    WORDS_LIMIT =
      WORDS_PAGE_SIZE;

    render();
  }
);

document.getElementById(
  "clearButton"
).addEventListener(
  "click",
  () => {
    searchInput.value = "";
    QUERY = "";

    WORDS_LIMIT =
      WORDS_PAGE_SIZE;

    render();
    searchInput.focus();
  }
);

window.addEventListener(
  "hashchange",
  render
);

// ==================================================
// Service worker
// ==================================================

if ("serviceWorker" in navigator) {
  window.addEventListener(
    "load",
    async () => {
      try {
        await navigator
          .serviceWorker
          .register("./sw.js");
      } catch (error) {
        console.warn(
          "Service worker registration failed.",
          error
        );
      }
    }
  );
}

// ==================================================
// Boot
// ==================================================

applyTheme(getTheme(), false);

(async () => {
  await loadCards();
  render();
})();
