import React from 'react';
import { reduceLocalStorage } from './App';
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

type Action = { type: 'toggle'; pair: string };

const reduce = (state: State, action: Action): State => {
    switch (action.type) {
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
    const m = 50;

    const lines = [];

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

    state.sections.forEach((s, i) => {
        if (i % 2 === 1) {
            s = state.size.height - 1 - s;
            for (let x = 0; x < mx + 1; x++) {
                const k = pairKey({ x, y: s - 0.5 }, { x, y: s + 0.5 });
                connectors[k] = true;
            }
        }
    });

    const off = 0;

    for (let x = 0; x < state.size.width; x++) {
        for (let y = 0; y < state.size.height; y++) {
            if (y < state.size.height - 1) {
                const pk = pairKey({ x, y }, { x, y: y + 1 });
                lines.push(
                    <line
                        x1={x * scale}
                        x2={x * scale}
                        y1={(y + off) * scale}
                        y2={(y + (1 - off)) * scale}
                        strokeLinecap="round"
                        stroke={
                            state.pairs[pk]
                                ? 'red'
                                : connectors[pk]
                                ? '#aaa'
                                : 'rgba(255,255,255,0.1)'
                        }
                        strokeWidth={5}
                        onClick={() => dispatch({ type: 'toggle', pair: pk })}
                        style={{ cursor: 'pointer' }}
                    />,
                );
            }
            if (x < state.size.width - 1) {
                const pk = pairKey({ x, y }, { x: x + 1, y });
                lines.push(
                    <line
                        x1={(x + off) * scale}
                        x2={(x + (1 - off)) * scale}
                        y1={y * scale}
                        y2={y * scale}
                        strokeLinecap="round"
                        stroke={
                            state.pairs[pk]
                                ? 'red'
                                : connectors[pk]
                                ? '#aaa'
                                : 'rgba(255,255,255,0.1)'
                        }
                        strokeWidth={5}
                        onClick={() => dispatch({ type: 'toggle', pair: pk })}
                        style={{ cursor: 'pointer' }}
                    />,
                );
            }
        }
    }

    return (
        <div>
            <svg width={W + m * 2} height={H + m * 2}>
                <g transform={`translate(${m},${m})`}>{lines}</g>
            </svg>
        </div>
    );
};
