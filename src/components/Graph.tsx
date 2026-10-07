import { GraphingCalculator } from "desmos-react";
import { useEffect, useRef, useState } from "react";
import type { GraphProps } from "../types/types";

const Graph = ({ expressions, mathBounds, scale }: GraphProps) => {
    const [calculator, setCalculator] = useState<Desmos.Calculator | null>(
        null,
    );
    const expressionIdsRef = useRef<string[]>([]);

    useEffect(() => {
        if (!calculator) return;

        const nextIds = new Set(
            expressions
                .map(({ id }) => id)
                .filter((id): id is string => Boolean(id)),
        );

        expressionIdsRef.current
            .filter((id) => !nextIds.has(id))
            .forEach((id) => calculator.removeExpression({ id }));

        calculator.setExpressions(expressions);
        expressionIdsRef.current = [...nextIds];

        if (mathBounds) {
            calculator.setMathBounds(mathBounds);
        } else if (scale && scale > 0) {
            calculator.setMathBounds({
                left: -scale,
                right: scale,
                bottom: -scale,
                top: scale,
            });
        }
    }, [calculator, expressions, mathBounds, scale]);

    return (
        <GraphingCalculator
            ref={setCalculator}
            keypad={false}
            settingsMenu={false}
            zoomButtons={true}
            expressions={false}
            attributes={{ className: "calculator" }}
        />
    );
};

export default Graph;
