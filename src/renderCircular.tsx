import React from 'react';
import { calcLocation, pointDistance2 } from './sections';
import { calcPathPartsInner, showColor2 } from './calcPath';
import {
    State,
    Action,
    Section,
    Grouped,
    Coord,
    pairKey,
    missing,
    ungroup,
    parsePairs,
} from './App2';
import { GridPoint } from './renderCart2';

export const organizeLine = (
    rings: number,
    sections: Section[],
    singles: { [key: string]: number },
) => {
    const withConnectors = { ...singles };
    const connected: { [key: string]: string[] } = {};
    const connect = (k1: string, k2: string) => {
        if (!connected[k1]) {
            connected[k1] = [k2];
        } else {
            connected[k1].push(k2);
        }
        if (!connected[k2]) {
            connected[k2] = [k1];
        } else {
            connected[k2].push(k1);
        }
    };

    sections.forEach(({ pairs, rows }, i) => {
        for (let ring = 0; ring < rings; ring++) {
            const k = `${i}:${ring},${rows - 1}`;
            const sn = (i + 1) % sections.length;
            const k2 = `${sn}:${ring},${0}`;
            if (singles[k] || singles[k2]) {
                withConnectors[k] = (withConnectors[k] || 0) + 1;
                withConnectors[k2] = (withConnectors[k2] || 0) + 1;
                connect(k, k2);
            }
        }

        parsePairs(pairs).forEach(([p1, p2]) => {
            connect(`${i}:${p1.x},${p1.y}`, `${i}:${p2.x},${p2.y}`);
        });
    });

    const ends = Object.entries(withConnectors)
        .filter(([a, b]) => b === 1)
        .map(([k, v]) => {
            const [section, pos] = k.split(':');
            const [ring, row] = pos.split(',');
            return {
                section,
                pos: { ring: +ring, row: +row },
            };
        })
        .sort((a, b) => a.pos.ring - b.pos.ring);
    if (!ends.length || ends[0].pos.ring !== 0) {
        return null;
    }

    const line: string[] = [
        `${ends[0].section}:${ends[0].pos.ring},${ends[0].pos.row}`,
    ];
    // console.log('LINEARIZE');
    while (true) {
        const last = line[line.length - 1];
        if (connected[last].length !== 1) {
            break;
        }
        const got = connected[last][0];
        delete connected[last];
        // console.log(last, '->', got);
        connected[got] = connected[got].filter((k) => k !== last);
        line.push(got);
    }
    return line;
};

export function renderCircular(
    ref: React.RefObject<SVGSVGElement>,
    state: State,
    width: number,
    dispatch: React.Dispatch<Action>,
    sections: Section[],
    singles: { [key: string]: number },
    hoverPoint: GridPoint | null,
    line: string[] | null,
) {
    const VW = 300;
    const vm = 5;

    const R = VW / 2;
    const dr = R / (width + (state.inner ?? 1) + 1);
    const r0 = state.inner ?? 1;

    const sectionCols: number[] = [];
    let col = 0;
    sections.forEach(({ pairs, rows }, i) => {
        sectionCols.push(col);
        col += rows;
    });
    const totalCols = col;

    const circular: Grouped = { slop: [], back: [], mid: [], front: [] };
    const addCircular = (
        section: number,
        p1: Coord,
        p2: Coord,
        pairs: State['sections'][0]['pairs'],
        col: number,
    ) => {
        const sectionTheta =
            (section / state.sections.length) * Math.PI * 2 + Math.PI / 2;

        const pk = pairKey(p1, p2);
        const pos = pairs[pk] ? 'front' : 'back';

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
                            col: col + p1.y,
                        }),
                        calcLocation({
                            pos: { x: width - p2.x, y: p2.y },
                            sectionTheta,
                            dr,
                            r0,
                            rows: state.sections[section].rows,
                            col: col + p2.y,
                        }),
                    ],
                    VW / 2,
                    VW / 2,
                    totalCols,
                ).paths.join(' ')}
                strokeLinecap="round"
                fill="none"
                stroke={pairs[pk] ? 'blue' : missing}
                strokeWidth={5}
                onClick={() =>
                    dispatch({
                        type: 'toggle',
                        pair: pk,
                        section,
                    })
                }
                style={{ cursor: 'pointer' }}
            />,
        );
    };

    sections.forEach(({ pairs, rows }, i) => {
        col = sectionCols[i];
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < rows; y++) {
                if (y < rows - 1) {
                    addCircular(i, { x, y }, { x, y: y + 1 }, pairs, col);
                }
                if (x < width - 1) {
                    addCircular(i, { x, y }, { x: x + 1, y }, pairs, col);
                }
            }
        }

        const sectionTheta = (i / sections.length) * Math.PI * 2 + Math.PI / 2;
        const nsectionTheta =
            ((i + 1) / sections.length) * Math.PI * 2 + Math.PI / 2;
        // console.log(singles);

        if (hoverPoint?.section === i) {
            const pos = calcLocation({
                pos: { x: width - hoverPoint.ring, y: hoverPoint.row },
                sectionTheta,
                dr,
                r0,
                rows: sections[i].rows,
                col: col + hoverPoint.row,
            });
            const x = Math.cos(pos.t) * pos.r + VW / 2;
            const y = Math.sin(pos.t) * pos.r + VW / 2;

            circular.front.push(<circle cx={x} cy={y} r={5} fill="red" />);
        }

        for (let x = 0; x < width; x++) {
            const k1 = `${i}:${x},${rows - 1}`;
            const k2 = `${(i + 1) % sections.length}:${x},${0}`;
            const needed = singles[k1] || singles[k2];
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
                                col: 0,
                            }),
                            calcLocation({
                                pos: { x: width - x, y: 0 },
                                sectionTheta: nsectionTheta,
                                dr,
                                r0,
                                rows: sections[(i + 1) % sections.length].rows,
                                col: 1,
                            }),
                        ],
                        VW / 2,
                        VW / 2,
                        totalCols,
                    ).paths.join(' ')}
                    strokeLinecap="round"
                    fill="none"
                    stroke={needed ? 'blue' : '#300'}
                    strokeWidth={5}
                />,
            );
        }
    });

    if (line) {
        const polars = line.map((k) => {
            const [section, pos] = k.split(':');
            const [ring, row] = pos.split(',');
            const sectionTheta =
                (+section / sections.length) * Math.PI * 2 + Math.PI / 2;
            const y = +row; //sections[+section].rows - +row;
            return calcLocation({
                pos: { x: width - +ring, y: y },
                sectionTheta,
                dr,
                r0,
                rows: sections[+section].rows,
                col: sectionCols[+section] + y,
            });
        });

        const color = true;
        if (color) {
            // const dists = [];

            const dists = pointDistance2(polars);

            circular.front.push(
                ...showColor2(polars, VW / 2, VW / 2, dists, 5, totalCols),
            );
        } else {
            circular.front.push(
                <path
                    key={`themaindeal`}
                    d={calcPathPartsInner(
                        polars,
                        VW / 2,
                        VW / 2,
                        totalCols,
                    ).paths.join(' ')}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    stroke={'red'}
                    strokeWidth={5}
                />,
            );
        }
    }

    return (
        <svg
            ref={ref}
            width={VW + vm * 2}
            height={VW + vm * 2}
            style={{ marginTop: 50 - vm, backgroundColor: '#0a0a0a' }}
        >
            <g transform={`translate(${vm},${vm})`}>{ungroup(circular)}</g>
        </svg>
    );
}
