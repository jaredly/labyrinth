import React from 'react';
import { State, W, H, Coord } from './App';
import { Polar, SectionMap, calcLocation, calcPolar } from './sections';
import { Section } from './App2';

const closeEnough = (a: number, b: number) => Math.abs(a - b) < 0.001;

export const showColor = (
    points: Coord[],
    size: State['size'],
    sectionMap: SectionMap,
    mx: number,
    my: number,
    dists: number[],
    dr: number,
    cols: number,
) => {
    const { paths, polar } = calcPathParts(
        points,
        size,
        sectionMap,
        mx,
        my,
        cols,
    );

    const cx = (W - mx * 2) / 2;
    const cy = (H - my * 2) / 2;
    const max = dists[dists.length - 1];

    return paths.map((item, i): JSX.Element | null => {
        if (i === 0) {
            return null;
        }
        const pos = polar[i - 1];
        const x = Math.cos(pos.t) * pos.r + cx;
        const y = Math.sin(pos.t) * pos.r + cy;
        return (
            <path
                d={`M${x} ${y} ${item}`}
                strokeWidth={dr}
                strokeLinecap="round"
                strokeLinejoin="round"
                stroke={rainbow(dists[i] / max)}
                fill="none"
            />
        );
    });
};

export const calcPath = (
    pairs: State['pairs'],
    size: State['size'],
    sectionMap: SectionMap,
    cx: number,
    cy: number,
    cols: number,
): string => {
    // const cx = (W - mx * 2) / 2;
    // const cy = (H - my * 2) / 2;

    return pairs
        .map((pair) =>
            calcPathParts(pair, size, sectionMap, cx, cy, cols).paths.join(' '),
        )
        .join(' ');
};

export const calcPathParts = (
    points: Coord[],
    size: State['size'],
    sectionMap: SectionMap,
    cx: number,
    cy: number,
    cols: number,
): { paths: string[]; polar: (typeof sectionMap)[''][] } => {
    const polar = points
        .map(({ x, y }) => ({ x: size.width - 1 - x, y }))
        .map(({ x, y }) => `${x},${y}`)
        .map((key) => sectionMap[key])
        .filter(Boolean);

    return { paths: calcPathPartsInner(polar, cx, cy, cols), polar };
};

export const showColor2 = (
    polar: SectionMap[''][],
    cx: number,
    cy: number,
    dists: number[],
    dr: number,
    cols: number,
    rounded?: {
        dr: number;
        r0: number;
        sections: Section[];
    },
) => {
    const paths = calcPathPartsInner(polar, cx, cy, cols, rounded, true);

    const max = dists[dists.length - 1];

    return paths.map((item, i): JSX.Element | null => {
        if (i === 0) {
            return null;
        }
        const pos = polar[i - 1];
        const x = Math.cos(pos.t) * pos.r + cx;
        const y = Math.sin(pos.t) * pos.r + cy;
        return (
            <path
                d={item}
                strokeWidth={dr}
                strokeLinecap="round"
                strokeLinejoin="round"
                stroke={rainbow(dists[i] / max)}
                fill="none"
            />
        );
    });
};

export const calcPathPartsInner = (
    polar: Polar[],
    cx: number,
    cy: number,
    cols: number,
    rounded?: {
        dr: number;
        r0: number;
        sections: Section[];
    },
    moveInBetween = false,
): string[] => {
    // console.log('ya', polar.length);
    let ldest = null as null | Coord;
    const paths = polar.map((pos, i) => {
        let x = pos.rx + cx;
        let y = pos.ry + cy;
        if (i == 0) {
            ldest = { x, y };
            return `M${x} ${y}`;
        }
        const prefix = moveInBetween ? `M${ldest!.x} ${ldest!.y}` : '';

        const prev = polar[i - 1];
        if (prev.y === pos.y) {
            if (rounded != null && i < polar.length - 1) {
                const next = polar[i + 1];
                if (next.y !== pos.y) {
                    const p1 = calcPolar(
                        {
                            pos: {
                                x: pos.x + 0.5 * (prev.r > pos.r ? 1 : -1),
                                y: pos.y,
                            },
                            col: pos.col,
                            section: pos.section,
                        },
                        rounded,
                    );
                    const p2 = calcPolar(
                        {
                            pos: {
                                x: pos.x,
                                y:
                                    pos.y +
                                    0.5 *
                                        (isClockwise(next, pos, cols) ? 1 : -1),
                            },
                            col: pos.col,
                            section: pos.section,
                        },
                        rounded,
                    );
                    ldest = { x: p2.rx + cx, y: p2.ry + cy };
                    // const r =
                    //     pos.r + (rounded.dr / 2) * (prev.r > pos.r ? 1 : -1);
                    // let ncw = isClockwise(next, pos, cols);
                    // if (next.y < pos.y) {
                    //     ncw = !ncw;
                    // }
                    // let t = pos.t + (rounded * (ncw ? 1 : -1)) / pos.r;
                    return (
                        `${prefix}L${p1.rx + cx} ${p1.ry + cy}` +
                        `Q${x} ${y} ${p2.rx + cx} ${p2.ry + cy}`
                    );
                    //  +
                    // `A ${rounded} ${rounded} 0 0 ${ncw ? '0' : '1'} ${
                    //     Math.cos(t) * pos.r + cx
                    // } ${Math.sin(t) * pos.r + cy}`
                }
            }
            ldest = { x, y };
            return `${prefix}L${x} ${y}`;
        }
        const cw = isClockwise(pos, prev, cols);
        // console.log(pos.col, prev.col);
        const delta = angleBetween(pos.t, prev.t, cw);

        const largeArcFlag = Math.abs(delta) < Math.PI;
        const sweepFlag = cw;

        let extra = '';
        if (rounded && i < polar.length - 1 && polar[i + 1].y === pos.y) {
            const next = polar[i + 1];
            const p1 = calcPolar(
                {
                    pos: {
                        y: pos.y + 0.5 * (cw ? -1 : 1),
                        x: pos.x,
                    },
                    col: pos.col,
                    section: pos.section,
                },
                rounded,
            );
            const p2 = calcPolar(
                {
                    pos: {
                        x: pos.x + 0.5 * (next.r > pos.r ? 1 : -1),
                        y: pos.y,
                    },
                    col: pos.col,
                    section: pos.section,
                },
                rounded,
            );
            extra = `Q${x} ${y} ${p2.rx + cx} ${p2.ry + cy}`;
            ldest = { x: p2.rx + cx, y: p2.ry + cy };
            x = p1.rx + cx;
            y = p1.ry + cy;
        } else {
            ldest = { x, y };
        }

        return (
            `${prefix}A ${pos.r} ${pos.r} 0 ${largeArcFlag ? '1' : '0'} ${
                sweepFlag ? '1' : '0'
            } ${x} ${y}` + extra
        );
    });
    return paths;
};

export const epsilon = 0.000001;

export const normalizeAngle = (angle: number): number => {
    if (isNaN(angle)) {
        debugger;
        throw new Error(`NAN`);
    }
    if (!isFinite(angle)) {
        debugger;
        return 0;
    }
    if (angle > Math.PI) {
        return normalizeAngle(angle - Math.PI * 2);
    }
    if (angle < -Math.PI) {
        return normalizeAngle(angle + Math.PI * 2);
    }
    return angle;
};

/**
 * Calculate the difference between two angles.
 *
 * The result will always be positive, in $[0,2\pi]$
 */
export const angleBetween = (
    // the 'starting' angle, must be in $[-\pi,\pi]$
    left: number,
    // end 'ending' angle, must be in $[-\pi,\pi]$
    right: number,
    // which direction to travel around the circle, `true` for clockwise
    clockwise: boolean,
) => {
    if (!clockwise) {
        [left, right] = [right, left];
    }
    if (Math.abs(right - left) < epsilon) {
        return 0;
    }
    if (right >= left) {
        return right - left;
    }
    const res = right + Math.PI * 2 - left;
    if (res < 0) {
        return res + Math.PI * 2;
    }
    return res;
};

function isClockwise(pos: SectionMap[''], prev: SectionMap[''], cols: number) {
    return pos.col === (prev.col + 1) % cols;
}

export function rainbow(percent: number): string | undefined {
    return `hsl(${(percent * 180).toFixed(0)}, 100%, 50%)`;
}

export function cart(t: number, r: number, R: number, cx: number, cy: number) {
    const x = cx + Math.cos(t) * r * R;
    const y = cy + Math.sin(t) * r * R;
    return { x, y };
}

export function polarPath(points: Coord[], size: State['size']) {
    return points
        .map(({ x, y }) => ({
            x: size.width - x,
            y: size.height - y,
        }))
        .map((p) => {
            const r = p.x / (size.width - 1);
            const t = (p.y / size.height - 1) * Math.PI * 2;
            return { t, r };
        });
}
