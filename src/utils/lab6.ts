import type { Point } from "../types/types";
import { getOrientation } from "./geometry.ts";

// Помимо координат (x, y), точка хранит компоненты вектора скорости.
// vx и vy измеряются в единицах координат в секунду.
export type MovingPoint = Point & { vx: number; vy: number };

/**
 * Quick Hull строит оболочку методом «разделяй и властвуй»:
 * 1. Находим две крайние точки и разделяем множество прямой между ними.
 * 2. С каждой стороны выбираем самую далёкую от прямой точку.
 * 3. Повторяем поиск для двух новых рёбер, отбрасывая внутренние точки.
 *
 * Результат — вершины в порядке обхода, без повторения первой в конце.
 * T extends Point позволяет сохранить дополнительные поля точки (vx, vy).
 * readonly запрещает изменять входной массив внутри функции.
 */
export function quickHull<T extends Point>(points: readonly T[]): T[] {
    // Ключ Map — пара координат: из нескольких совпадающих точек остаётся одна.
    // Сохраняются исходные объекты, поэтому у вершин не теряются vx и vy.
    const unique = [...new Map(points.map((p) => [`${p.x},${p.y}`, p])).values()];
    // Для пустого множества и одной точки строить рёбра не нужно.
    if (unique.length <= 1) return unique;

    // Крайние точки гарантированно принадлежат оболочке.
    // При равном x сравниваем y: это также обрабатывает вертикальное множество.
    let left = unique[0];
    let right = unique[0];
    for (const point of unique) {
        if (point.x < left.x || (point.x === left.x && point.y < left.y)) left = point;
        if (point.x > right.x || (point.x === right.x && point.y > right.y)) right = point;
    }

    const hull: T[] = [left];
    // Добавляем промежуточные вершины цепочки от a до b.
    // candidates содержит только точки строго слева от направленной прямой AB.
    // Сами a и b здесь не добавляем: их добавляет вызывающий код.
    function appendSide(a: T, b: T, candidates: T[]) {
        // Если снаружи ребра нет точек, AB уже является ребром оболочки.
        if (candidates.length === 0) return;
        // getOrientation(a, b, p) = (bx-ax)(py-ay) - (by-ay)(px-ax).
        // Положительный знак означает, что p слева от AB.
        // Расстояние до прямой равно |определитель| / |AB|.
        // Для фиксированного AB знаменатель одинаков, поэтому достаточно
        // сравнивать определители без вычисления корня и деления.
        let farthest = candidates[0];
        for (const point of candidates) {
            if (getOrientation(a, b, point) > getOrientation(a, b, farthest)) {
                farthest = point;
            }
        }
        // Треугольник A–farthest–B входит в будущую оболочку.
        // Его внутренние точки дальше не рассматриваем. Ищем только точки
        // снаружи новых рёбер A–farthest и farthest–B.
        // Строгое > 0 исключает промежуточные точки на прямолинейных рёбрах.
        // Порядок «левая цепочка, вершина, правая цепочка» сохраняет обход.
        appendSide(a, farthest, candidates.filter((p) => getOrientation(a, farthest, p) > 0));
        hull.push(farthest);
        appendSide(farthest, b, candidates.filter((p) => getOrientation(farthest, b, p) > 0));
    }

    // Сначала обходим одну сторону от left до right, затем другую обратно.
    // При смене направления прямой её правая сторона становится левой.
    // Если все точки коллинеарны, обе цепочки пусты: остаются два конца.
    appendSide(left, right, unique.filter((p) => getOrientation(left, right, p) > 0));
    hull.push(right);
    appendSide(right, left, unique.filter((p) => getOrientation(right, left, p) > 0));
    return hull;
}

export function hullPerimeter(hull: readonly Point[]): number {
    // Складываем длины рёбер в порядке обхода.
    // Остаток от деления замыкает последнее ребро на первую вершину.
    // Math.hypot(dx, dy) вычисляет sqrt(dx² + dy²).
    // Для отрезка замкнутый обход имеет длину 2 * длина отрезка;
    // для одной точки и пустого массива результат равен 0.
    return hull.reduce((sum, point, index) => {
        const next = hull[(index + 1) % hull.length];
        return sum + Math.hypot(next.x - point.x, next.y - point.y);
    }, 0);
}

export function advancePoints(points: readonly MovingPoint[], threshold: number, seconds: number) {
    // Один дискретный шаг: сначала перемещаем все точки по формулам
    // x' = x + vx * dt, y' = y + vy * dt. Создаём новые объекты,
    // чтобы не изменять предыдущее состояние React.
    const moved = points.map((p) => ({ ...p, x: p.x + p.vx * seconds, y: p.y + p.vy * seconds }));
    // Состав оболочки может измениться после перемещения, поэтому строим
    // её заново именно по новым координатам, а не используем старые вершины.
    const hull = quickHull(moved);
    const perimeter = hullPerimeter(hull);
    // threshold — константа S. При равенстве периметра S разворота нет.
    // Проверяем условие на каждом шаге: если превышение сохраняется,
    // на следующем шаге скорости вершин снова поменяют знак.
    const reversed = perimeter > threshold;
    // Set позволяет быстро проверить принадлежность вершинам оболочки.
    // Сравниваем координаты, чтобы развернуть также точки, совпавшие
    // с вершиной, но удалённые как дубликаты внутри quickHull.
    const vertices = new Set(hull.map((p) => `${p.x},${p.y}`));
    // Меняем обе компоненты: v' = -v. Направление меняется на 180°,
    // а модуль скорости sqrt(vx² + vy²) остаётся прежним.
    // Внутренние точки продолжают движение с прежними скоростями.
    const nextPoints = moved.map((p) => reversed && vertices.has(`${p.x},${p.y}`)
        ? { ...p, vx: -p.vx, vy: -p.vy }
        : p);
    // Флаг нужен компоненту для подсчёта событий общего разворота.
    return { points: nextPoints, reversed };
}

export function createPoints(count: number, speed: number): MovingPoint[] {
    // Создаём count независимых точек внутри круга радиуса 4 с центром (0, 0).
    return Array.from({ length: count }, () => {
        // Угол положения и направление скорости выбираются независимо.
        // Поэтому точки движутся в произвольных направлениях.
        const angle = Math.random() * 2 * Math.PI;
        const direction = Math.random() * 2 * Math.PI;
        // sqrt(U) даёт равномерное распределение по площади круга:
        // площадь внутри радиуса r пропорциональна r².
        const radius = Math.sqrt(Math.random()) * 4;
        // Переводим полярные координаты в декартовы.
        // У скорости модуль равен speed, так как cos² + sin² = 1.
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
            vx: Math.cos(direction) * speed,
            vy: Math.sin(direction) * speed,
        };
    });
}
