import React, { useState } from 'react';
import { State, Action, exact } from './App2';

export const Addliness = ({
    dispatch,
    state,
    scale,
}: {
    state: State;
    dispatch: React.Dispatch<Action>;
    scale: number;
}) => {
    const [pos, setPos] = useState(
        null as null | { row: number; x: number; y: number },
    );
    const count = state.size.height + 1;
    const height = scale * count;
    return (
        <g transform={`translate(${-scale / 2}, ${-scale})`}>
            <rect
                x={0}
                y={0}
                width={scale * 0.4}
                height={height}
                fill="transparent"
                onMouseLeave={() => setPos(null)}
                onMouseMove={(evt) => {
                    const box = evt.currentTarget.getBoundingClientRect();
                    const y = (evt.clientY - box.top) / box.height;
                    setPos({
                        row: Math.round(y * count * 2 * 1.5) / 1.5,
                        x: evt.clientX - box.left,
                        y: evt.clientY - box.top,
                    });
                }}
                style={{ cursor: 'none' }}
                onClick={() => {
                    if (pos) {
                        if (exact(pos.row / 2)) {
                            dispatch({ type: 'remove', row: pos.row / 2 - 1 });
                        } else {
                            const row = Math.floor(pos.row / 2);
                            const high = pos.row / 2 > row + 0.5;
                            dispatch({ type: 'add', row, high });
                        }
                        console.log(pos);
                    }
                }}
            />
            {pos != null ? (
                <circle
                    cx={pos.x}
                    cy={pos.y}
                    fill="white"
                    opacity={0.5}
                    r={2}
                    style={{ pointerEvents: 'none' }}
                />
            ) : null}
            {pos != null ? (
                <g
                    transform={`translate(${scale * 0.2}, ${
                        (pos.row * scale) / 2
                    })`}
                    style={{ pointerEvents: 'none' }}
                >
                    {/* <circle cx={0} cy={0} r={10} fill="#555" /> */}
                    <path
                        d={
                            exact(pos.row)
                                ? `M-7 0L7 0`
                                : `M0 -7 L0 7 M-7 0 L7 0`
                        }
                        fill="none"
                        stroke={exact(pos.row) ? 'red' : 'green'}
                        strokeWidth={2}
                    />
                </g>
            ) : null}
        </g>
    );
};
