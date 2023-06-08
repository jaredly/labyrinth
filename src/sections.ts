import { Coord, State } from './App';
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

export type SectionMap = {
    [pos: string]: {
        t: number;
        r: number;
        x: number;
        y: number;
        offset: number;
        section: number;
    };
};

export const sectionMap = (
    sections: number[],
    size: State['size'],
    dr: number,
    r0: number,
) => {
    const mapping: SectionMap = {};
    const map = ySectionMap(sections, size.height);
    const numSections = (sections.length - 1) / 2;
    for (let y = 0; y < size.height; y++) {
        const { offset, section } = map[y];
        for (let x = 0; x < size.width; x++) {
            const r = (r0 + x) * dr;
            let t = (section / numSections) * Math.PI * 2;

            t += (offset * dr) / r;

            mapping[`${x},${size.height - 1 - y}`] = {
                t: normalizeAngle(t) + Math.PI / 2,
                r,
                x,
                y,
                offset,
                section,
            };
        }
    }
    return mapping;
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
