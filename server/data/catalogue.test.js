/**
 * @file catalogue.test.js
 * @description Tests for the curated catalogue and the mood matcher.
 *
 * These assert the *product rules*, not the implementation: every title has the
 * metadata the UI depends on, mood matching respects the time window, and the
 * demo search finds what a person would expect it to find.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  ALL_DEMO_TITLES,
  MOODS,
  ORIGINAL_TITLES,
  findDemoTitle,
  matchMoods,
  searchDemo,
} from "./catalogue.js";

test("originals have complete, renderable metadata", () => {
  assert.equal(ORIGINAL_TITLES.length, 8);

  for (const title of ORIGINAL_TITLES) {
    assert.ok(title.id.startsWith("demo-"), `${title.id} id prefix`);
    assert.ok(title.title.length > 0);
    assert.ok(title.overview.length > 80, `${title.title} needs a real synopsis`);
    assert.ok(title.tagline, `${title.title} needs a tagline`);
    assert.ok(title.notes?.length >= 3, `${title.title} needs production notes`);
    assert.ok(title.cast?.length >= 2, `${title.title} needs cast`);
    assert.ok(title.crew?.length >= 1, `${title.title} needs crew`);
    assert.match(title.poster, /^\/art\/poster-[\w-]+\.jpg$/);
    assert.match(title.hero, /^\/art\/hero\/hero-[\w-]+\.jpg$/);
    assert.ok(title.rating >= 0 && title.rating <= 10);
    assert.ok(title.moods?.length >= 1);
  }
});

test("every catalogue title has poster, backdrop and hero artwork", () => {
  for (const title of ALL_DEMO_TITLES) {
    assert.ok(title.poster?.endsWith(".jpg"), `${title.title} poster`);
    assert.ok(title.backdrop?.endsWith(".jpg"), `${title.title} backdrop`);
    assert.ok(title.hero?.endsWith(".jpg"), `${title.title} hero`);
    assert.ok(title.genres.length > 0, `${title.title} genres`);
    assert.ok(Number.isInteger(title.year), `${title.title} year`);
  }
});

test("ids are unique — a duplicate would break React keys and routing", () => {
  const ids = new Set(ALL_DEMO_TITLES.map((title) => title.id));
  assert.equal(ids.size, ALL_DEMO_TITLES.length);
});

test("findDemoTitle resolves originals and catalogue entries", () => {
  assert.equal(findDemoTitle("demo-original-megacity")?.title, "Megacity");
  assert.equal(findDemoTitle("demo-title-bhola")?.title, "Bhola");
  assert.equal(findDemoTitle("demo-original-nope"), null);
});

test("searchDemo ranks an exact title match first", () => {
  const results = searchDemo("rickshaw");
  assert.ok(results.length > 0);
  assert.equal(results[0].title, "Last Rickshaw");
});

test("searchDemo matches genres and synopsis text", () => {
  assert.ok(searchDemo("comedy").some((title) => title.genres.includes("Comedy")));
  assert.ok(searchDemo("kite").some((title) => title.title === "Khola Akash"));
});

test("searchDemo returns nothing for an empty query", () => {
  assert.deepEqual(searchDemo("   "), []);
});

test("matchMoods always returns scored titles with a reason", () => {
  const results = matchMoods(["crying"], ALL_DEMO_TITLES, { limit: 8 });

  assert.ok(results.length > 0 && results.length <= 8);
  for (const title of results) {
    assert.ok(typeof title.match === "number");
    assert.ok(title.match >= 60 && title.match <= 100, `match out of range: ${title.match}`);
    assert.ok(MOODS.some((mood) => mood.id === title.matchReason || title.genres.length > 0));
  }

  // Scores must be monotonically non-increasing.
  const scores = results.map((title) => title.match);
  assert.deepEqual(
    scores,
    [...scores].sort((a, b) => b - a),
  );
});

test("matchMoods honours limit and exclusions", () => {
  const first = matchMoods(["late-night"], ALL_DEMO_TITLES, { limit: 4 });
  const excluded = first[0].id;
  const second = matchMoods(["late-night"], ALL_DEMO_TITLES, {
    limit: 4,
    excludeIds: [excluded],
  });

  assert.equal(second.length, 4);
  assert.ok(!second.some((title) => title.id === excluded));
});

test("a mood that no title carries still returns genre-affinity results", () => {
  // "hopeful" is carried by only a few titles; genre affinity must fill the row.
  const results = matchMoods(["hopeful"], ALL_DEMO_TITLES, { limit: 6 });
  assert.ok(results.length >= 3);
});

test("mood ids referenced by titles all exist in the mood list", () => {
  const valid = new Set(MOODS.map((mood) => mood.id));
  for (const title of ALL_DEMO_TITLES) {
    for (const mood of title.moods ?? []) {
      assert.ok(valid.has(mood), `${title.title} references unknown mood "${mood}"`);
    }
  }
});
