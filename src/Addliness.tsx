import React, { useState } from 'react';
import { State, Action, exact } from './App2';
import { GridPoint } from './renderCart2';

export const Addliness = ({
    dispatch,
    state,
    scale,
    grid,
}: {
    state: State;
    dispatch: React.Dispatch<Action>;
    scale: number;
    grid: GridPoint[][];
}) => {
    const [pos, setPos] = useState(
        null as null | { col: number; x: number; y: number },
    );
    // const count = state.size.height + 1;
    // const height = scale * count;
    return (
        <g
            transform={`translate(${0}, ${scale * grid[0].length - scale})`}
            onMouseLeave={() => setPos(null)}
            onMouseMove={(evt) => {
                const box = evt.currentTarget.getBoundingClientRect();
                // const y = (evt.clientY - box.top) / box.height;
                setPos({
                    col: Math.round((evt.clientX - box.left) / scale - 0.5),
                    x: evt.clientX - box.left,
                    y: evt.clientY - box.top,
                });
            }}
        >
            <rect
                x={0}
                y={0}
                width={grid.length * scale - scale}
                height={55}
                fill="transparent"
                style={{ cursor: 'none' }}
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
                    transform={`translate(${
                        pos.col * scale + scale / 2
                    }, ${15})`}
                    // style={{ pointerEvents: 'none' }}
                >
                    <circle
                        cx={0}
                        cy={0}
                        fill="green"
                        r={10}
                        onClick={() => {
                            const zero = grid[pos.col][0];
                            dispatch({
                                type: 'add',
                                section: zero.section,
                                row: zero.row,
                            });
                        }}
                    />
                    <path
                        style={{ pointerEvents: 'none' }}
                        d={`M0 -7 L0 7 M-7 0 L7 0`}
                        fill="none"
                        stroke={'white'}
                        strokeWidth={2}
                    />
                    <circle
                        cx={0}
                        cy={25}
                        fill="red"
                        r={10}
                        onClick={() => {
                            const zero = grid[pos.col][0];
                            dispatch({
                                type: 'rmrow',
                                section: zero.section,
                                row: zero.row,
                            });
                        }}
                    />
                    <path
                        d={`M-7 25 L7 25`}
                        style={{ pointerEvents: 'none' }}
                        fill="none"
                        stroke={'white'}
                        strokeWidth={2}
                    />
                </g>
            ) : null}
        </g>
    );
};
