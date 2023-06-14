import React from 'react';
import { reduceLocalStorage } from './App';
import { sectionMap } from './sections';
import { calcPath, calcPathParts } from './calcPath';
export type Coord = { x: number; y: number };

export type State = {
    version: 2;
    size: { width: number; height: number };
    pairs: { [key: string]: boolean };
    selection: number[];
    sections: number[];
    inner?: number;
    circle?: number;
};

export const initialState: State = {
    version: 2,
    size: { width: 10, height: 10 },
    pairs: {},
    selection: [],
    sections: [-0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 10.5],
};

const pki = (one: Coord, two: Coord) => `${one.x},${one.y}:${two.x},${two.y}`;

export const pairKey = (one: Coord, two: Coord) => {
    if (one.x !== two.x) {
        return one.x < two.x ? pki(one, two) : pki(two, one);
    }
    return one.y < two.y ? pki(one, two) : pki(two, one);
};

export const parseKey = (key: string) =>
    key
        .split(':')
        .map((m) => m.split(',').map(Number))
        .map(([x, y]) => ({ x, y })) as [Coord, Coord];

export const migrateState = (state: State) => {
    if (!state.version) {
        if ('points' in state) {
            const pts = state.points as Coord[];
            state.pairs = {};
            for (let i = 1; i < pts.length; i++) {
                state.pairs[pairKey(pts[i - 1], pts[i])] = true;
            }
        }
        state.version = 2;
    }
    return state;
};

type Action =
    | { type: 'toggle'; pair: string }
    | { type: 'sections'; sections: State['sections'] };

const reduce = (state: State, action: Action): State => {
    switch (action.type) {
        case 'sections':
            return { ...state, sections: action.sections };
        case 'toggle':
            return {
                ...state,
                pairs: {
                    ...state.pairs,
                    [action.pair]: !state.pairs[action.pair],
                },
            };
    }
    return state;
};

type Grouped = {
    slop: JSX.Element[];
    back: JSX.Element[];
    mid: JSX.Element[];
    front: JSX.Element[];
};

const ungroup = (g: Grouped) => [...g.slop, ...g.back, ...g.mid, ...g.front];

export const App2 = () => {
    const [state, dispatch] = reduceLocalStorage(
        'labyrinth-v2',
        () => initialState,
        reduce,
        migrateState,
    );
    const W = 800;
    const aspect = state.size.width / state.size.height;
    const H = W / aspect;
    const m = 100;

    const scale = W / state.size.width;

    const connectors: { [key: string]: boolean } = {};
    const pairs = Object.keys(state.pairs)
        .filter((k) => state.pairs[k])
        .map(parseKey);
    let mx = 0;
    pairs.forEach(([p1, p2]) => {
        if (p1.x === p2.x) {
            mx = Math.max(mx, p1.x);
        }
    });

    const off = 0;

    const validSections = state.sections.filter(
        (s) => s >= -0.5 && s <= state.size.height - 1 + 0.5,
    );
    console.log(state.sections, validSections);

    const VW = 300;
    const vm = 5;
    const R = VW / 2;
    const dr = R / (state.size.width + (state.inner ?? 0));
    const sm = sectionMap(validSections, state.size, dr, state.inner ?? 1);

    const lines: Grouped = { slop: [], back: [], mid: [], front: [] };
    const circles: Grouped = { slop: [], back: [], mid: [], front: [] };

    for (let i = -0.5; i < state.size.height + 0.5; i += 1) {
        const idx = validSections.indexOf(i);
        lines.front.push(
            <circle
                key={i}
                cx={-50}
                cy={scale * i}
                data-i={i}
                r={8}
                fill={idx !== -1 ? (idx % 2 === 0 ? 'red' : 'blue') : 'gray'}
                onClick={(evt) => {
                    evt.stopPropagation();
                    evt.preventDefault();
                    let s = validSections.slice();
                    if (s.includes(i)) {
                        s = s.filter((n) => n !== i);
                    } else {
                        s.push(i);
                        s.sort((a, b) => a - b);
                    }
                    dispatch({ type: 'sections', sections: s });
                }}
                style={{ cursor: 'pointer' }}
            />,
        );
    }

    validSections.forEach((s, i) => {
        if (i % 2 === 1) {
            s = state.size.height - 1 - s;
            for (let x = 0; x < state.size.width; x++) {
                const k = pairKey({ x, y: s - 0.5 }, { x, y: s + 0.5 });
                connectors[k] = x < mx + 1;
            }
        }
    });

    const concol = '#666';
    const missing = '#111';

    const addLine = (p1: Coord, p2: Coord) => {
        const pk = pairKey(p1, p2);
        const pos = state.pairs[pk] ? 'front' : connectors[pk] ? 'mid' : 'back';
        if (connectors[pk] == null) {
            lines.slop.push(
                <line
                    x1={p1.x * scale}
                    x2={p2.x * scale}
                    y1={p1.y * scale}
                    y2={p2.y * scale}
                    data-pk={pk}
                    strokeLinecap="round"
                    stroke={'transparent'}
                    strokeWidth={50}
                    onClick={() => dispatch({ type: 'toggle', pair: pk })}
                    style={{ cursor: 'pointer' }}
                />,
            );
        }
        lines[pos].push(
            <line
                data-pk={pk}
                x1={p1.x * scale}
                x2={p2.x * scale}
                y1={p1.y * scale}
                y2={p2.y * scale}
                strokeLinecap="round"
                stroke={
                    state.pairs[pk] ? 'red' : connectors[pk] ? concol : missing
                }
                strokeWidth={10}
                onClick={
                    connectors[pk] == null
                        ? () => dispatch({ type: 'toggle', pair: pk })
                        : undefined
                }
                style={
                    connectors[pk] == null ? { cursor: 'pointer' } : undefined
                }
            />,
        );
        circles[pos].push(
            <path
                data-pk={pk}
                d={calcPathParts(
                    [p1, p2],
                    state.size,
                    sm,
                    VW / 2,
                    VW / 2,
                ).paths.join(' ')}
                strokeLinecap="round"
                stroke={state.pairs[pk] || connectors[pk] ? 'blue' : missing}
                strokeWidth={5}
                onClick={
                    connectors[pk] == null
                        ? () => dispatch({ type: 'toggle', pair: pk })
                        : undefined
                }
                style={
                    connectors[pk] == null ? { cursor: 'pointer' } : undefined
                }
            />,
        );
    };

    for (let x = 0; x < state.size.width; x++) {
        for (let y = 0; y < state.size.height; y++) {
            if (y < state.size.height - 1) {
                addLine({ x, y }, { x, y: y + 1 });
            }
            if (x < state.size.width - 1) {
                addLine({ x, y }, { x: x + 1, y });
            }
        }
    }

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <svg width={W + m * 2} height={H + m * 2}>
                    <g transform={`translate(${m},${m})`}>{ungroup(lines)}</g>
                </svg>
                <svg
                    width={VW + vm * 2}
                    height={VW + vm * 2}
                    style={{ marginTop: 50 - vm }}
                >
                    <g transform={`translate(${vm},${vm})`}>
                        {ungroup(circles)}
                    </g>
                </svg>
            </div>
        </div>
    );
};
