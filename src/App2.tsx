import React from 'react';
import { reduceLocalStorage } from './App';
import { calcLocation, sectionMap, sectionMap2 } from './sections';
import { calcPath, calcPathParts, calcPathPartsInner } from './calcPath';
import { Addliness } from './Addliness';
export type Coord = { x: number; y: number };

export type Section = {
    rows: number;
    pairs: {
        [key: string]: boolean;
    };
};

export type State = {
    version: 3;
    // size: { _width: number; height: number };
    // pairs: { [key: string]: boolean };
    // sections: number[];

    sections: Section[];

    selection: number[];
    inner?: number;
    circle?: number;
};

export const initialState: State = {
    version: 3,
    // size: { _width: 10, height: 10 },
    selection: [],
    sections: [
        { rows: 3, pairs: {} },
        { rows: 2, pairs: {} },
        { rows: 2, pairs: {} },
        { rows: 2, pairs: {} },
    ],
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
    if (state.version < 3) {
        return initialState; // lol plz
    }
    // if (!state.version) {
    //     if ('points' in state) {
    //         const pts = state.points as Coord[];
    //         state.pairs = {};
    //         for (let i = 1; i < pts.length; i++) {
    //             state.pairs[pairKey(pts[i - 1], pts[i])] = true;
    //         }
    //     }
    //     state.version = 2;
    // }
    // if (state.version < 3) {
    //     state.sections
    // }
    return state;
};

export type Action =
    | { type: 'toggle'; pair: string; section: number }
    | { type: 'remove'; row: number }
    | { type: 'add'; row: number; high: boolean }
    | { type: 'sections'; sections: State['sections'] };

const reduce = (state: State, action: Action): State => {
    switch (action.type) {
        case 'sections':
            return { ...state, sections: action.sections };
        case 'toggle': {
            const sections = state.sections.slice();
            sections[action.section] = {
                ...state.sections[action.section],
                pairs: {
                    ...state.sections[action.section].pairs,
                    [action.pair]:
                        !state.sections[action.section].pairs[action.pair],
                },
            };
            return { ...state, sections };
        }
        // case 'add': {
        //     const pairs = parsePairs(state.pairs);
        //     return {
        //         ...state,
        //         size: { ...state.size, height: state.size.height + 1 },
        //         sections: state.sections.map((s) =>
        //             s > action.row ? s + 1 : s,
        //         ),
        //         pairs: pairsToObject(
        //             pairs.flatMap(([p1, p2]) => {
        //                 const one: [Coord, Coord][] = [
        //                     [
        //                         {
        //                             x: p1.x,
        //                             y: p1.y >= action.row ? p1.y + 1 : p1.y,
        //                         },
        //                         {
        //                             x: p2.x,
        //                             y: p1.y >= action.row ? p2.y + 1 : p2.y,
        //                         },
        //                     ],
        //                 ];
        //                 if (p1.y < action.row && p2.y >= action.row) {
        //                     one.push([
        //                         { x: p1.x, y: p1.y + 1 },
        //                         { x: p2.x, y: p2.y + 1 },
        //                     ]);
        //                 }
        //                 return one;
        //             }),
        //         ),
        //     };
        // }
    }
    console.info('unandled', action);
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
        'labyrinth-v3',
        () => initialState,
        reduce,
        migrateState,
        // true,
    );

    let mx = 0;
    let width = 5;
    let height = 0;
    state.sections.forEach(({ pairs, rows }) => {
        height += rows;

        parsePairs(pairs).forEach(([p1, p2]) => {
            if (p1.x === p2.x) {
                mx = Math.max(mx, p1.x);
            }
            width = Math.max(width, p1.x + 1, p2.x + 1);
        });
    });
    const vwidth = Math.ceil((width + 1) / 3) * 3;

    // console.log(state.sections, width);

    const W = 800;
    const aspect = vwidth / height;
    const H = W / aspect;
    const m = 100;

    const scale = W / vwidth;

    const connectors: { [key: string]: boolean } = {};

    const off = 0;

    const size = { width, height };

    const VW = 300;
    const vm = 5;
    const R = VW / 2;
    const dr = R / (width + (state.inner ?? 1) + 1);
    const r0 = state.inner ?? 1;
    // const sm = sectionMap2(state.sections, dr, state.inner ?? 1, width);

    const cartesian: Grouped = { slop: [], back: [], mid: [], front: [] };
    const circular: Grouped = { slop: [], back: [], mid: [], front: [] };

    const concol = '#666';
    const missing = '#111';

    const addLine = (
        section: number,
        yoff: number,
        p1: Coord,
        p2: Coord,
        kind: 'pair' | 'connector' | null,
    ) => {
        const sectionTheta =
            (section / state.sections.length) * Math.PI * 2 + Math.PI / 2;

        const pk = pairKey(p1, p2);
        const pos =
            kind === 'pair' ? 'front' : kind === 'connector' ? 'mid' : 'back';
        cartesian[pos].push(
            <line
                key={`${section} ${pk}`}
                data-pk={pk}
                x1={p1.x}
                x2={p2.x}
                y1={p1.y + yoff}
                y2={p2.y + yoff}
                strokeLinecap="round"
                stroke={
                    kind === 'pair'
                        ? 'blue'
                        : kind === 'connector'
                        ? concol
                        : missing
                }
                strokeWidth={0.1}
                onClick={
                    connectors[pk] == null
                        ? () => dispatch({ type: 'toggle', pair: pk, section })
                        : undefined
                }
                style={
                    connectors[pk] == null ? { cursor: 'pointer' } : undefined
                }
            />,
        );
        // console.log(sm);
        if (p1.x < width && p2.x < width) {
            circular[pos].push(
                <path
                    key={`${section} ${pk}`}
                    data-pk={pk}
                    d={calcPathPartsInner(
                        [
                            calcLocation({
                                pos: { x: width - p1.x, y: p1.y },
                                sectionTheta,
                                dr,
                                r0,
                                rows: state.sections[section].rows,
                            }),
                            calcLocation({
                                pos: { x: width - p2.x, y: p2.y },
                                sectionTheta,
                                dr,
                                r0,
                                rows: state.sections[section].rows,
                            }),
                        ],
                        VW / 2,
                        VW / 2,
                    ).paths.join(' ')}
                    strokeLinecap="round"
                    fill="none"
                    stroke={kind != null ? 'blue' : missing}
                    strokeWidth={3}
                    onClick={
                        connectors[pk] == null
                            ? () =>
                                  dispatch({
                                      type: 'toggle',
                                      pair: pk,
                                      section,
                                  })
                            : undefined
                    }
                    style={
                        connectors[pk] == null
                            ? { cursor: 'pointer' }
                            : undefined
                    }
                />,
            );
        }
    };

    const singles: { [key: string]: boolean } = {};
    state.sections.forEach(({ pairs, rows }, i) => {
        const add = ({ x, y }: Coord) => {
            const k = `${i}:${x},${y}`;
            if (singles[k]) {
                singles[k] = true; // false;
            } else if (singles[k] == null) {
                singles[k] = true;
            }
        };
        parsePairs(pairs).forEach((pair) => pair.map(add));
    });

    let yoff = 0;
    state.sections.forEach(({ pairs, rows }, i) => {
        parsePairs(pairs);

        for (let x = 0; x < vwidth; x++) {
            for (let y = 0; y < rows; y++) {
                if (y < rows - 1) {
                    addLine(
                        i,
                        yoff,
                        { x, y },
                        { x, y: y + 1 },
                        pairs[`${x},${y}:${x},${y + 1}`] ? 'pair' : null,
                    );
                }
                if (x < vwidth - 1) {
                    addLine(
                        i,
                        yoff,
                        { x, y },
                        { x: x + 1, y },
                        pairs[`${x},${y}:${x + 1},${y}`] ? 'pair' : null,
                    );
                }
            }
        }
        const oldYoff = yoff;
        yoff += rows - 1 + 0.4;

        const sectionTheta =
            (i / state.sections.length) * Math.PI * 2 + Math.PI / 2;
        const nsectionTheta =
            ((i + 1) / state.sections.length) * Math.PI * 2 + Math.PI / 2;
        console.log(singles);
        for (let x = 0; x < width; x++) {
            const k1 = `${i}:${x},${rows - 1}`;
            const k2 = `${(i + 1) % state.sections.length}:${x},${0}`;
            const needed = singles[k1] || singles[k2];
            // console.log(k1, k2, singles[k1], singles[k2]);
            // if (!needed) continue;
            circular.mid.push(
                <path
                    key={`${i} ${x} - connector`}
                    d={calcPathPartsInner(
                        [
                            calcLocation({
                                pos: { x: width - x, y: rows - 1 },
                                sectionTheta,
                                dr,
                                r0,
                                rows: state.sections[i].rows,
                            }),
                            calcLocation({
                                pos: { x: width - x, y: 0 },
                                sectionTheta: nsectionTheta,
                                dr,
                                r0,
                                rows: state.sections[
                                    (i + 1) % state.sections.length
                                ].rows,
                            }),
                        ],
                        VW / 2,
                        VW / 2,
                        true,
                    ).paths.join(' ')}
                    strokeLinecap="round"
                    fill="none"
                    stroke={needed ? '#007' : '#300'}
                    strokeWidth={3}
                />,
            );

            cartesian.mid.push(
                <line
                    key={`${i} ${x} - connector`}
                    x1={x}
                    x2={x}
                    y1={rows - 1 + oldYoff}
                    y2={yoff}
                    strokeLinecap="round"
                    stroke={needed ? '#007' : '#500'}
                    strokeWidth={needed ? 0.1 : 0.05}
                />,
            );
        }
    });

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <svg width={W + m * 2} height={H + m * 2}>
                    <g transform={`translate(${m},${m})`}>
                        <g transform={`scale(${scale})`}>
                            {ungroup(cartesian)}
                        </g>
                        {/* <Addliness
                            dispatch={dispatch}
                            state={state}
                            scale={scale}
                        /> */}
                    </g>
                </svg>
                <svg
                    width={VW + vm * 2}
                    height={VW + vm * 2}
                    style={{ marginTop: 50 - vm, backgroundColor: '#0a0a0a' }}
                >
                    <g transform={`translate(${vm},${vm})`}>
                        {ungroup(circular)}
                    </g>
                </svg>
            </div>
        </div>
    );
};

export const exact = (n: number) => Math.round(n) === n;

function parsePairs(pairs: State['sections'][0]['pairs']) {
    return Object.keys(pairs)
        .filter((k) => pairs[k])
        .map(parseKey);
}

const pairsToObject = (pairs: [Coord, Coord][]) => {
    const obj: State['sections'][0]['pairs'] = {};
    pairs.forEach((pair) => (obj[pairKey(pair[0], pair[1])] = true));
    return obj;
};
