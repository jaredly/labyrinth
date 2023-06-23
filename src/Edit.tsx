import React, { useRef, useState } from 'react';
import { useLocalStorage } from './reduceLocalStorage';
import { renderCircular } from './renderCircular';
import { organizeLine } from './organizeLine';
import { GridPoint, buildGrid, renderCart2 } from './renderCart2';
import { ExportButton, ExportJSONButton } from './ExportButton';
import { useDropStateTarget } from './useDropTarget';
import {
    State,
    Action,
    calcBounds,
    Slide,
    mergeTmp,
    Coord,
    parsePairs,
    migrateState,
    Screen,
} from './App2';

export const Edit = ({
    state,
    dispatch,
    setScreen,
}: {
    state: State;
    setScreen: (s: Screen) => void;
    dispatch: React.Dispatch<Action>;
}) => {
    var bounds = calcBounds(state);

    const [hoverPoint, setHoverPoint] = useState(null as null | GridPoint);

    const [slide, setSlide] = useState(null as Slide | null);

    const grid: GridPoint[][] = buildGrid(state.sections, bounds.vwidth);

    const sections = slide
        ? mergeTmp(slide, grid, state.sections)
        : state.sections;

    const singles: { [key: string]: number } = calculateSingles(sections);

    const ref = useRef<SVGSVGElement>(null);
    const cref = useRef<SVGSVGElement>(null);

    const lines = organizeLine(state.rings, sections, singles);
    // console.log('line', line);
    const cartesian = renderCart2(
        cref,
        state,
        grid,
        setSlide,
        sections,
        bounds,
        slide,
        singles,
        dispatch,
        hoverPoint,
        setHoverPoint,
    );
    const [dragging, callbacks] = useDropStateTarget((state) => {
        if (state) {
            dispatch({ type: 'reset', state });
        }
    }, migrateState);
    const [color, setColor] = useLocalStorage('show-color', () => false);

    return (
        <div {...callbacks}>
            <button onClick={() => setScreen('animate')}>Animate</button>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                }}
            >
                {cartesian}
                {renderCircular(
                    ref,
                    state,
                    bounds.width,
                    dispatch,
                    sections,
                    singles,
                    hoverPoint,
                    lines,
                    color,
                )}
            </div>
            <div>
                <button onClick={() => setColor(!color)}>
                    {color ? 'Hide color' : 'Show color'}
                </button>
                <button onClick={() => dispatch({ type: 'clear' })}>
                    Clear
                </button>
                <button
                    onClick={() =>
                        dispatch({ type: 'rotate-sections', count: -1 })
                    }
                >
                    Left
                </button>
                <button
                    onClick={() =>
                        dispatch({ type: 'rotate-sections', count: 1 })
                    }
                >
                    Right
                </button>
                <ExportButton csvg={cref} svg={ref} state={state} />
                <ExportJSONButton state={state} />
                {hoverPoint
                    ? `${hoverPoint.section}:${hoverPoint.ring},${hoverPoint.row}`
                    : ''}
            </div>
        </div>
    );
};

export function calculateSingles(
    sections: import('/Users/jared/clone/art/labyrinth/src/App2').Section[],
) {
    const singles: { [key: string]: number } = {};
    sections.forEach(({ pairs }, i) => {
        const add = ({ x, y }: Coord) => {
            const k = `${i}:${x},${y}`;
            if (singles[k]) {
                singles[k]++;
            } else if (singles[k] == null) {
                singles[k] = 1;
            }
        };
        parsePairs(pairs).forEach((pair) => pair.map(add));
    });
    return singles;
}
