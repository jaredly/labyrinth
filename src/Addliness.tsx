import React, { useState } from 'react';
import { State, Action, exact } from './App2';
import { GridPoint } from './renderCart2';

export const AddRing = ({
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
        null as null | { ring: number; x: number; y: number },
    );
    return (
        <g
            onMouseLeave={() => setPos(null)}
            onMouseMove={(evt) => {
                const box = evt.currentTarget.getBoundingClientRect();
                setPos({
                    ring:
                        state.rings -
                        1 -
                        Math.round((evt.clientY - box.top) / scale - 0.5),
                    x: evt.clientX - box.left,
                    y: evt.clientY - box.top,
                });
            }}
            transform="translate(-55,0)"
        >
            <rect
                x={0}
                y={0}
                width={55}
                height={state.rings * scale}
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
                    transform={`translate(${15}, ${
                        (state.rings - 1 - pos.ring) * scale + scale / 2
                    })`}
                >
                    <circle
                        cx={0}
                        cy={0}
                        fill="green"
                        r={10}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                            dispatch({
                                type: 'addring',
                                ring: pos.ring,
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
                    {pos.ring > 0 ? (
                        <>
                            <circle
                                cx={25}
                                cy={0}
                                fill="red"
                                r={10}
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                    dispatch({
                                        type: 'rmring',
                                        ring: pos.ring,
                                    });
                                    setPos({ ...pos, ring: pos.ring - 1 });
                                }}
                            />
                            <path
                                transform="translate(25,0)"
                                d={`M-7 0 L7 0`}
                                style={{ pointerEvents: 'none' }}
                                fill="none"
                                stroke={'white'}
                                strokeWidth={2}
                            />
                        </>
                    ) : null}
                </g>
            ) : null}
        </g>
    );
};

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
    return (
        <g
            transform={`translate(${0}, ${scale * grid[0].length - scale})`}
            onMouseLeave={() => setPos(null)}
            onMouseMove={(evt) => {
                const box = evt.currentTarget.getBoundingClientRect();
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
                >
                    <circle
                        cx={0}
                        cy={0}
                        fill="green"
                        r={10}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                            const zero = grid[pos.col][0];
                            // console.log(zero, pos.col);
                            dispatch({
                                type: 'addrow',
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
                        style={{ cursor: 'pointer' }}
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
