/**
 * @file preferences.test.js
 * @description Preferences come from localStorage, which a user can edit and an
 * older build may have written in a different shape. `normalisePreferences` is
 * the boundary where that untrusted blob becomes app state, so it gets the same
 * treatment as any other input: unknown keys dropped, types checked, ranges
 * clamped.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_PREFERENCES, normalisePreferences } from "./preferences-model.js";

describe("normalisePreferences", () => {
  it("returns the defaults for an empty or missing blob", () => {
    assert.deepEqual(normalisePreferences(null), DEFAULT_PREFERENCES);
    assert.deepEqual(normalisePreferences(undefined), DEFAULT_PREFERENCES);
    assert.deepEqual(normalisePreferences({}), DEFAULT_PREFERENCES);
  });

  it("does not fall over on a non-object", () => {
    assert.deepEqual(normalisePreferences("loud"), DEFAULT_PREFERENCES);
    assert.deepEqual(normalisePreferences(42), DEFAULT_PREFERENCES);
    assert.deepEqual(normalisePreferences([]), DEFAULT_PREFERENCES);
  });

  it("keeps values the user actually chose", () => {
    const result = normalisePreferences({
      autoplayNext: false,
      highContrast: true,
      posterQuality: "cosy",
      spoilerTitles: true,
    });

    assert.equal(result.autoplayNext, false);
    assert.equal(result.highContrast, true);
    assert.equal(result.posterQuality, "cosy");
    assert.equal(result.spoilerTitles, true);
  });

  it("clamps volume instead of trusting the stored number", () => {
    assert.equal(normalisePreferences({ defaultVolume: 4 }).defaultVolume, 1);
    assert.equal(normalisePreferences({ defaultVolume: -2 }).defaultVolume, 0);
    // NaN must not reach the player, which would render "NaN%".
    assert.equal(normalisePreferences({ defaultVolume: "loud" }).defaultVolume, 0.8);
  });

  it("accepts only the three motion states", () => {
    assert.equal(normalisePreferences({ reduceMotion: true }).reduceMotion, true);
    assert.equal(normalisePreferences({ reduceMotion: false }).reduceMotion, false);
    // null is meaningful: "follow the system", not "unset".
    assert.equal(normalisePreferences({ reduceMotion: null }).reduceMotion, null);
    assert.equal(normalisePreferences({ reduceMotion: "yes" }).reduceMotion, null);
  });

  it("drops unknown keys so stored junk cannot reach the app", () => {
    const result = normalisePreferences({ theme: "pink", __proto__: { polluted: true } });
    assert.equal(Object.hasOwn(result, "theme"), false);
    assert.equal(Object.hasOwn(Object.getPrototypeOf(result) ?? {}, "polluted"), false);
    assert.deepEqual(result, DEFAULT_PREFERENCES);
  });

  it("falls back to a known poster density", () => {
    assert.equal(normalisePreferences({ posterQuality: "enormous" }).posterQuality, "standard");
  });
});
