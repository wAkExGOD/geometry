import { useState, useRef, useEffect } from "react";
import type { Point } from "../types/types";
import Graph from "./Graph";
import {
    isPointInsidePolygonOctant,
    isPointInsideConvexPolygonBinary,
} from "../utils/pointInPolygon";
import {
    findCollisionEdge,
    findSegmentIntersection,
    reflectVelocity,
} from "../utils/geometry";
import {
    generateRandomConvexPolygon,
    isPolygonInsidePolygon,
} from "../utils/polygonGenerator";

interface MovingPoint {
    position: Point;
    velocity: Point;
    stopped: boolean;
}

const Lab3 = () => {
    const animationFrameRef = useRef<number | undefined>(undefined);
    const lastFrameTimeRef = useRef(0);

    // Генерируем случайные многоугольники
    const generatePolygons = () => {
        let outer: Point[];
        let inner: Point[];
        let attempts = 0;

        // Генерируем до тех пор, пока внутренний многоугольник не будет полностью внутри внешнего
        do {
            outer = generateRandomConvexPolygon(
                0,
                0,
                6,
                9,
                6 + Math.floor(Math.random() * 3),
            );
            inner = generateRandomConvexPolygon(
                0,
                0,
                1.5,
                3,
                4 + Math.floor(Math.random() * 3),
            );
            attempts++;
        } while (!isPolygonInsidePolygon(inner, outer) && attempts < 50);

        return { outer, inner };
    };

    const { outer: initialOuter, inner: initialInner } = generatePolygons();

    // Выпуклый многоугольник Q (внешняя граница)
    const [convexPolygon, setConvexPolygon] = useState<Point[]>(initialOuter);

    // Простой многоугольник P (внутреннее препятствие)
    const [simplePolygon, setSimplePolygon] = useState<Point[]>(initialInner);

    // Движущиеся точки
    const [movingPoints, setMovingPoints] = useState<MovingPoint[]>([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [speed, setSpeed] = useState(0.1);
    const [pointCount, setPointCount] = useState(10);

    /** Инициализирует движущиеся точки. */
    const initializePoints = () => {
        const points: MovingPoint[] = [];

        // Вычисляем bounding box внешнего многоугольника
        const xCoords = convexPolygon.map((p) => p.x);
        const yCoords = convexPolygon.map((p) => p.y);
        const minX = Math.min(...xCoords);
        const maxX = Math.max(...xCoords);
        const minY = Math.min(...yCoords);
        const maxY = Math.max(...yCoords);

        for (let i = 0; i < pointCount; i++) {
            let position: Point;
            let attempts = 0;

            // Генерируем точку между многоугольниками
            do {
                position = {
                    x: minX + Math.random() * (maxX - minX),
                    y: minY + Math.random() * (maxY - minY),
                };
                attempts++;

                // Проверяем: точка должна быть внутри внешнего и вне внутреннего многоугольника
                const insideOuter = isPointInsideConvexPolygonBinary(
                    convexPolygon,
                    position,
                );
                const insideInner = isPointInsidePolygonOctant(
                    simplePolygon,
                    position,
                );

                if (insideOuter && !insideInner) {
                    break;
                }
            } while (attempts < 500);

            // Если не удалось найти подходящую точку, пропускаем
            if (attempts >= 500) continue;

            // Случайное направление
            const angle = Math.random() * 2 * Math.PI;
            const velocity = {
                x: speed * Math.cos(angle),
                y: speed * Math.sin(angle),
            };

            points.push({
                position,
                velocity,
                stopped: false,
            });
        }

        setMovingPoints(points);
    };

    /** Обновляет позиции точек. */
    const updatePoints = () => {
        setMovingPoints((prevPoints) =>
            prevPoints.map((point) => {
                if (point.stopped) return point;

                // Новая позиция
                const newPosition = {
                    x: point.position.x + point.velocity.x,
                    y: point.position.y + point.velocity.y,
                };

                // Сначала проверяем столкновение с внутренним многоугольником (препятствием)
                const obstacleCollision = findCollisionEdge(
                    point.position,
                    newPosition,
                    simplePolygon,
                );

                // Если траектория пересекает препятствие - останавливаем
                if (obstacleCollision !== null) {
                    const edgeStart = simplePolygon[obstacleCollision];
                    const edgeEnd =
                        simplePolygon[
                            (obstacleCollision + 1) % simplePolygon.length
                        ];
                    const collisionPosition = findSegmentIntersection(
                        point.position,
                        newPosition,
                        edgeStart,
                        edgeEnd,
                    );

                    return {
                        ...point,
                        position: collisionPosition ?? newPosition,
                        stopped: true,
                        velocity: { x: 0, y: 0 },
                    };
                }

                // Проверяем, не окажется ли точка внутри препятствия
                if (isPointInsidePolygonOctant(simplePolygon, newPosition)) {
                    return {
                        ...point,
                        stopped: true,
                        velocity: { x: 0, y: 0 },
                    };
                }

                // Проверяем столкновение с границей внешнего многоугольника Q
                const boundaryCollision = findCollisionEdge(
                    point.position,
                    newPosition,
                    convexPolygon,
                );

                if (boundaryCollision !== null) {
                    const edgeStart = convexPolygon[boundaryCollision];
                    const edgeEnd =
                        convexPolygon[
                            (boundaryCollision + 1) % convexPolygon.length
                        ];

                    const newVelocity = reflectVelocity(
                        point.velocity,
                        edgeStart,
                        edgeEnd,
                    );

                    return {
                        ...point,
                        velocity: newVelocity,
                    };
                }

                // Дополнительная проверка: точка не должна выйти за внешний многоугольник
                if (
                    !isPointInsideConvexPolygonBinary(
                        convexPolygon,
                        newPosition,
                    )
                ) {
                    // Отражаем скорость (fallback на случай пропуска коллизии)
                    return {
                        ...point,
                        velocity: {
                            x: -point.velocity.x,
                            y: -point.velocity.y,
                        },
                    };
                }

                // Обновляем позицию
                return {
                    ...point,
                    position: newPosition,
                };
            }),
        );
    };

    /** Цикл анимации. */
    const animate = (timestamp: number) => {
        if (timestamp - lastFrameTimeRef.current >= 50) {
            lastFrameTimeRef.current = timestamp;
            updatePoints();
        }
        animationFrameRef.current = requestAnimationFrame(animate);
    };

    /** Запускает анимацию. */
    const startAnimation = () => {
        if (!isAnimating) {
            setIsAnimating(true);
        }
    };

    /** Останавливает анимацию. */
    const stopAnimation = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        setIsAnimating(false);
    };

    /** Сбрасывает анимацию. */
    const resetAnimation = () => {
        stopAnimation();
        initializePoints();
    };

    /** Генерирует новые многоугольники. */
    const regeneratePolygons = () => {
        stopAnimation();
        const { outer, inner } = generatePolygons();
        setConvexPolygon(outer);
        setSimplePolygon(inner);
        // Инициализируем точки после установки новых многоугольников
        setTimeout(() => initializePoints(), 0);
    };

    // Эффект для управления анимацией
    useEffect(() => {
        if (isAnimating) {
            animationFrameRef.current = requestAnimationFrame(animate);
        } else {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isAnimating, movingPoints]);

    // Инициализация при монтировании
    useEffect(() => {
        initializePoints();
    }, []);

    const formatPoint = (point: Point) => `(${point.x},${point.y})`;
    const formatEdge = (start: Point, end: Point) =>
        `${formatPoint(start)},${formatPoint(end)}`;

    const polygonEdges = (
        polygon: Point[],
        idPrefix: string,
        color: string,
    ): Desmos.ExpressionState[] =>
        polygon.map((point, index) => ({
            id: `${idPrefix}-edge-${index}`,
            latex: formatEdge(point, polygon[(index + 1) % polygon.length]),
            color,
            lines: true,
            lineWidth: 3,
        }));

    const expressions: Desmos.ExpressionState[] = [
        ...polygonEdges(convexPolygon, "outer", Desmos.Colors.BLUE),
        ...polygonEdges(simplePolygon, "inner", Desmos.Colors.RED),
        ...movingPoints.map((point, index) => ({
            id: `moving-point-${index}`,
            latex: formatPoint(point.position),
            color: point.stopped ? Desmos.Colors.RED : Desmos.Colors.GREEN,
            pointSize: 9,
        })),
    ];

    return (
        <main className="lab-page">
            <section className="control-panel">
                <p className="eyebrow">Лабораторная работа 3</p>
                <h1>Анимация движения точек</h1>
                <p className="description">
                    Анимация движения множества точек внутри выпуклого
                    многоугольника Q с обнулением скорости при попадании внутрь
                    простого многоугольника P.
                </p>

                <div className="result-box" aria-live="polite">
                    <span>Статистика</span>
                    <strong>
                        Точек: {movingPoints.length} | Остановлено:{" "}
                        {movingPoints.filter((p) => p.stopped).length}
                    </strong>
                    <small>
                        {isAnimating
                            ? "Анимация запущена"
                            : "Анимация остановлена"}
                    </small>
                </div>

                <div className="control-group">
                    <label htmlFor="point-count">
                        Количество точек: {pointCount}
                    </label>
                    <input
                        id="point-count"
                        type="range"
                        min="5"
                        max="50"
                        value={pointCount}
                        onChange={(e) => setPointCount(Number(e.target.value))}
                        disabled={isAnimating}
                    />
                </div>

                <div className="control-group">
                    <label htmlFor="speed">Скорость: {speed.toFixed(2)}</label>
                    <input
                        id="speed"
                        type="range"
                        min="0.05"
                        max="0.5"
                        step="0.05"
                        value={speed}
                        onChange={(e) => setSpeed(Number(e.target.value))}
                        disabled={isAnimating}
                    />
                </div>

                <div className="button-group">
                    <button
                        type="button"
                        className="new-case-button"
                        onClick={startAnimation}
                        disabled={isAnimating}
                    >
                        Запустить
                    </button>
                    <button
                        type="button"
                        className="new-case-button"
                        onClick={stopAnimation}
                        disabled={!isAnimating}
                    >
                        Остановить
                    </button>
                    <button
                        type="button"
                        className="new-case-button"
                        onClick={resetAnimation}
                    >
                        Сбросить
                    </button>
                    <button
                        type="button"
                        className="new-case-button"
                        onClick={regeneratePolygons}
                        disabled={isAnimating}
                    >
                        Новые многоугольники
                    </button>
                </div>

                <div className="coordinates">
                    <h3>Выпуклый многоугольник Q</h3>
                    {convexPolygon.map((vertex, index) => (
                        <div key={`convex-${index}`}>
                            <span>q{index + 1}</span>
                            <b>
                                ({vertex.x}, {vertex.y})
                            </b>
                        </div>
                    ))}
                </div>

                <div className="coordinates">
                    <h3>Простой многоугольник P</h3>
                    {simplePolygon.map((vertex, index) => (
                        <div key={`simple-${index}`}>
                            <span>p{index + 1}</span>
                            <b>
                                ({vertex.x}, {vertex.y})
                            </b>
                        </div>
                    ))}
                </div>
            </section>

            <section className="graph-panel" aria-label="График анимации">
                <Graph expressions={expressions} scale={15} />
            </section>
        </main>
    );
};

export default Lab3;
