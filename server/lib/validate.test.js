/**
 * @file validate.test.js
 * @description Unit tests for the input sanitizers.
 *
 * Run with: npm test   (Node's built-in test runner, no extra dependency)
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  clampNumber,
  generatePartyCode,
  sanitizeDisplayName,
  sanitizePartyCode,
  sanitizeSearch,
  sanitizeTitleId,
} from "./validate.js";

test("sanitizeSearch keeps normal text and trims it", () => {
  assert.equal(sanitizeSearch("  monsoon express  "), "monsoon express");
  assert.equal(sanitizeSearch("1971: a war story"), "1971: a war story");
});

test("sanitizeSearch strips control characters and angle brackets", () => {
  assert.equal(sanitizeSearch("a\u0000b<script>"), "abscript");
});

test("sanitizeSearch rejects empty and over-long input", () => {
  assert.throws(() => sanitizeSearch("   "), /Type something/);
  assert.throws(() => sanitizeSearch("x".repeat(81)), /80 characters/);
  assert.throws(() => sanitizeSearch("<>"), /not valid/);
});

test("sanitizeDisplayName enforces the two character minimum", () => {
  assert.equal(sanitizeDisplayName("  Nur  "), "Nur");
  assert.throws(() => sanitizeDisplayName("N"), /at least 2/);
  assert.throws(() => sanitizeDisplayName("a".repeat(25)), /24 characters/);
});

test("sanitizeDisplayName allows unicode letters but not markup", () => {
  assert.equal(sanitizeDisplayName("Nur Islam"), "Nur Islam");
  assert.equal(sanitizeDisplayName("রুমা"), "রুমা");
  assert.throws(() => sanitizeDisplayName("<b>Nur</b>"), /letters, numbers/);
  assert.throws(() => sanitizeDisplayName("Nur<script>"), /letters, numbers/);
});

test("generatePartyCode is six unambiguous characters", () => {
  for (let index = 0; index < 200; index += 1) {
    const code = generatePartyCode();
    assert.match(code, /^[A-Z2-9]{6}$/);
    // 0/O and 1/I are excluded so codes can be read over the phone.
    assert.ok(!/[01OI]/.test(code));
  }
});

test("generatePartyCode produces distinct values", () => {
  const codes = new Set(Array.from({ length: 500 }, () => generatePartyCode()));
  assert.ok(codes.size > 495, `expected mostly unique codes, got ${codes.size}/500`);
});

test("sanitizePartyCode upper-cases and validates", () => {
  assert.equal(sanitizePartyCode("a7duyw"), "A7DUYW");
  assert.throws(() => sanitizePartyCode("A7DUY"), /looks wrong/);
  assert.throws(() => sanitizePartyCode("A7DUY0"), /looks wrong/); // zero is not in the alphabet
});

test("sanitizeTitleId accepts TMDB and demo ids, rejects the rest", () => {
  assert.equal(sanitizeTitleId("tmdb-movie-693134"), "tmdb-movie-693134");
  assert.equal(sanitizeTitleId("tmdb-series-1234"), "tmdb-series-1234");
  assert.equal(
    sanitizeTitleId("demo-original-monsoon-express"),
    "demo-original-monsoon-express",
  );
  assert.equal(sanitizeTitleId("demo-title-the-605-local"), "demo-title-the-605-local");
  assert.throws(() => sanitizeTitleId("tmdb-person-1"), /Unknown title/);
  assert.throws(() => sanitizeTitleId("../../etc/passwd"), /Unknown title/);
  assert.throws(() => sanitizeTitleId(""), /Unknown title/);
});

test("clampNumber rounds and clamps", () => {
  assert.equal(clampNumber("12.6", 1, 20, 1), 13);
  assert.equal(clampNumber(-5, 1, 20, 1), 1);
  assert.equal(clampNumber(999, 1, 20, 1), 20);
  assert.equal(clampNumber("abc", 1, 20, 7), 7);
  assert.equal(clampNumber(undefined, 0, 10, 4), 4);
});
