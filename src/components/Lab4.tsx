import { useState, useEffect, useCallback, useMemo } from "react";
import Graph from "./Graph";
import type { Point } from "../types/types";

// ============================================================================
// 1. ТИПЫ ДАННЫХ (Описываем, как выглядят наши данные)
// ============================================================================

/**
 * Описывает один "кадр" нашей анимации.
 * Алгоритм Грехэма работает пошагово, и мы сохраняем состояние на каждом шаге,
 * чтобы потом показать это как анимацию.
 */
export type GrahamStep = {
    stack: Point[];           // Точки, которые сейчас находятся в "стеке" (нашей выпуклой оболочке)
    currentPoint: Point | null; // Точка, которую мы прямо сейчас проверяем (подсвечивается оранжевым)
    action: "init" | "push" | "pop" | "finish"; // Что именно произошло на этом шаге
    description: string;      // Текстовое объяснение шага для пользователя (например: "Удаляем точку, так как поворот направо")
};

// ============================================================================
// 2. ВСПОМОГАТЕЛЬНЫЕ МАТЕМАТИЧЕСКИЕ ФУНКЦИИ
// ============================================================================

/**
 * Определяет, в какую сторону мы поворачиваем, идя от точки P через точку Q к точке R.
 * Используем векторное произведение.
 * 
 * Представь, что ты идешь от P к Q, а потом хочешь повернуть к R:
 * - Если результат 0: ты идешь прямо по линии (точки на одной прямой).
 * - Если результат > 0: ты поворачиваешь НАПРАВО (по часовой стрелке). Это "впадина", нам это не нужно.
 * - Если результат < 0: ты поворачиваешь НАЛЕВО (против часовой стрелки). Это хороший "выпуклый" угол!
 */
function getOrientation(p: Point, q: Point, r: Point): number {
    // Формула векторного произведения для 2D плоскости
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    
    // Из-за особенностей компьютерной математики (числа с плавающей точкой) 
    // ноль редко бывает идеальным 0. Проверяем на "очень маленькое число".
    if (Math.abs(val) < 1e-9) return 0; // Коллинеарны (на одной линии)
    if (val > 0) return 1;              // Поворот направо (по часовой)
    return 2;                           // Поворот налево (против часовой) - ИДЕАЛЬНО
}

/**
 * Считает квадрат расстояния между двумя точками.
 * Зачем квадрат, а не обычное расстояние? 
 * Чтобы извлечь квадратный корень (Math.sqrt), компьютеру нужно больше времени. 
 * А для сравнения "какая точка ближе" квадрата расстояний вполне достаточно!
 */
function getDistanceSquared(p1: Point, p2: Point): number {
    return (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
}

/**
 * Превращает координаты точки в строку, которую понимает график Desmos.
 * Например, превращает {x: 1, y: 2} в строку "(1, 2)".
 */
function formatPoint(p: Point): string {
    return `(${p.x}, ${p.y})`;
}

/**
 * Создает формулу отрезка для Desmos. 
 * Desmos умеет рисовать отрезки, если задать уравнение прямой и ограничить его по X или Y через фигурные скобки \{...\}.
 */
function formatEdge(first: Point, second: Point): string {
    // Особый случай: если отрезок строго вертикальный, у него нет угла наклона (делить на нельзя).
    // Поэтому рисуем его как "x = константа", ограничив по Y.
    if (first.x === second.x) {
        const minY = Math.min(first.y, second.y);
        const maxY = Math.max(first.y, second.y);
        return `x=${first.x}\\{${minY}\\le y\\le ${maxY}\\}`;
    }
    
    // Обычный случай: используем уравнение прямой y = k*(x - x1) + y1
    const slope = (second.y - first.y) / (second.x - first.x); // k (угловой коэффициент)
    const minX = Math.min(first.x, second.x);
    const maxX = Math.max(first.x, second.x);
    
    // \\{ ... \\} в строке означает для Desmos "рисовать только в этом диапазоне X"
    return `y=(${slope})*(x-(${first.x}))+(${first.y})\\{${minX}\\le x\\le ${maxX}\\}`;
}

// ============================================================================
// 3. АЛГОРИТМ ГРЕХЭМА (Генерация кадров анимации)
// ============================================================================

/**
 * Главная функция: принимает кучу точек и возвращает массив шагов (кадров) анимации.
 * Каждый раз, когда мы добавляем точку в стек или удаляем её оттуда, мы создаем новый кадр.
 */
function generateGrahamSteps(points: Point[]): GrahamStep[] {
    const steps: GrahamStep[] = []; // Здесь будем копить кадры анимации

    // Защита от дурака: если точек меньше 3, выпуклую оболочку не построить (это просто точка или линия)
    if (points.length < 3) {
        steps.push({ stack: [...points], currentPoint: null, action: "finish", description: "Точек меньше 3, оболочка невозможна." });
        return steps;
    }

    // ШАГ 1: Находим опорную точку (pivot).
    // Это самая нижняя точка. Если таких несколько, берем самую левую из них.
    // Аналогия: самый нижний гвоздь на доске, с которого начнем натягивать резинку.
    let pivot = points[0];
    for (let i = 1; i < points.length; i++) {
        if (points[i].y < pivot.y || (points[i].y === pivot.y && points[i].x < pivot.x)) {
            pivot = points[i];
        }
    }

    // ШАГ 2: Сортируем все точки по полярному углу относительно опорной точки.
    // Аналогия: стоим на опорной точке и смотрим на остальные как на циферблате часов, обходя их против часовой стрелки.
    const sortedPoints = [...points].sort((a, b) => {
        // Считаем угол для точки A и точки B
        const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
        const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
        
        // Если углы равны (точки лежат на одном луче), сортируем их по расстоянию: ближние должны быть раньше дальних.
        if (Math.abs(angleA - angleB) < 1e-9) {
            return getDistanceSquared(pivot, a) - getDistanceSquared(pivot, b);
        }
        // Иначе сортируем просто по возрастанию угла
        return angleA - angleB;
    });

    // ШАГ 3: Инициализация стека.
    // Кладем в стек первую точку (опорную). Создаем кадр анимации.
    steps.push({ 
        stack: [pivot], 
        currentPoint: null, 
        action: "init", 
        description: `Найдена опорная точка: (${pivot.x.toFixed(2)}, ${pivot.y.toFixed(2)}).` 
    });

    // Кладем в стек вторую точку. Создаем кадр анимации.
    const stack: Point[] = [sortedPoints[0], sortedPoints[1]];
    steps.push({ 
        stack: [...stack], // ВАЖНО: используем [...stack], чтобы создать КОПИЮ массива, а не ссылку на него!
        currentPoint: sortedPoints[1], 
        action: "push", 
        description: `Добавляем вторую точку в стек.` 
    });

    // ШАГ 4: Основной цикл. Проходим по всем оставшимся отсортированным точкам.
    for (let i = 2; i < sortedPoints.length; i++) {
        const current = sortedPoints[i]; // Точка, которую проверяем прямо сейчас

        // Пока в стеке есть хотя бы 2 точки И поворот НЕ налево (не против часовой стрелки):
        // Это значит, что последняя добавленная точка создает "впадину" или лежит на прямой. Её нужно убрать!
        while (stack.length >= 2 && getOrientation(stack[stack.length - 2], stack[stack.length - 1], current) !== 2) {
            const popped = stack.pop(); // Удаляем верхнюю точку из стека
            
            // Создаем кадр анимации: точка удалена!
            steps.push({ 
                stack: [...stack], 
                currentPoint: current, 
                action: "pop", 
                description: `Поворот не налево. Удаляем точку (${popped?.x.toFixed(2)}, ${popped?.y.toFixed(2)}).` 
            });
        }
        
        // Теперь, когда "впадина" устранена, мы можем безопасно добавить текущую точку в стек.
        stack.push(current);
        
        // Создаем кадр анимации: точка добавлена!
        steps.push({ 
            stack: [...stack], 
            currentPoint: current, 
            action: "push", 
            description: `Добавляем точку (${current.x.toFixed(2)}, ${current.y.toFixed(2)}) в стек.` 
        });
    }

    // ШАГ 5: Замыкаем оболочку.
    // Алгоритмически стек уже содержит верные точки. Но для красивой отрисовки замкнутого многоугольника 
    // мы добавляем первую точку в конец списка, чтобы линия вернулась к началу.
    steps.push({ 
        stack: [...stack, stack[0]], 
        currentPoint: null, 
        action: "finish", 
        description: "Выпуклая оболочка построена и замкнута." 
    });
    
    return steps;
}

// ============================================================================
// 4. КОМПОНЕНТ REACT (Отвечает за интерфейс и управление состоянием)
// ============================================================================

const Lab4 = () => {
    // --- СОСТОЯНИЕ (ПАМЯТЬ) КОМПОНЕНТА ---
    const [points, setPoints] = useState<Point[]>([]);          // Текущий набор случайных точек
    const [steps, setSteps] = useState<GrahamStep[]>([]);       // Все рассчитанные кадры анимации
    const [currentStepIndex, setCurrentStepIndex] = useState(0); // Какой кадр мы показываем прямо сейчас
    const [isPlaying, setIsPlaying] = useState(false);          // Играет ли анимация автоматически?

    // Функция генерации нового набора точек
    const generateNewCase = useCallback(() => {
        const count = Math.floor(Math.random() * 7) + 6; // Случайное число точек от 6 до 12
        const newPoints: Point[] = [];
        for (let i = 0; i < count; i++) {
            newPoints.push({
                // Генерируем координаты от -5.0 до 5.0, округляя до 1 знака для красоты
                x: Number((Math.random() * 10 - 5).toFixed(1)),
                y: Number((Math.random() * 10 - 5).toFixed(1)),
            });
        }
        setPoints(newPoints); // Сохраняем точки
        setSteps(generateGrahamSteps(newPoints)); // Сразу считаем для них все кадры анимации
        setCurrentStepIndex(0); // Сбрасываем анимацию на самый первый шаг
        setIsPlaying(false);    // Останавливаем автопроигрывание
    }, []);

    // Запускаем генерацию точек один раз при первой загрузке страницы
    useEffect(() => {
        generateNewCase();
    }, [generateNewCase]);

    // Эффект "Таймер": если isPlaying === true, автоматически переключаем кадры каждые 800 мс
    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;
        if (isPlaying) {
            intervalId = setInterval(() => {
                setCurrentStepIndex((prev) => {
                    // Если дошли до конца, останавливаемся
                    if (prev >= steps.length - 1) {
                        setIsPlaying(false);
                        return prev;
                    }
                    return prev + 1; // Иначе переходим к следующему кадру
                });
            }, 800); // 800 миллисекунд = 0.8 секунды между шагами
        }
        // Функция очистки: если компонент удаляется или isPlaying меняется, удаляем таймер, чтобы не было утечек памяти
        return () => { if (intervalId) clearInterval(intervalId); };
    }, [isPlaying, steps.length]);

    // --- МАГИЯ, КОТОРАЯ НЕ ДАЕТ ГРАФИКУ "ПРЫГАТЬ" ---
    // useMemo запоминает результат вычисления. Он пересчитает границы ТОЛЬКО если изменится массив points.
    // При переключении currentStepIndex (анимации) этот блок кода НЕ выполняется, поэтому масштаб не сбрасывается!
    const mathBounds = useMemo(() => {
        if (points.length === 0) return { left: -6, right: 6, bottom: -6, top: 6 };
        
        // Находим минимальные и максимальные координаты среди всех точек
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        
        // Добавляем отступы (padding), чтобы фигура не прилипала к краям экрана.
        // Отступ равен 25% от размера фигуры, но не меньше 1.5 единиц.
        const paddingX = Math.max((maxX - minX) * 0.25, 1.5);
        const paddingY = Math.max((maxY - minY) * 0.25, 1.5);
        
        return { 
            left: minX - paddingX, right: maxX + paddingX, 
            bottom: minY - paddingY, top: maxY + paddingY 
        };
    }, [points]); // Зависимость только от points!

    // Берем данные текущего кадра анимации
    const currentStep = steps[currentStepIndex] || { stack: [], currentPoint: null, action: "init", description: "" };

    // Формируем список инструкций для отрисовки в Desmos
    const expressions: any[] = [
        // 1. Рисуем ВСЕ исходные точки серым цветом (чтобы было видно контекст)
        ...points.map((p, i) => ({ id: `point-all-${i}`, latex: formatPoint(p), color: "gray" })),
        
        // 2. Рисуем красные линии между точками, которые сейчас в стеке
        ...currentStep.stack.map((_, i) => {
            if (i < currentStep.stack.length - 1) {
                return { id: `edge-stack-${i}`, latex: formatEdge(currentStep.stack[i], currentStep.stack[i + 1]), color: "red" };
            }
            return null;
        }).filter(Boolean), // .filter(Boolean) удаляет null значения из массива
        
        // 3. Рисуем красные точки поверх линий (вершины текущего стека)
        ...currentStep.stack.map((p, i) => ({ id: `point-stack-${i}`, latex: formatPoint(p), color: "red" })),
        
        // 4. Если есть точка, которую мы прямо сейчас проверяем, рисуем её оранжевой и подписываем
        ...(currentStep.currentPoint ? [{ id: "point-current", latex: formatPoint(currentStep.currentPoint), color: "orange", label: "Проверяется", showLabel: true }] : []),
    ];

    // --- ОТРИСОВКА ИНТЕРФЕЙСА (JSX) ---
    return (
        <main className="lab-page" style={{ display: "flex", gap: "20px", padding: "20px", fontFamily: "sans-serif" }}>
            {/* ЛЕВАЯ ПАНЕЛЬ: Управление и текст */}
            <section className="control-panel" style={{ width: "350px", display: "flex", flexDirection: "column" }}>
                <p className="eyebrow" style={{ color: "#666", fontSize: "0.9em", margin: 0 }}>Лабораторная работа 4</p>
                <h1 style={{ margin: "5px 0 15px 0" }}>Алгоритм Грехэма</h1>
                <p className="description" style={{ fontSize: "0.95em", color: "#444", lineHeight: "1.4" }}>
                    Построение выпуклой оболочки. Вы можете свободно перетаскивать и масштабировать график, анимация не собьёт ваш обзор.
                </p>

                {/* Блок с описанием текущего шага */}
                <div className="result-box" style={{ backgroundColor: "#f0f4f8", padding: "15px", borderRadius: "8px", marginBottom: "15px", border: "1px solid #d1d9e6" }}>
                    <span style={{ display: "block", fontSize: "0.85em", color: "#666", marginBottom: "5px", textTransform: "uppercase" }}>
                        Шаг {currentStepIndex + 1} из {steps.length}
                    </span>
                    <strong style={{ display: "block", color: "#2c3e50", lineHeight: "1.4", fontSize: "1.05em" }}>
                        {currentStep.description}
                    </strong>
                    <small style={{ display: "block", marginTop: "10px", color: "#7f8c8d", fontWeight: "bold" }}>
                        Размер стека: {currentStep.stack.length}
                    </small>
                </div>

                {/* Кнопки управления анимацией */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
                    <button disabled={currentStepIndex === 0} onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))} style={{ flex: 1, padding: "10px", cursor: currentStepIndex === 0 ? "not-allowed" : "pointer", opacity: currentStepIndex === 0 ? 0.5 : 1, borderRadius: "4px", border: "1px solid #ccc", backgroundColor: "#fff" }}>◀ Назад</button>
                    <button onClick={() => setIsPlaying(!isPlaying)} style={{ flex: 1, padding: "10px", backgroundColor: isPlaying ? "#e74c3c" : "#2ecc71", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>{isPlaying ? "⏸ Пауза" : "▶ Старт"}</button>
                    <button disabled={currentStepIndex >= steps.length - 1} onClick={() => setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1))} style={{ flex: 1, padding: "10px", cursor: currentStepIndex >= steps.length - 1 ? "not-allowed" : "pointer", opacity: currentStepIndex >= steps.length - 1 ? 0.5 : 1, borderRadius: "4px", border: "1px solid #ccc", backgroundColor: "#fff" }}>Вперед ▶</button>
                </div>

                <button onClick={generateNewCase} style={{ width: "100%", padding: "12px", marginBottom: "10px", backgroundColor: "#3498db", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>🔄 Сгенерировать новые точки</button>
                
                {/* Кнопка сброса масштаба: она хитро обновляет стейт points, заставляя график пересчитать границы */}
                <button onClick={() => setPoints([...points])} style={{ width: "100%", padding: "8px", marginBottom: "15px", backgroundColor: "#95a5a6", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>🎯 Сбросить масштаб графика</button>

                {/* Список координат */}
                <div className="coordinates" style={{ flex: 1, overflowY: "auto", fontSize: "0.9em", border: "1px solid #eee", borderRadius: "4px", padding: "10px" }}>
                    <h4 style={{ margin: "0 0 10px 0", color: "#555" }}>Исходные точки P:</h4>
                    {points.map((vertex, index) => (
                        <div key={`coordinate-${index}`} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f0f0f0" }}>
                            <span style={{ color: "#7f8c8d" }}>p{index + 1}</span>
                            <b style={{ color: "#2c3e50" }}>({vertex.x}, {vertex.y})</b>
                        </div>
                    ))}
                </div>
            </section>

            {/* ПРАВАЯ ПАНЕЛЬ: График Desmos */}
            <section className="graph-panel" style={{ flex: 1, minHeight: "600px", backgroundColor: "#fff", borderRadius: "8px", overflow: "hidden", border: "1px solid #ddd", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
                {/* 
                    ОЧЕНЬ ВАЖНО: Атрибут `key`. 
                    Он зависит только от координат точек. Пока точки не меняются, ключ не меняется.
                    Это говорит React: "Не пересоздавай компонент Graph при смене кадра анимации".
                    Благодаря этому Graph.tsx обновляет только линии, не трогая масштаб и положение камеры.
                */}
                <Graph 
                    key={`desmos-graph-${points.length}-${points[0]?.x}-${points[0]?.y}`} 
                    expressions={expressions} 
                    mathBounds={mathBounds} 
                />
            </section>
        </main>
    );
};

export default Lab4;