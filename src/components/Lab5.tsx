import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Graph from "./Graph";
import type { Point } from "../types/types";

type MovingPoint = Point & {
    vx: number;
    vy: number;
};

type PointPair = {
    first: MovingPoint;
    second: MovingPoint;
    distance: number;
};

const FIELD_SIZE = 12;
const EPSILON = 1e-9;
const STEP_TIME = 16;

function cross(a: Point, b: Point, c: Point): number {
    // Векторное произведение AB и AC.
    // Знак результата показывает направление поворота A -> B -> C.
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function distanceSquared(a: Point, b: Point): number {
    // Квадрат расстояния используем для сравнений без Math.sqrt.
    return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function triangleArea(a: Point, b: Point, c: Point): number {
    // Это удвоенная площадь треугольника ABC.
    // Чем она больше для фиксированного AB, тем дальше C от ребра AB.
    return Math.abs(cross(a, b, c));
}

function findOppositeVertex(
    hull: MovingPoint[],
    firstIndex: number,
    secondIndex: number,
    startIndex: number,
): number {
    let oppositeIndex = startIndex;

    // Пока следующая вершина дальше от текущего ребра,
    // переходим к ней.
    while (
        triangleArea(
            hull[firstIndex],
            hull[secondIndex],
            hull[(oppositeIndex + 1) % hull.length],
        ) >
        triangleArea(
            hull[firstIndex],
            hull[secondIndex],
            hull[oppositeIndex],
        ) + EPSILON
    ) {
        oppositeIndex = (oppositeIndex + 1) % hull.length;
    }

    return oppositeIndex;
}

/**
 * Алгоритм Джарвиса (gift wrapping).
 *
 * Идея: начинаем с крайней левой точки и каждый раз выбираем
 * следующую точку оболочки, поворачивая вокруг текущей точки.
 * Алгоритм завершает работу, когда возвращается в начальную точку.
 */
function jarvisHull(points: MovingPoint[]): MovingPoint[] {
    if (points.length <= 2) {
        return [...points];
    }

    // Начинаем с самой левой точки. При равном X берём нижнюю.
    // Такая точка гарантированно является вершиной оболочки.
    let leftmost = 0;
    for (let i = 1; i < points.length; i += 1) {
        if (
            points[i].x < points[leftmost].x ||
            (points[i].x === points[leftmost].x &&
                points[i].y < points[leftmost].y)
        ) {
            leftmost = i;
        }
    }

    const hull: MovingPoint[] = [];
    let current = leftmost;

    do {
        // Текущая точка уже найдена и становится вершиной оболочки.
        hull.push(points[current]);

        // Временно выбираем любую другую точку как кандидата
        // на следующую вершину.
        let next = (current + 1) % points.length;

        for (let i = 0; i < points.length; i += 1) {
            if (i === current) {
                continue;
            }

            // Сравниваем поворот current -> next с current -> i.
            // Если i даёт более подходящий поворот, заменяем кандидата.
            const turn = cross(points[current], points[next], points[i]);

            // Если поворот положительный, точка i подходит
            // лучше текущей точки next.
            const hasBetterTurn = turn > EPSILON;

            // Если поворот почти нулевой, три точки лежат
            // на одной прямой.
            const pointsAreCollinear = Math.abs(turn) <= EPSILON;

            // В таком случае выбираем более дальнюю точку.
            // Ближняя точка находится внутри ребра оболочки
            // и не должна становиться её вершиной.
            const pointIsFarther =
                distanceSquared(points[current], points[i]) >
                distanceSquared(points[current], points[next]);

            // Новая точка подходит, если:
            // 1. она даёт лучший поворот;
            // 2. или лежит на одной прямой, но находится дальше.
            const pointIsBetter =
                hasBetterTurn || (pointsAreCollinear && pointIsFarther);

            if (pointIsBetter) {
                next = i;
            }
        }

        // Переходим к выбранной вершине и продолжаем "оборачивать" точки.
        current = next;
    } while (current !== leftmost && hull.length <= points.length);

    return hull;
}

/**
 * Находит диаметр множества.
 * Сначала строится выпуклая оболочка алгоритмом Джарвиса.
 * Затем диаметр находится методом вращающихся калиперов.
 *
 * Диаметр множества всегда можно найти среди вершин выпуклой оболочки:
 * внутренняя точка не может образовать максимальное расстояние.
 */
function findDiameter(points: MovingPoint[]): PointPair | null {
    if (points.length < 2) {
        return null;
    }

    const hull = jarvisHull(points);

    // Пока не найдена более дальняя пара, первой максимальной
    // парой считаем первые две вершины оболочки.
    let bestFirst = hull[0];
    let bestSecond = hull[1];
    let bestDistanceSquared = distanceSquared(bestFirst, bestSecond);

    // Начинаем поиск противоположной вершины с первой вершины.
    let oppositeIndex = 1;

    // Перебираем все рёбра выпуклой оболочки.
    for (let firstIndex = 0; firstIndex < hull.length; firstIndex += 1) {
        const secondIndex = (firstIndex + 1) % hull.length;

        // Находим вершину, которая находится дальше всего от ребра.
        oppositeIndex = findOppositeVertex(
            hull,
            firstIndex,
            secondIndex,
            oppositeIndex,
        );

        // Проверяем расстояния от обеих вершин ребра
        // до найденной противоположной вершины.
        const firstDistanceSquared = distanceSquared(
            hull[firstIndex],
            hull[oppositeIndex],
        );
        const secondDistanceSquared = distanceSquared(
            hull[secondIndex],
            hull[oppositeIndex],
        );

        if (firstDistanceSquared > bestDistanceSquared) {
            bestDistanceSquared = firstDistanceSquared;
            bestFirst = hull[firstIndex];
            bestSecond = hull[oppositeIndex];
        }

        if (secondDistanceSquared > bestDistanceSquared) {
            bestDistanceSquared = secondDistanceSquared;
            bestFirst = hull[secondIndex];
            bestSecond = hull[oppositeIndex];
        }
    }

    return {
        first: bestFirst,
        second: bestSecond,
        distance: Math.sqrt(bestDistanceSquared),
    };
}

function createPoints(count: number, speed: number): MovingPoint[] {
    return Array.from({ length: count }, (_, index) => {
        const angle = (index * 2.399963 + Math.random() * 0.25) % (Math.PI * 2);
        const radius = 1.5 + Math.sqrt(Math.random()) * 7.5;
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
            vx: Math.cos(angle + Math.PI / 2) * speed,
            vy: Math.sin(angle + Math.PI / 2) * speed,
        };
    });
}

function formatPoint(point: Point): string {
    return `(${point.x.toFixed(3)},${point.y.toFixed(3)})`;
}

function formatEdge(first: Point, second: Point): string {
    if (Math.abs(first.x - second.x) < EPSILON) {
        return `x=${first.x}\\{${Math.min(first.y, second.y)}\\le y\\le ${Math.max(first.y, second.y)}\\}`;
    }

    const slope = (second.y - first.y) / (second.x - first.x);
    const minX = Math.min(first.x, second.x);
    const maxX = Math.max(first.x, second.x);
    return `y=(${slope})*(x-(${first.x}))+(${first.y})\\{${minX}\\le x\\le ${maxX}\\}`;
}

function movePoint(point: MovingPoint, time: number): MovingPoint {
    return {
        ...point,
        x: point.x + point.vx * (time / STEP_TIME),
        y: point.y + point.vy * (time / STEP_TIME),
    };
}

function movePoints(
    points: MovingPoint[],
    diameter: PointPair | null,
    shouldReverse: boolean,
    time: number,
): MovingPoint[] {
    return points.map((point) => {
        let pointToMove = point;

        if (
            shouldReverse &&
            diameter !== null &&
            (point === diameter.first || point === diameter.second)
        ) {
            pointToMove = {
                ...point,
                vx: -point.vx,
                vy: -point.vy,
            };
        }

        return movePoint(pointToMove, time);
    });
}

const Lab5 = () => {
    const [pointCount, setPointCount] = useState(12);
    const [speed, setSpeed] = useState(0.08);
    const [threshold, setThreshold] = useState(10);
    const [points, setPoints] = useState<MovingPoint[]>(() =>
        createPoints(12, 0.08),
    );
    const [isAnimating, setIsAnimating] = useState(false);
    const [step, setStep] = useState(0);
    const animationFrameRef = useRef<number | null>(null);
    const pointsRef = useRef(points);
    const previousDiameterRef = useRef<number | null>(null);

    const diameter = useMemo(() => findDiameter(points), [points]);

    const reset = useCallback(() => {
        setIsAnimating(false);
        const newPoints = createPoints(pointCount, speed);
        pointsRef.current = newPoints;
        setPoints(newPoints);
        setStep(0);
        previousDiameterRef.current = null;
    }, [pointCount, speed]);

    const update = useCallback(() => {
        const currentPoints = pointsRef.current;
        const currentDiameter = findDiameter(currentPoints);
        const isTooFar =
            currentDiameter !== null && currentDiameter.distance > threshold;
        const distanceIsIncreasing =
            currentDiameter !== null &&
            (previousDiameterRef.current === null ||
                currentDiameter.distance > previousDiameterRef.current);
        const shouldReverse = isTooFar && distanceIsIncreasing;

        previousDiameterRef.current = currentDiameter?.distance ?? null;

        const nextPoints = movePoints(
            currentPoints,
            currentDiameter,
            shouldReverse,
            STEP_TIME,
        );
        pointsRef.current = nextPoints;
        setPoints(nextPoints);
        setStep((currentStep) => currentStep + 1);
        animationFrameRef.current = requestAnimationFrame(update);
    }, [threshold]);

    useEffect(() => {
        if (isAnimating) {
            animationFrameRef.current = requestAnimationFrame(update);
        } else if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        return () => {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [isAnimating, update]);

    const expressions = useMemo<Desmos.ExpressionState[]>(() => {
        const hull = jarvisHull(points);
        const hullEdges =
            hull.length > 1
                ? hull.map((point, index) => ({
                      id: `hull-edge-${index}`,
                      latex: formatEdge(point, hull[(index + 1) % hull.length]),
                      color: Desmos.Colors.BLUE,
                      lines: true,
                      lineWidth: 2,
                  }))
                : [];

        const diameterExpression =
            diameter === null
                ? []
                : [
                      {
                          id: "diameter",
                          latex: formatEdge(diameter.first, diameter.second),
                          color: Desmos.Colors.RED,
                          lines: true,
                          lineWidth: 3,
                      },
                  ];

        return [
            ...hullEdges,
            ...diameterExpression,
            ...points.map((point, index) => ({
                id: `point-${index}`,
                latex: formatPoint(point),
                color:
                    diameter &&
                    (point === diameter.first || point === diameter.second)
                        ? Desmos.Colors.RED
                        : Desmos.Colors.GREEN,
                pointSize: 9,
            })),
        ];
    }, [diameter, points]);

    const changePointCount = (value: number) => {
        setPointCount(value);
        const newPoints = createPoints(value, speed);
        pointsRef.current = newPoints;
        setPoints(newPoints);
        setStep(0);
        previousDiameterRef.current = null;
    };

    return (
        <main className="lab-page">
            <section className="control-panel">
                <p className="eyebrow">Лабораторная работа 5</p>
                <h1>Диаметр движущихся точек</h1>
                <p className="description">
                    На каждом шаге строится выпуклая оболочка алгоритмом
                    Джарвиса, после чего диаметр множества находится
                    вращающимися калиперами. При превышении D скорости концов
                    диаметра меняют направление.
                </p>

                <div className="result-box" aria-live="polite">
                    <span>Текущий диаметр</span>
                    <strong>{diameter?.distance.toFixed(2) ?? "—"}</strong>
                    <small>
                        {diameter && diameter.distance > threshold
                            ? `Порог D = ${threshold}: превышен`
                            : `Порог D = ${threshold}: не превышен`}
                    </small>
                </div>

                <div className="control-group">
                    <label htmlFor="lab5-point-count">
                        Количество точек: {pointCount}
                    </label>
                    <input
                        id="lab5-point-count"
                        type="range"
                        min="3"
                        max="40"
                        value={pointCount}
                        onChange={(event) =>
                            changePointCount(Number(event.target.value))
                        }
                        disabled={isAnimating}
                    />
                </div>

                <div className="control-group">
                    <label htmlFor="lab5-speed">
                        Скорость: {speed.toFixed(2)}
                    </label>
                    <input
                        id="lab5-speed"
                        type="range"
                        min="0.02"
                        max="0.25"
                        step="0.01"
                        value={speed}
                        onChange={(event) =>
                            setSpeed(Number(event.target.value))
                        }
                        disabled={isAnimating}
                    />
                </div>

                <div className="control-group">
                    <label htmlFor="lab5-threshold">
                        D: {threshold.toFixed(1)}
                    </label>
                    <input
                        id="lab5-threshold"
                        type="range"
                        min="2"
                        max="50"
                        step="0.5"
                        value={threshold}
                        onChange={(event) => {
                            setThreshold(Number(event.target.value));
                            previousDiameterRef.current = null;
                        }}
                    />
                </div>

                <div className="button-group">
                    <button
                        type="button"
                        className="new-case-button"
                        onClick={() => setIsAnimating(true)}
                        disabled={isAnimating}
                    >
                        Запустить
                    </button>
                    <button
                        type="button"
                        className="new-case-button"
                        onClick={() => setIsAnimating(false)}
                        disabled={!isAnimating}
                    >
                        Остановить
                    </button>
                    <button
                        type="button"
                        className="new-case-button"
                        onClick={reset}
                    >
                        Новый набор
                    </button>
                </div>

                <div className="coordinates">
                    <div>
                        <span>Шаг анимации</span>
                        <b>{step}</b>
                    </div>
                    <div>
                        <span>Вершин оболочки</span>
                        <b>{jarvisHull(points).length}</b>
                    </div>
                </div>
            </section>

            <section
                className="graph-panel"
                aria-label="Анимация диаметра множества"
            >
                <Graph expressions={expressions} scale={FIELD_SIZE + 1} />
            </section>
        </main>
    );
};

export default Lab5;
