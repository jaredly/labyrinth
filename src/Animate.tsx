import * as React from 'react';
import { Screen, State, calcBounds } from './App2';
import { organizeLine } from './organizeLine';
import { calculateSingles } from './Edit';
import { calcLocation } from './sections';
import { calcPathPartsInner } from './calcPath';

export const Animate = ({
    state,
    setScreen,
}: {
    state: State;
    setScreen: (s: Screen) => void;
}) => {
    const svgpaths: string[] = [];
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
    const r0 = -1; // state.inner ?? 1;

    const sectionCols: number[] = [];
    let col = 0;
    state.sections.forEach(({ pairs, rows }, i) => {
        sectionCols.push(col);
        col += rows;
    });
    const totalCols = col;

    lines.forEach((line, i) => {
        const polars = line.map((k) => {
            const [section, pos] = k.split(':');
            const [ring, row] = pos.split(',');
            const sectionTheta =
                (+section / state.sections.length) * Math.PI * 2 + Math.PI / 2;
            const y = +row; //sections[+section].rows - +row;
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

        const d = calcPathPartsInner(polars, VW / 2, VW / 2, totalCols, {
            dr,
            r0,
            sections: state.sections,
        }).join(' ');
        svgpaths.push(d);
    });
    const [mode, setMode] = React.useState('line' as 'line' | 'dot');

    return (
        <div>
            <div>
                <button onClick={() => setScreen('edit')}>Edit</button>
                Hm
            </div>
            <svg
                width={VW + vm * 2}
                height={VW + vm * 2}
                style={{ marginTop: 50 - vm, backgroundColor: '#0a0a0a' }}
            >
                <g transform={`translate(${vm},${vm})`}>
                    <path
                        ref={(node) => {
                            if (node) {
                                if (length == null) {
                                    // setLength(node.getTotalLength());
                                }
                            }
                        }}
                        d={svgpaths[0]}
                        // strokeDasharray={
                        //     length
                        //         ? mode === 'line'
                        //             ? `${(pos / 100) * length} ${
                        //                   (1 - pos / 100) * length
                        //               }`
                        //             : `5 1000000`
                        //         : undefined
                        // }
                        // strokeDashoffset={
                        //     length && mode === 'dot'
                        //         ? `-${(pos / 100) * length}`
                        //         : undefined
                        // }
                        stroke="#77f"
                        strokeLinecap="round"
                        strokeWidth={mode === 'dot' ? 20 : 10}
                        fill="none"
                    />
                </g>
            </svg>
        </div>
    );
};
