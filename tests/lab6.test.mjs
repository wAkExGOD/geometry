import assert from "node:assert/strict";
import { test } from "node:test";
import { advancePoints, createPoints, hullPerimeter, quickHull } from "../src/utils/lab6.ts";

const key = (point) => `${point.x},${point.y}`;
const vertexKeys = (points) => points.map(key).sort();

test("Quick Hull excludes interior and collinear boundary points", () => {
    const corners = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }];
    const hull = quickHull([...corners, { x: 2, y: 1 }, { x: 2, y: 0 }, { ...corners[0] }]);
    assert.deepEqual(vertexKeys(hull), vertexKeys(corners));
    assert.equal(hullPerimeter(hull), 14);
});

test("empty, coincident, vertical and collinear sets", () => {
    assert.deepEqual(quickHull([]), []);
    assert.equal(hullPerimeter([]), 0);
    const point = { x: 1, y: 1 };
    assert.deepEqual(quickHull([point, { ...point }]), [point]);
    assert.equal(hullPerimeter([point]), 0);
    for (const points of [
        [{ x: 0, y: 3 }, { x: 0, y: 1 }, { x: 0, y: -2 }],
        [{ x: 3, y: 3 }, { x: 1, y: 1 }, { x: -2, y: -2 }],
    ]) {
        const hull = quickHull(points);
        assert.equal(hull.length, 2);
        assert.equal(hullPerimeter(hull), 2 * Math.hypot(points[0].x - points[2].x, points[0].y - points[2].y));
    }
});

test("Quick Hull agrees with an independent monotone chain on seeded point sets", () => {
    const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    function monotoneHull(points) {
        const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
        const half = (items) => {
            const result = [];
            for (const point of items) {
                while (result.length >= 2 && cross(result.at(-2), result.at(-1), point) <= 0) result.pop();
                result.push(point);
            }
            return result.slice(0, -1);
        };
        return [...half(sorted), ...half(sorted.toReversed())];
    }
    let seed = 12345;
    const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    for (let i = 0; i < 200; i += 1) {
        const points = Array.from({ length: 60 }, () => ({ x: random() * 20 - 10, y: random() * 20 - 10 }));
        const hull = quickHull(points);
        const expected = monotoneHull(points);
        assert.deepEqual(vertexKeys(hull), vertexKeys(expected));
        assert.ok(Math.abs(hullPerimeter(hull) - hullPerimeter(expected)) < 1e-10);
    }
});

test("a step moves every point and reverses only the new hull vertices above S", () => {
    const points = [
        { x: 0, y: 0, vx: -1, vy: -1 },
        { x: 4, y: 0, vx: 1, vy: -1 },
        { x: 4, y: 4, vx: 1, vy: 1 },
        { x: 0, y: 4, vx: -1, vy: 1 },
        { x: 2, y: 2, vx: 0.5, vy: 0 },
    ];
    const snapshot = structuredClone(points);
    const next = advancePoints(points, 16, 0.25);
    assert.equal(next.reversed, true);
    next.points.forEach((point, index) => {
        const original = points[index];
        assert.equal(point.x, original.x + original.vx * 0.25);
        assert.equal(point.y, original.y + original.vy * 0.25);
        const sign = index < 4 ? -1 : 1;
        assert.equal(point.vx, original.vx * sign);
        assert.equal(point.vy, original.vy * sign);
        assert.equal(Math.hypot(point.vx, point.vy), Math.hypot(original.vx, original.vy));
    });
    assert.deepEqual(points, snapshot);
    // Строгое превышение: равенство порогу не вызывает разворот.
    assert.equal(advancePoints(points, 18, 0.25).reversed, false);
    assert.equal(advancePoints(points, 20, 0.25).reversed, false);
});

test("generated points have the requested constant speed", () => {
    const points = createPoints(60, 2.5);
    assert.equal(points.length, 60);
    for (const point of points) {
        assert.ok(Math.abs(Math.hypot(point.vx, point.vy) - 2.5) < 1e-12);
    }
});
