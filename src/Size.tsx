import React, { useState } from 'react';
import { State } from './App';

export const Size = ({
    size,
    onChange,
}: {
    size: State['size'];
    onChange: (s: State['size']) => void;
}) => {
    const [width, setWidth] = useState(null as null | number);
    const [height, setHeight] = useState(null as null | number);
    return (
        <div>
            <input
                value={width ?? size.width}
                onChange={(evt) => setWidth(+evt.target.value)}
            />
            <input
                value={height ?? size.height}
                onChange={(evt) => setHeight(+evt.target.value)}
            />
            <button
                onClick={() =>
                    onChange({
                        width: width ?? size.width,
                        height: height ?? size.height,
                    })
                }
            >
                Ok
            </button>
        </div>
    );
};
