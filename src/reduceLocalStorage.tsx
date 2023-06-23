import React from 'react';

export const reduceLocalStorage = <T, A>(
    key: string,
    initial: () => T,
    reduce: (state: T, action: A) => T,
    migrate: (state: any) => T = (x) => x,
    disable = false,
) => {
    const [state, dispatch] = React.useReducer(reduce, null, () =>
        localStorage[key] ? migrate(JSON.parse(localStorage[key])) : initial(),
    );
    React.useEffect(() => {
        if (state != null && !disable) {
            localStorage[key] = JSON.stringify(state);
        }
    }, [state, disable]);
    return [state, dispatch] as const;
};

export const useLocalStorage = <T,>(key: string, initial: () => T) => {
    const [state, setState] = React.useState<T>(
        localStorage[key] ? JSON.parse(localStorage[key]) : initial(),
    );
    React.useEffect(() => {
        if (state != null) {
            localStorage[key] = JSON.stringify(state);
        }
    }, [state]);
    return [state, setState] as const;
};
