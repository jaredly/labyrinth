import React, { useEffect, useState } from 'react';
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

    const [rounded, setRounded] = useState(false);

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

    const svgpaths: string[] = [];

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
                const d = calcPathPartsInner(
                    polars,
                    VW / 2,
                    VW / 2,
                    totalCols,
                    rounded
                        ? {
                              dr,
                              r0,
                              sections,
                          }
                        : undefined,
                ).join(' ');
                svgpaths.push(d);
                circular.front.push(
                    <path
                        key={`themaindeal` + i}
                        d={d}
                        strokeLinecap={rounded ? 'round' : 'square'}
                        strokeLinejoin={rounded ? 'round' : 'miter'}
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

    const [pos, setPos] = useState(50);

    const [length, setLength] = useState(null as null | number);

    // const p = svgpaths.length ? new Path2D(svgpaths[0]) : null;

    const [timer, setTimer] = useState(null as null | number);

    useEffect(() => {
        if (timer == null) return;

        setPos(0);

        // every 20 ms is 50x per second
        // timer * 60 * 50 // number of steps

        const iid = setInterval(() => {
            setPos((p) => p + 100 / (timer * 60 * 50));
        }, 20);
        const to = setTimeout(() => {
            setTimer(null);
        }, timer * 60 * 1000);

        return () => {
            clearInterval(iid);
            clearTimeout(to);
        };
    }, [timer]);
    const [mode, setMode] = useState('line' as 'line' | 'dot');

    return (
        <div>
            <svg
                ref={ref}
                width={VW + vm * 2}
                height={VW + vm * 2}
                style={{ marginTop: 50 - vm, backgroundColor: '#0a0a0a' }}
            >
                <g transform={`translate(${vm},${vm})`}>
                    {ungroup(circular)}
                    <path
                        ref={(node) => {
                            if (node) {
                                if (length == null) {
                                    setLength(node.getTotalLength());
                                }
                            }
                        }}
                        d={svgpaths[0]}
                        strokeDasharray={
                            length
                                ? mode === 'line'
                                    ? `${(pos / 100) * length} ${
                                          (1 - pos / 100) * length
                                      }`
                                    : `5 1000000`
                                : undefined
                        }
                        strokeDashoffset={
                            length && mode === 'dot'
                                ? `-${(pos / 100) * length}`
                                : undefined
                        }
                        stroke="#77f"
                        strokeLinecap={rounded ? 'round' : 'square'}
                        strokeLinejoin={rounded ? 'round' : 'miter'}
                        strokeWidth={mode === 'dot' ? 20 : 10}
                        fill="none"
                    />
                </g>
            </svg>
            <div
                style={{
                    flexDirection: 'row',
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
                <div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.1"
                        value={pos}
                        onChange={(evt) => setPos(+evt.target.value)}
                    />
                    {length ? (
                        <div>
                            Length: {length?.toFixed(0)}
                            <br />
                            Radius: {VW / 2} DR: {dr.toFixed(1)}
                            <br />
                            Length/DR: {(length / dr).toFixed(1)}
                        </div>
                    ) : null}
                </div>
                <button onClick={() => setTimer(10)}>10 minute</button>
                <button onClick={() => setTimer(5)}>5 minute</button>
                <button onClick={() => setTimer(1)}>1 minute</button>
                <button onClick={() => setTimer(0.5)}>0.5 minute</button>
                <button
                    onClick={() => setMode(mode === 'line' ? 'dot' : 'line')}
                >
                    Line / Dot
                </button>
                <button
                    onClick={() => {
                        setRounded(!rounded);
                    }}
                >
                    {rounded ? 'Rounded' : 'Unrounded'}
                </button>
            </div>
        </div>
    );
}
