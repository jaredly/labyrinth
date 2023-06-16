import React, { useState } from 'react';
import { reduceLocalStorage } from './App';
import { renderCircular } from './renderCircular';
import { renderCartesian } from './renderCartesian';
import { GridPoint, buildGrid, renderCart2 } from './renderCart2';
export type Coord = { x: number; y: number };

export type Section = {
    rows: number;
    pairs: {
        [key: string]: boolean;
    };
};

export type State = {
    version: 3;
    sections: Section[];
    selection: number[];
    rings: number;
    inner?: number;
    circle?: number;
};

export const initialState: State = {
    version: 3,
    selection: [],
    rings: 7,
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
    | { type: 'slide'; slide: SecionCoord[] }
    | { type: 'clear' }
    | { type: 'add'; section: number; row: number }
    | { type: 'addring'; ring: number }
    | { type: 'rmring'; ring: number }
    | { type: 'rmrow'; section: number; row: number }
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
        case 'addring': {
            return {
                ...state,
                rings: state.rings + 1,
                sections: state.sections.map((s) => {
                    const pairs = parsePairs(s.pairs).map(
                        ([p1, p2]): [Coord, Coord] =>
                            p1.x >= action.ring
                                ? [
                                      { x: p1.x + 1, y: p1.y },
                                      { x: p2.x + 1, y: p2.y },
                                  ]
                                : [p1, p2],
                    );
                    return { pairs: pairsToObject(pairs), rows: s.rows };
                }),
            };
        }
        case 'rmring': {
            return {
                ...state,
                rings: state.rings - 1,
                sections: state.sections.map((s) => {
                    const pairs = parsePairs(s.pairs).map(
                        ([p1, p2]): [Coord, Coord] =>
                            p1.x >= action.ring
                                ? [
                                      { x: p1.x - 1, y: p1.y },
                                      { x: p2.x - 1, y: p2.y },
                                  ]
                                : [p1, p2],
                    );
                    return { pairs: pairsToObject(pairs), rows: s.rows };
                }),
            };
        }
        case 'rmrow': {
            return {
                ...state,
                sections: state.sections.map((s, i) => {
                    if (i !== action.section) {
                        return s;
                    }
                    const pairs = parsePairs(s.pairs).map(
                        ([p1, p2]): [Coord, Coord] =>
                            p1.y >= action.row
                                ? [
                                      { y: p1.y - 1, x: p1.x },
                                      { y: p2.y - 1, x: p2.x },
                                  ]
                                : [p1, p2],
                    );
                    return { pairs: pairsToObject(pairs), rows: s.rows - 1 };
                }),
            };
        }
        case 'add': {
            return {
                ...state,
                sections: state.sections.map((s, i) => {
                    if (i !== action.section) {
                        return s;
                    }
                    const pairs = parsePairs(s.pairs).map(
                        ([p1, p2]): [Coord, Coord] =>
                            p1.y >= action.row
                                ? [
                                      { y: p1.y + 1, x: p1.x },
                                      { y: p2.y + 1, x: p2.x },
                                  ]
                                : [p1, p2],
                    );
                    return { pairs: pairsToObject(pairs), rows: s.rows + 1 };
                }),
            };
        }
    }
    console.info('unandled', action);
    return state;
};

export type Grouped = {
    slop: JSX.Element[];
    back: JSX.Element[];
    mid: JSX.Element[];
    front: JSX.Element[];
};

export const ungroup = (g: Grouped) => [
    ...g.slop,
    ...g.back,
    ...g.mid,
    ...g.front,
];

export type Slide =
    | {
          type: 'add';
          items: SecionCoord[];
      }
    | {
          type: 'add2';
          items: Coord[];
      }
    | {
          type: 'remove';
          pairs: {
              pair: string;
              section: number;
          }[];
      };

export const App2 = () => {
    const [state, dispatch] = reduceLocalStorage(
        'labyrinth-v3',
        () => initialState,
        reduce,
        migrateState,
        // true,
    );

    var bounds = calcBounds(state);

    if (!state.rings) {
        state.rings = 7;
    }

    const [slide, setSlide] = useState(null as Slide | null);

    const grid: GridPoint[][] = buildGrid(state.sections, bounds.vwidth);

    const sections = slide
        ? mergeTmp(slide, grid, state.sections)
        : state.sections;

    const singles: { [key: string]: boolean } = {};
    sections.forEach(({ pairs }, i) => {
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

    const cartesian = renderCart2(
        state,
        grid,
        setSlide,
        sections,
        bounds,
        slide,
        singles,
        dispatch,
    );

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                {cartesian}
                {renderCircular(
                    state,
                    bounds.width,
                    dispatch,
                    sections,
                    singles,
                )}
            </div>
            <div>
                <button onClick={() => dispatch({ type: 'clear' })}>
                    Clear
                </button>
            </div>
        </div>
    );
};

export type SecionCoord = {
    section: number;
    x: number;
    y: number;
};

export const missing = '#111';

export const neighboring = (
    one: SecionCoord,
    two: SecionCoord,
    sections: Section[],
) => {
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

export const closest = (
    pos: Coord,
    rects: Rect[],
    // m: number,
    // scale: number,
) => {
    for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        if (i < rects.length - 1) {
            const next = (rect.bottom + rects[i + 1].top) / 2;
            if (pos.y >= next) {
                continue;
            }
        }
        return {
            section: rect.section,
            x: Math.round(pos.x),
            y: Math.round(pos.y - rect.top),
        };
    }
    return null;
};

export const svgPos = (evt: React.MouseEvent<SVGSVGElement>) => {
    const box = evt.currentTarget.getBoundingClientRect();
    return {
        x: evt.clientX - box.left,
        y: evt.clientY - box.top,
    };
};

export const exact = (n: number) => Math.round(n) === n;

function calcBounds(state: State) {
    let mx = 0;
    let width = state.rings ?? 7;
    let rowTotal = 0;
    state.sections.forEach(({ pairs, rows }) => {
        rowTotal += rows;

        parsePairs(pairs).forEach(([p1, p2]) => {
            if (p1.x === p2.x) {
                mx = Math.max(mx, p1.x);
            }
            // width = Math.max(width, p1.x + 1, p2.x + 1);
        });
    });
    const vwidth = width; // Math.ceil((width + 2) / 3) * 3;
    return { vwidth, width, mx, rowTotal };
}

export function relPos(
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

function mergeTmp(slide: Slide, grid: GridPoint[][], sections: Section[]) {
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
    } else if (slide.type === 'add2') {
        for (let i = 1; i < slide.items.length; i++) {
            const lg = slide.items[i - 1];
            const og = slide.items[i];
            const last = grid[lg.x][lg.y];
            const one = grid[og.x][og.y];
            if (last.section === one.section) {
                sections[last.section].pairs[
                    pairKey(
                        { x: last.ring, y: last.row },
                        { x: one.ring, y: one.row },
                    )
                ] = true;
            }
        }
    } else if (slide.type === 'remove') {
        slide.pairs.forEach(({ pair, section }) => {
            sections[section].pairs[pair] = false;
        });
    }
    return sections;
}
