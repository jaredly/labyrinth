import React from 'react';
import { reduceLocalStorage, useLocalStorage } from './reduceLocalStorage';
import { GridPoint } from './renderCart2';
import { reduce } from './reduce';
import { Edit } from './Edit';
import { Animate } from './Animate';
import { Game } from './Game';
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
    rings: number;
    inner?: number;
    circle?: number;
};

export const initialState: State = {
    version: 3,
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
    | { type: 'reset'; state: State }
    | { type: 'addrow'; section: number; row: number }
    | { type: 'addring'; ring: number }
    | { type: 'rotate-sections'; count: number }
    | { type: 'rmring'; ring: number }
    | { type: 'rmrow'; section: number; row: number }
    | { type: 'sections'; sections: State['sections'] };

export type Grouped = {
    slop: JSX.Element[];
    back: JSX.Element[];
    mid: JSX.Element[];
    front: (JSX.Element | null)[];
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

export type Screen = 'edit' | 'animate';

export const App2 = () => {
    const [state, dispatch] = reduceLocalStorage(
        'labyrinth-v3',
        () => initialState,
        reduce,
        migrateState,
        // true,
    );

    const [screen, setScreen] = useLocalStorage<Screen>(
        'labyrinth-screen',
        () => 'edit',
    );

    if (1 > 0) {
        return <Game />;
    }

    if (screen === 'edit') {
        return <Edit state={state} dispatch={dispatch} setScreen={setScreen} />;
    }
    return <Animate state={state} setScreen={setScreen} />;
};

export type SecionCoord = {
    section: number;
    x: number;
    y: number;
};

export const missing = '#111';

export type Rect = {
    section: number;
    top: number;
    bottom: number;
};

export const svgPos = (evt: React.MouseEvent<SVGSVGElement>) => {
    const box = evt.currentTarget.getBoundingClientRect();
    return {
        x: evt.clientX - box.left,
        y: evt.clientY - box.top,
    };
};

export const exact = (n: number) => Math.round(n) === n;

export function calcBounds(state: State) {
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

export function parsePairs(pairs: State['sections'][0]['pairs']) {
    return Object.keys(pairs)
        .filter((k) => pairs[k])
        .map(parseKey);
}

export const pairsToObject = (pairs: [Coord, Coord][]) => {
    const obj: State['sections'][0]['pairs'] = {};
    pairs.forEach((pair) => (obj[pairKey(pair[0], pair[1])] = true));
    return obj;
};

export function mergeTmp(
    slide: Slide,
    grid: GridPoint[][],
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
