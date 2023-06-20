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
} from './App2';
import { GridPoint } from './renderCart2';

export function renderCircular(
    ref: React.RefObject<SVGSVGElement>,
    state: State,
    width: number,
    dispatch: React.Dispatch<Action>,
    sections: Section[],
    singles: { [key: string]: number },
    hoverPoint: GridPoint | null,
    lines: string[][] | null,
    color: boolean,
) {
    const VW = 800;
    const vm = 5;

    const R = VW / 2;
    const dr = R / (width + (state.inner ?? 1) + 1);
    const r0 = -1; // state.inner ?? 1;

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
        front = false,
    ) => {
        const sectionTheta =
            (section / state.sections.length) * Math.PI * 2 + Math.PI / 2;

        const pk = pairKey(p1, p2);
        if (lines && pairs[pk]) {
            return;
        }
        const pos = front || pairs[pk] ? 'front' : 'back';

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
                            section,
                        }),
                        calcLocation({
                            pos: { x: width - p2.x, y: p2.y },
                            sectionTheta,
                            dr,
                            r0,
                            rows: state.sections[section].rows,
                            col: col + p2.y,
                            section,
                        }),
                    ],
                    VW / 2,
                    VW / 2,
                    totalCols,
                ).join(' ')}
                strokeLinecap="round"
                fill="none"
                stroke={front ? 'black' : pairs[pk] ? 'blue' : missing}
                strokeWidth={front ? 2 : 5}
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

        for (let x = 0; x < width; x++) {
            const k1 = `${i}:${x},${rows - 1}`;
            const k2 = `${(i + 1) % sections.length}:${x},${0}`;
            const needed = singles[k1] || singles[k2];
            if (needed && lines) {
                continue;
            }
            const nsi = (i + 1) % sections.length;
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
                                section: i,
                            }),
                            calcLocation({
                                pos: { x: width - x, y: 0 },
                                sectionTheta: nsectionTheta,
                                dr,
                                r0,
                                rows: sections[nsi].rows,
                                col: 1,
                                section: nsi,
                            }),
                        ],
                        VW / 2,
                        VW / 2,
                        totalCols,
                    ).join(' ')}
                    strokeLinecap="round"
                    fill="none"
                    stroke={needed ? 'blue' : '#300'}
                    strokeWidth={5}
                />,
            );
        }
    });

    if (lines) {
        lines.forEach((line, i) => {
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
                    section: +section,
                });
            });

            if (color) {
                const dists = pointDistance2(polars);

                circular.front.push(
                    ...showColor2(
                        polars,
                        VW / 2,
                        VW / 2,
                        dists,
                        dr - 2,
                        // 10,
                        totalCols,
                        {
                            dr,
                            r0,
                            sections,
                        },
                    ),
                );
            } else {
                circular.front.push(
                    <path
                        key={`themaindeal` + i}
                        d={calcPathPartsInner(
                            polars,
                            VW / 2,
                            VW / 2,
                            totalCols,
                            {
                                dr,
                                r0,
                                sections,
                            },
                        ).join(' ')}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        stroke={'blue'}
                        strokeWidth={dr - 2}
                    />,
                );
            }
        });
    }

    sections.forEach(({ pairs, rows }, i) => {
        col = sectionCols[i];
        for (let x = 0; x < width - 1; x++) {
            for (let y = 0; y < rows; y++) {
                const p1 = pairKey({ x, y }, { x: x - 1, y });
                if (!pairs[p1]) {
                    addCircular(
                        i,
                        { x: x - 0.5, y: y - 0.5 },
                        { x: x - 0.5, y: y + 0.5 },
                        pairs,
                        col,
                        true,
                    );
                }
                const p2 = pairKey({ x, y }, { x, y: y + 1 });
                if (x < width - 2 && y < rows - 1 && !pairs[p2]) {
                    addCircular(
                        i,
                        { x: x - 0.5, y: y + 0.5 },
                        { x: x + 0.5, y: y + 0.5 },
                        pairs,
                        col,
                        true,
                    );
                }
            }
        }

        const sectionTheta = (i / sections.length) * Math.PI * 2 + Math.PI / 2;
        const nsectionTheta =
            ((i + 1) / sections.length) * Math.PI * 2 + Math.PI / 2;

        for (let x = 0; x < width - 1; x++) {
            const k1 = `${i}:${x},${rows - 1}`;
            const k2 = `${(i + 1) % sections.length}:${x},${0}`;
            const nsi = (i + 1) % sections.length;
            circular.front.push(
                <path
                    key={`${i} ${x} - connector 2`}
                    d={calcPathPartsInner(
                        [
                            calcLocation({
                                pos: { x: width - x + 0.5, y: rows - 0.5 },
                                sectionTheta,
                                dr,
                                r0,
                                rows: sections[i].rows,
                                col: 0,
                                section: i,
                            }),
                            calcLocation({
                                pos: { x: width - x + 0.5, y: -0.5 },
                                sectionTheta: nsectionTheta,
                                dr,
                                r0,
                                rows: sections[nsi].rows,
                                col: 1,
                                section: nsi,
                            }),
                        ],
                        VW / 2,
                        VW / 2,
                        totalCols,
                    ).join(' ')}
                    strokeLinecap="round"
                    fill="none"
                    stroke={'black'}
                    strokeWidth={2}
                />,
            );
        }
    });

    sections.forEach(({ pairs, rows }, i) => {
        if (hoverPoint?.section === i) {
            const sectionTheta =
                (i / state.sections.length) * Math.PI * 2 + Math.PI / 2;
            const pos = calcLocation({
                pos: { x: width - hoverPoint.ring, y: hoverPoint.row },
                sectionTheta,
                dr,
                r0,
                rows: sections[i].rows,
                col: col + hoverPoint.row,
                section: i,
            });
            const x = Math.cos(pos.t) * pos.r + VW / 2;
            const y = Math.sin(pos.t) * pos.r + VW / 2;

            circular.front.push(
                <circle key={'hover'} cx={x} cy={y} r={15} fill="red" />,
            );
        }
    });

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
