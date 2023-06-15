import React, { useCallback, useState } from 'react';
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
    | { type: 'remove'; pairs: { section: number; pair: string }[] }
    | { type: 'slide'; slide: Slide[] }
    | { type: 'clear' }
    | { type: 'add'; row: number; high: boolean }
    | { type: 'sections'; sections: State['sections'] };

const reduce = (state: State, action: Action): State => {
    switch (action.type) {
        case 'clear':
            return {
                ...state,
                sections: state.sections.map((s) => ({ ...s, pairs: {} })),
            };
        case 'sections':
            return { ...state, sections: action.sections };
        case 'remove': {
            const sections = state.sections.map((s) => ({
                ...s,
                pairs: { ...s.pairs },
            }));
            action.pairs.forEach(({ section, pair }) => {
                delete sections[section].pairs[pair];
            });
            return { ...state, sections };
        }
        case 'slide': {
            const sections = state.sections.map((s) => ({
                ...s,
                pairs: { ...s.pairs },
            }));
            for (let i = 1; i < action.slide.length; i++) {
                const last = action.slide[i - 1];
                const one = action.slide[i];
                if (last.section === one.section) {
                    sections[last.section].pairs[pairKey(last, one)] = true;
                }
            }
            return { ...state, sections };
        }
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

    const [slide, setSlide] = useState(
        null as
            | null
            | { type: 'add'; items: Slide[] }
            | { type: 'remove'; pairs: { pair: string; section: number }[] },
    );

    const shrink = 0.1;

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
        const xs = p1.x === p2.x ? 0 : shrink;
        const ys = p1.y === p2.y ? 0 : shrink;
        cartesian[pos].push(
            <line
                key={`${section} ${pk}`}
                data-pk={pk}
                x1={p1.x + xs}
                x2={p2.x - xs}
                y1={p1.y + yoff + ys}
                y2={p2.y + yoff - ys}
                strokeLinecap="round"
                stroke={
                    kind === 'pair'
                        ? 'blue'
                        : kind === 'connector'
                        ? concol
                        : missing
                }
                strokeWidth={0.1}
                onMouseMove={() => {
                    setSlide((slide) =>
                        slide?.type === 'remove'
                            ? {
                                  ...slide,
                                  pairs: [
                                      ...slide.pairs,
                                      { section, pair: pk },
                                  ],
                              }
                            : slide,
                    );
                }}
                // onClick={
                //     connectors[pk] == null
                //         ? () => dispatch({ type: 'toggle', pair: pk, section })
                //         : undefined
                // }
                // onMouseDown={onMove(section, pk, true)}
                // onMouseMove={onMove(section, pk)}
                // onMouseOut={onMouseOut(section, pk)}
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

    const sections = slide ? mergeTmp(slide, state.sections) : state.sections;

    const singles: { [key: string]: boolean } = {};
    sections.forEach(({ pairs, rows }, i) => {
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

    const rects: { section: number; top: number; bottom: number }[] = [];

    let yoff = 0;
    sections.forEach(({ pairs, rows }, i) => {
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
        if (
            slide?.type === 'add' &&
            slide.items[slide.items.length - 1].section === i
        ) {
            cartesian.front.push(
                <circle
                    cx={slide.items[slide.items.length - 1].x}
                    cy={slide.items[slide.items.length - 1].y + yoff}
                    r={0.2}
                    fill="red"
                    key="slide"
                />,
            );
        }
        const between = 0.4;

        const oldYoff = yoff;
        yoff += rows - 1 + between;

        rects.push({
            section: i,
            top: oldYoff,
            bottom: yoff - between,
        });

        const sectionTheta = (i / sections.length) * Math.PI * 2 + Math.PI / 2;
        const nsectionTheta =
            ((i + 1) / sections.length) * Math.PI * 2 + Math.PI / 2;
        // console.log(singles);
        for (let x = 0; x < width; x++) {
            const k1 = `${i}:${x},${rows - 1}`;
            const k2 = `${(i + 1) % sections.length}:${x},${0}`;
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
                                rows: sections[i].rows,
                            }),
                            calcLocation({
                                pos: { x: width - x, y: 0 },
                                sectionTheta: nsectionTheta,
                                dr,
                                r0,
                                rows: sections[(i + 1) % sections.length].rows,
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
                <svg
                    width={W + m * 2}
                    height={H + m * 2}
                    onMouseDown={(evt) => {
                        if (evt.shiftKey) {
                            setSlide({ type: 'remove', pairs: [] });
                        } else {
                            const pos = svgPos(evt);
                            if (pos.x >= m) {
                                const found = closest(
                                    relPos(pos, m, scale),
                                    rects,
                                );
                                setSlide(
                                    found
                                        ? { type: 'add', items: [found] }
                                        : null,
                                );
                            }
                        }
                    }}
                    onMouseMove={(evt) => {
                        const pos = svgPos(evt);
                        if (pos.x >= m) {
                            setSlide((slide) => {
                                if (!slide || slide.type !== 'add')
                                    return slide;
                                const found = closest(
                                    relPos(pos, m, scale),
                                    rects,
                                );
                                if (!found) return slide;
                                const at = slide.items.findIndex(
                                    (s) =>
                                        s.section === found.section &&
                                        s.x === found.x &&
                                        s.y === found.y,
                                );
                                if (at === slide.items.length - 1) {
                                    return slide;
                                }
                                if (at !== -1) {
                                    return {
                                        type: 'add',
                                        items: slide.items.slice(0, at + 1),
                                    };
                                }
                                const last =
                                    slide.items[slide.items.length - 1];
                                if (neighboring(last, found, state.sections)) {
                                    return {
                                        type: 'add',
                                        items: [...slide.items, found],
                                    };
                                }
                                return slide;
                            });
                        }
                    }}
                    onMouseUp={(evt) => {
                        if (slide?.type === 'add') {
                            dispatch({
                                type: 'slide',
                                slide: slide.items,
                            });
                        } else if (slide?.type === 'remove') {
                            dispatch({
                                type: 'remove',
                                pairs: slide.pairs,
                            });
                        }
                        setSlide(null);
                    }}
                >
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
            <div>
                <button onClick={() => dispatch({ type: 'clear' })}>
                    Clear
                </button>
            </div>
            {JSON.stringify(slide)}
        </div>
    );
};

export type Slide = {
    section: number;
    x: number;
    y: number;
};

const neighboring = (one: Slide, two: Slide, sections: Section[]) => {
    if (one.x !== two.x) {
        return (
            one.section === two.section &&
            one.y === two.y &&
            Math.abs(one.x - two.x) === 1
        );
    }
    if (one.section !== two.section) {
        // one then two
        if (one.section === two.section - 1) {
            return one.y === sections[one.section].rows - 1 && two.y === 0;
        }
        // two then one
        if (one.section === two.section + 1) {
            return two.y === sections[two.section].rows - 1 && one.y === 0;
        }
        if (one.section === 0 && two.section === sections.length - 1) {
            return two.y === sections[two.section].rows - 1 && one.y === 0;
        }
        if (two.section === 0 && one.section === sections.length - 1) {
            return one.y === sections[one.section].rows - 1 && two.y === 0;
        }
        return false;
    }
    return Math.abs(one.y - two.y) === 1;
};

export type Rect = {
    section: number;
    top: number;
    bottom: number;
};

const closest = (
    pos: Coord,
    rects: Rect[],
    // m: number,
    // scale: number,
) => {
    for (let rect of rects) {
        if (pos.y >= rect.top && pos.y <= rect.bottom) {
            return {
                section: rect.section,
                x: Math.round(pos.x),
                y: Math.round(pos.y - rect.top),
            };
        }
    }
    return null;
};

const svgPos = (evt: React.MouseEvent<SVGSVGElement>) => {
    const box = evt.currentTarget.getBoundingClientRect();
    return {
        x: evt.clientX - box.left,
        y: evt.clientY - box.top,
    };
};

export const exact = (n: number) => Math.round(n) === n;

function relPos(
    pos: { x: number; y: number },
    m: number,
    scale: number,
): Coord {
    return {
        x: (pos.x - m) / scale,
        y: (pos.y - m) / scale,
    };
}

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

function mergeTmp(
    slide:
        | { items: Slide[]; type: 'add' }
        | { type: 'remove'; pairs: { pair: string; section: number }[] },
    sections: Section[],
) {
    sections = sections.map(({ pairs, rows }) => ({
        pairs: { ...pairs },
        rows,
    }));
    if (slide.type === 'add') {
        for (let i = 1; i < slide.items.length; i++) {
            const last = slide.items[i - 1];
            const one = slide.items[i];
            if (last.section === one.section) {
                sections[last.section].pairs[pairKey(last, one)] = true;
            }
        }
    } else {
        slide.pairs.forEach(({ pair, section }) => {
            sections[section].pairs[pair] = false;
        });
    }
    // Object.values(tmpToggle).forEach(({ section, pair, newv }) => {
    //     sections[section].pairs[pair] = newv;
    // });
    return sections;
}
