import React, { useState } from 'react';
import equal from 'fast-deep-equal';
import { State, Action } from './App';

export function SectionsInput({
    state,
    dispatch,
}: {
    state: State;
    dispatch: React.Dispatch<Action>;
}) {
    const [v, setV] = useState(state.sections!.map((m) => m + '').join(' '));
    let parsed = null as null | number[];
    const values = v.split(' ').map((m) => parseFloat(m));
    if (values.length && values.every((m) => !isNaN(m))) {
        parsed = values;
    }
    return (
        <div>
            <input value={v} onChange={(evt) => setV(evt.target.value)} />
            <button
                disabled={!parsed || equal(parsed, state.sections)}
                onClick={() =>
                    dispatch({ type: 'sections', sections: parsed! })
                }
            >
                Set
            </button>
            <button
                onClick={() =>
                    dispatch({
                        type: 'sections',
                        sections: state.sections.map((s) => s - 1),
                    })
                }
            >
                &lt;-
            </button>
            <button
                onClick={() =>
                    dispatch({
                        type: 'sections',
                        sections: state.sections.map((s) => s + 1),
                    })
                }
            >
                -&gt;
            </button>
        </div>
    );
}
