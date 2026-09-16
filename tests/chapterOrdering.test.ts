import { describe, expect, it } from "vitest";
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

/**
 * Guards the properties chapter ordering relies on. These are the reasons
 * sortKey replaced a dense integer index, so if any of them stops holding
 * the storage design needs revisiting, not just this test.
 */
describe("chapter sort keys", () => {
  it("appends after the last key without touching earlier ones", () => {
    const keys = generateNKeysBetween(null, null, 4);
    const appended = generateKeyBetween(keys[keys.length - 1], null);
    expect([...keys, appended]).toEqual([...keys, appended].slice().sort());
    // The point of the whole exercise: adding a chapter rewrites no rows.
    expect(keys).toEqual(generateNKeysBetween(null, null, 4));
  });

  it("inserts between two chapters without renumbering either", () => {
    const [a, b] = generateNKeysBetween(null, null, 2);
    const mid = generateKeyBetween(a, b);
    expect(a < mid && mid < b).toBe(true);
  });

  it("survives repeated inserts at the same spot without unbounded growth", () => {
    // Someone wedging chapters into one gap over and over is the pathological
    // case for fractional keys; the key must stay a sane length.
    const [lo] = generateNKeysBetween(null, null, 2);
    let hi = generateNKeysBetween(null, null, 2)[1];
    for (let i = 0; i < 50; i++) hi = generateKeyBetween(lo, hi);
    expect(lo < hi).toBe(true);
    expect(hi.length).toBeLessThan(20);
  });

  it("lets two offline devices append after the same chapter", () => {
    // Both mint the same key, which is exactly why the column is not unique:
    // a unique constraint would reject the merge rather than resolve it, and
    // ties are broken on id instead.
    const [last] = generateNKeysBetween(null, null, 1);
    const deviceA = generateKeyBetween(last, null);
    const deviceB = generateKeyBetween(last, null);
    expect(deviceA).toBe(deviceB);
    expect(deviceA > last).toBe(true);
  });

  it("orders deterministically when keys tie, using the id", () => {
    const rows = [
      { id: "b", sortKey: "a1" },
      { id: "a", sortKey: "a1" },
      { id: "c", sortKey: "a0" },
    ];
    const sorted = [...rows].sort(
      (x, y) => x.sortKey.localeCompare(y.sortKey) || x.id.localeCompare(y.id)
    );
    expect(sorted.map((r) => r.id)).toEqual(["c", "a", "b"]);
  });
});
