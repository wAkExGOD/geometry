import { useState } from "react";
import Graph from "./Graph";
import { getOrientation } from "./Lab11";
import type { Point, SegmentCase } from "../types/types";
import { formatPoint } from "../utils/formatPoint";

/** Проверяет, лежит ли точка внутри прямоугольника отрезка. */
export function isPointOnSegment(
    first: Point,
    second: Point,
    point: Point,
): boolean {
    return (
        Math.min(first.x, second.x) <= point.x &&
        point.x <= Math.max(first.x, second.x) &&
        Math.min(first.y, second.y) <= point.y &&
        point.y <= Math.max(first.y, second.y)
    );
}

/** Определяет, имеют ли два отрезка хотя бы одну общую точку. */
export function doSegmentsIntersect({ p1, p2, p3, p4 }: SegmentCase): boolean {
    const orientation1 = getOrientation(p1, p2, p3);
    const orientation2 = getOrientation(p1, p2, p4);
    const orientation3 = getOrientation(p3, p4, p1);
    const orientation4 = getOrientation(p3, p4, p2);

    if (orientation1 === 0 && isPointOnSegment(p1, p2, p3)) {
        return true;
    }
    if (orientation2 === 0 && isPointOnSegment(p1, p2, p4)) {
        return true;
    }
    if (orientation3 === 0 && isPointOnSegment(p3, p4, p1)) {
        return true;
    }
    if (orientation4 === 0 && isPointOnSegment(p3, p4, p2)) {
        return true;
    }
    const firstPairIsOnDifferentSides = orientation1 > 0 !== orientation2 > 0;
    const secondPairIsOnDifferentSides = orientation3 > 0 !== orientation4 > 0;

    return firstPairIsOnDifferentSides && secondPairIsOnDifferentSides;
}

function formatSegment(first: Point, second: Point): string {
    const x = `(1-t)*${first.x}+t*${second.x}`;
    const y = `(1-t)*${first.y}+t*${second.y}`;

    return `(${x},${y})\\{0\\le t\\le 1\\}`;
}

const Lab12 = () => {
    function getRandomCoordinate(): number {
        return Math.floor(Math.random() * 17) - 8;
    }

    /** Создаёт новый случай с двумя непустыми отрезками. */
    function createSegmentCase(): SegmentCase {
        const getPoint = (): Point => ({
            x: getRandomCoordinate(),
            y: getRandomCoordinate(),
        });
        const p1 = getPoint();
        let p2 = getPoint();
        const p3 = getPoint();
        let p4 = getPoint();

        while (p1.x === p2.x && p1.y === p2.y) {
            p2 = getPoint();
        }
        while (p3.x === p4.x && p3.y === p4.y) {
            p4 = getPoint();
        }

        return { p1, p2, p3, p4 };
    }

    const [segmentCase, setSegmentCase] = useState(createSegmentCase);
    const intersects = doSegmentsIntersect(segmentCase);
    const { p1, p2, p3, p4 } = segmentCase;
    const expressions: Desmos.ExpressionState[] = [
        {
            id: "segment-1",
            latex: formatSegment(p1, p2),
            color: Desmos.Colors.BLUE,
        },
        {
            id: "segment-2",
            latex: formatSegment(p3, p4),
            color: Desmos.Colors.RED,
        },
        ...[p1, p2, p3, p4].map((point, index) => ({
            id: `point-${index}`,
            latex: formatPoint(point),
            label: `p${index + 1} ${formatPoint(point)}`,
            showLabel: true,
            color: index < 2 ? Desmos.Colors.BLUE : Desmos.Colors.RED,
        })),
    ];

    return (
        <main className="lab-page">
            <section className="control-panel">
                <p className="eyebrow">Лабораторная работа 2</p>
                <h1>Пересечение отрезков</h1>
                <p className="description">
                    Проверяем, есть ли у отрезков p1p2 и p3p4 общая точка.
                </p>

                <div className="result-box" aria-live="polite">
                    <span>Результат</span>
                    <strong>
                        {intersects
                            ? "отрезки пересекаются"
                            : "отрезки не пересекаются"}
                    </strong>
                </div>

                <div className="coordinates">
                    {[p1, p2, p3, p4].map((point, index) => (
                        <div key={`coordinate-${index}`}>
                            <span>p{index + 1}</span>
                            <b>{formatPoint(point)}</b>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    className="new-case-button"
                    onClick={() => setSegmentCase(createSegmentCase())}
                >
                    Создать новый случай
                </button>
            </section>

            <section className="graph-panel" aria-label="График отрезков">
                <Graph
                    expressions={expressions}
                    mathBounds={{
                        left: -10,
                        right: 10,
                        bottom: -10,
                        top: 10,
                    }}
                />
            </section>
        </main>
    );
};

export default Lab12;
