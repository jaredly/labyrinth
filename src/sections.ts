import { Coord, State } from './App';
import { Section, parseKey } from './App2';
import { angleBetween, normalizeAngle } from './calcPath';

/*
from the sections
I need to know:
> what section am I, and what's my offset in ... units

*/

const ySectionMap = (sections: number[], height: number) => {
    const centers: { id: number; pos: number }[] = [];
    const borders: number[] = [];
    sections.forEach((s, i) => {
        if (i % 2 === 0) {
            centers.push({
                id: i === sections.length - 1 ? 0 : (i / 2) | 0,
                pos: s,
            });
        } else {
            borders.push(s);
        }
    });

    const map: { [key: number]: { section: number; offset: number } } = {};

    for (let y = 0; y < height; y++) {
        if (y > borders[0]) {
            borders.shift();
            centers.shift();
        }
        if (!centers.length) {
            console.error('Ran out of borders or corners');
            map[y] = { offset: 0, section: 0 };
            continue;
        }
        const offset = y - centers[0].pos;
        map[y] = { offset, section: centers[0].id };
    }

    // for (let i=0; i<sections.length; i++) {
    // }
    return map;
};

export type Polar = {
    t: number;
    r: number;
    x: number;
    y: number;
    offset: number;
    col: number;
    rx: number;
    ry: number;
};

export type SectionMap = {
    [pos: string]: Polar;
};

export const calcLocation = ({
    pos: { x, y },
    dr,
    r0,
    sectionTheta,
    rows,
    col,
}: {
    pos: Coord;
    r0: number;
    sectionTheta: number;
    rows: number;
    dr: number;
    col: number;
}): Polar => {
    const r = (r0 + x) * dr;
    let t = sectionTheta;
    const offset = y - (rows / 2 - 0.5);
    t += (offset * dr) / r;
    t = normalizeAngle(t);
    return {
        t,
        r,
        x,
        y,
        offset,
        col,
        rx: Math.cos(t) * r,
        ry: Math.sin(t) * r,
    };
};

export const sectionMap2 = (
    sections: Section[],
    dr: number,
    r0: number,
    width: number,
) => {
    const mapping: SectionMap = {};
    let col = 0;
    sections.forEach(({ rows, pairs }, i) => {
        const sectionTheta = (i / sections.length) * Math.PI * 2 + Math.PI / 2;
        Object.keys(pairs)
            .filter((k) => pairs[k])
            .forEach((key) => {
                const [p1, p2] = parseKey(key);
                mapping[`${i}:${p1.x},${p1.y}`] = calcLocation({
                    pos: { x: width - 1 - p1.x, y: p1.y },
                    sectionTheta,
                    dr,
                    r0,
                    rows,
                    col: col + p1.y,
                });
                mapping[`${i}:${p2.x},${p2.y}`] = calcLocation({
                    pos: { x: width - 1 - p2.x, y: p2.y },
                    sectionTheta,
                    dr,
                    r0,
                    rows,
                    col: col + p2.y,
                });
            });
        col += rows;
    });
    return mapping;
};

// export const sectionMap = (
//     sections: number[],
//     size: State['size'],
//     dr: number,
//     r0: number,
//     rev = true,
// ) => {
//     const mapping: SectionMap = {};
//     const map = ySectionMap(sections, size.height);
//     const numSections = (sections.length - 1) / 2;
//     for (let y = 0; y < size.height; y++) {
//         const { offset, section } = map[y];
//         for (let x = 0; x < size.width; x++) {
//             const r = (r0 + x) * dr;
//             let t = (section / numSections) * Math.PI * 2;

//             t += (offset * dr) / r;

//             mapping[`${x},${rev ? size.height - 1 - y : y}`] = {
//                 t: normalizeAngle(t) + Math.PI / 2,
//                 r,
//                 x,
//                 y,
//                 offset,
//                 col:
//                 // section,
//             };
//         }
//     }
//     return mapping;
// };

export const pointDistance2 = (polar: SectionMap[''][]) => {
    let dist = 0;
    return polar.map((p, i) => {
        if (i === 0) {
            return 0;
        }
        const prev = polar[i - 1];
        // const pp = sm[`${prev.x},${prev.y}`];
        // const sp = sm[`${p.x},${p.y}`];
        // if (!sp || !pp) {
        //     return dist;
        // }

        if (prev.y === p.y) {
            dist += Math.abs(prev.r - p.r);
            return dist;
        }

        const cw = p.y > prev.y;
        const delta = angleBetween(p.t, prev.t, cw);

        dist += delta * p.r;
        return dist;
    });
};

export const pointDistance = (
    points: Coord[],
    sm: SectionMap,
    dr: number,
    size: State['size'],
) => {
    let dist = 0;
    return points
        .map(({ x, y }) => ({ x: size.width - 1 - x, y })) // : size.height - 1 - y}))

        .map((p, i) => {
            if (i === 0) {
                return 0;
            }
            const prev = points[i - 1];
            const pp = sm[`${prev.x},${prev.y}`];
            const sp = sm[`${p.x},${p.y}`];
            if (!sp || !pp) {
                return dist;
            }

            if (pp.y === sp.y) {
                dist += Math.abs(pp.x - sp.x) * dr;
                return dist;
            }

            const cw = p.y > prev.y;
            const delta = angleBetween(sp.t, pp.t, cw);

            dist += delta * sp.r;
            return dist;
        });
};
