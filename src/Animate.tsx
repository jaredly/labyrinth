import * as React from 'react';
import { Coord, Screen, State, calcBounds, pairKey } from './App2';
import { organizeLine } from './organizeLine';
import { calculateSingles } from './Edit';
import { Polar, calcLocation } from './sections';
import { calcPathPartsInner } from './calcPath';

export const Animate = ({
    state,
    setScreen,
}: {
    state: State;
    setScreen: (s: Screen) => void;
}) => {
    const bounds = calcBounds(state);

    const singles: { [key: string]: number } = calculateSingles(state.sections);
    const lines = organizeLine(state.rings, state.sections, singles);

    if (!lines || lines.length !== 1) {
        return (
            <div>
                <button onClick={() => setScreen('edit')}>Edit</button>
                No lines
                {lines?.length}
            </div>
        );
    }

    const VW = 800;
    const vm = 5;

    const R = VW / 2;
    const dr = R / (bounds.width + (state.inner ?? 1) + 1);
    const r0 = -1;

    const sectionCols: number[] = [];
    let col = 0;
    state.sections.forEach(({ pairs, rows }, i) => {
        sectionCols.push(col);
        col += rows;
    });
    const totalCols = col;

    const line = lines[0];
    const polars = line.map((k) => {
        const [section, pos] = k.split(':');
        const [ring, row] = pos.split(',');
        const sectionTheta =
            (+section / state.sections.length) * Math.PI * 2 + Math.PI / 2;
        const y = +row;
        return calcLocation({
            pos: { x: bounds.width - +ring, y: y },
            sectionTheta,
            dr,
            r0,
            rows: state.sections[+section].rows,
            col: sectionCols[+section] + y,
            section: +section,
        });
    });

    const nodes: JSX.Element[] = [];

    const addPolar = (polar: Polar[], key: string) => {
        nodes.push(
            <path
                key={key}
                d={calcPathPartsInner(polar, VW / 2, VW / 2, totalCols).join(
                    ' ',
                )}
                strokeLinecap="round"
                fill="none"
                stroke={'white'}
                strokeWidth={2}
            />,
        );
    };

    state.sections.forEach(({ pairs, rows }, i) => {
        col = sectionCols[i];
        for (let x = 0; x < bounds.width - 1; x++) {
            for (let y = 0; y < rows; y++) {
                const p1 = pairKey({ x, y }, { x: x - 1, y });
                if (!pairs[p1]) {
                    addPolar(
                        addCircular(
                            dr,
                            r0,
                            bounds.width,
                            state,
                            i,
                            { x: x - 0.5, y: y - 0.5 },
                            { x: x - 0.5, y: y + 0.5 },
                            col,
                        ),
                        p1 + `- ${x} ${y} ${i}`,
                    );
                }
                const p2 = pairKey({ x, y }, { x, y: y + 1 });
                if (x < bounds.width - 2 && y < rows - 1 && !pairs[p2]) {
                    addPolar(
                        addCircular(
                            dr,
                            r0,
                            bounds.width,
                            state,
                            i,
                            { x: x - 0.5, y: y + 0.5 },
                            { x: x + 0.5, y: y + 0.5 },
                            col,
                        ),
                        p2 + `- ${x} ${y} ${i}`,
                    );
                }
            }
        }

        const sectionTheta =
            (i / state.sections.length) * Math.PI * 2 + Math.PI / 2;
        const nsectionTheta =
            ((i + 1) / state.sections.length) * Math.PI * 2 + Math.PI / 2;

        for (let x = 0; x < bounds.width - 1; x++) {
            const k1 = `${i}:${x},${rows - 1}`;
            const k2 = `${(i + 1) % state.sections.length}:${x},${0}`;
            const nsi = (i + 1) % state.sections.length;
            nodes.push(
                <path
                    key={`${i} ${x} - connector 2`}
                    d={calcPathPartsInner(
                        [
                            calcLocation({
                                pos: {
                                    x: bounds.width - x + 0.5,
                                    y: rows - 0.5,
                                },
                                sectionTheta,
                                dr,
                                r0,
                                rows: state.sections[i].rows,
                                col: 0,
                                section: i,
                            }),
                            calcLocation({
                                pos: { x: bounds.width - x + 0.5, y: -0.5 },
                                sectionTheta: nsectionTheta,
                                dr,
                                r0,
                                rows: state.sections[nsi].rows,
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
                    stroke={'white'}
                    strokeWidth={2}
                />,
            );
        }
    });

    const pathString = calcPathPartsInner(polars, VW / 2, VW / 2, totalCols, {
        dr,
        r0,
        sections: state.sections,
    }).join(' ');
    const [mode, setMode] = React.useState('line' as 'line' | 'dot');

    const [pos, setPos] = React.useState(50);

    const [length, setLength] = React.useState(null as null | number);

    const [timer, setTimer] = React.useState(null as null | number);

    React.useEffect(() => {
        if (timer == null) return;

        setPos(0);

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

    return (
        <div>
            <div>
                <button onClick={() => setScreen('edit')}>Edit</button>
            </div>
            <svg
                width={VW + vm * 2}
                height={VW + vm * 2}
                style={{ marginTop: 50 - vm, backgroundColor: '#0a0a0a' }}
            >
                <g transform={`translate(${vm},${vm})`}>
                    {nodes}
                    <path
                        ref={(node) => {
                            if (node && length == null) {
                                setLength(node.getTotalLength());
                            }
                        }}
                        d={pathString}
                        strokeDasharray={
                            length
                                ? mode === 'line'
                                    ? `${(pos / 100) * length} ${
                                          (1 - pos / 100) * length
                                      }`
                                    : `1 1000000`
                                : undefined
                        }
                        strokeDashoffset={
                            length && mode === 'dot'
                                ? `-${(pos / 100) * length}`
                                : undefined
                        }
                        stroke="#77f"
                        strokeLinecap="round"
                        strokeWidth={mode === 'dot' ? 20 : 10}
                        fill="none"
                    />
                </g>
            </svg>
            <div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={pos}
                    onChange={(evt) => setPos(+evt.target.value)}
                />
                {length}
                <button onClick={() => setTimer(timer === 10 ? null : 10)}>
                    10 minute
                </button>
                <button onClick={() => setTimer(timer === 5 ? null : 5)}>
                    5 minute
                </button>
                <button onClick={() => setTimer(timer === 1 ? null : 1)}>
                    1 minute
                </button>
                <button
                    onClick={() => setMode(mode === 'line' ? 'dot' : 'line')}
                >
                    Line / Dot
                </button>
            </div>
        </div>
    );
};

export const addCircular = (
    dr: number,
    r0: number,
    width: number,
    state: State,
    section: number,
    p1: Coord,
    p2: Coord,
    col: number,
) => {
    const sectionTheta =
        (section / state.sections.length) * Math.PI * 2 + Math.PI / 2;

    return [
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
    ];
};
