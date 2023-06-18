import {
    State,
    Action,
    pairKey,
    parsePairs,
    Coord,
    pairsToObject,
} from './App2';

export const reduce = (state: State, action: Action): State => {
    switch (action.type) {
        case 'clear':
            return {
                ...state,
                rings: 7,
                sections: [
                    { rows: 3, pairs: {} },
                    { rows: 2, pairs: {} },
                    { rows: 2, pairs: {} },
                    { rows: 2, pairs: {} },
                ],
            };
        case 'rotate-sections':
            return {
                ...state,
                sections:
                    action.count < 0
                        ? state.sections
                              .slice(-action.count)
                              .concat(state.sections.slice(0, -action.count))
                        : state.sections
                              .slice(action.count)
                              .concat(state.sections.slice(0, action.count)),
            };
        case 'reset':
            return action.state;
        case 'sections':
            return { ...state, sections: action.sections };
        case 'remove': {
            const sections = state.sections.map((s) => ({
                ...s,
                pairs: { ...s.pairs },
            }));
            action.pairs.forEach(({ section, pair }) => {
                delete sections[section].pairs[pair];
            });
            return { ...state, sections };
        }
        case 'slide': {
            const sections = state.sections.map((s) => ({
                ...s,
                pairs: { ...s.pairs },
            }));
            for (let i = 1; i < action.slide.length; i++) {
                const last = action.slide[i - 1];
                const one = action.slide[i];
                if (last.section === one.section) {
                    sections[last.section].pairs[pairKey(last, one)] = true;
                }
            }
            return { ...state, sections };
        }
        case 'toggle': {
            const sections = state.sections.slice();
            sections[action.section] = {
                ...state.sections[action.section],
                pairs: {
                    ...state.sections[action.section].pairs,
                    [action.pair]:
                        !state.sections[action.section].pairs[action.pair],
                },
            };
            return { ...state, sections };
        }
        case 'addring': {
            return {
                ...state,
                rings: state.rings + 1,
                sections: state.sections.map((s) => {
                    const pairs = parsePairs(s.pairs).map(
                        ([p1, p2]): [Coord, Coord] =>
                            p1.x > action.ring
                                ? [
                                      { x: p1.x + 1, y: p1.y },
                                      { x: p2.x + 1, y: p2.y },
                                  ]
                                : [p1, p2],
                    );
                    return { pairs: pairsToObject(pairs), rows: s.rows };
                }),
            };
        }
        case 'rmring': {
            return {
                ...state,
                rings: state.rings - 1,
                sections: state.sections.map((s) => {
                    const pairs = parsePairs(s.pairs).map(
                        ([p1, p2]): [Coord, Coord] =>
                            p1.x >= action.ring
                                ? [
                                      { x: p1.x - 1, y: p1.y },
                                      { x: p2.x - 1, y: p2.y },
                                  ]
                                : [p1, p2],
                    );
                    return { pairs: pairsToObject(pairs), rows: s.rows };
                }),
            };
        }
        case 'rmrow': {
            if (action.row === 0) {
                const sections = state.sections.slice();
                const old = sections[action.section];
                sections.splice(action.section, 1);
                return { ...state, sections };
            }
            return {
                ...state,
                sections: state.sections.map((s, i) => {
                    if (i !== action.section) {
                        return s;
                    }
                    const pairs = parsePairs(s.pairs).map(
                        ([p1, p2]): [Coord, Coord] =>
                            p1.y >= action.row
                                ? [
                                      { y: p1.y - 1, x: p1.x },
                                      { y: p2.y - 1, x: p2.x },
                                  ]
                                : [p1, p2],
                    );
                    return { pairs: pairsToObject(pairs), rows: s.rows - 1 };
                }),
            };
        }
        case 'addrow': {
            if (action.row === 0) {
                const sections = state.sections.slice();
                sections.splice(action.section, 0, { pairs: {}, rows: 2 });
                return { ...state, sections };
            }
            return {
                ...state,
                sections: state.sections.map((s, i) => {
                    if (i !== action.section) {
                        return s;
                    }
                    const pairs = parsePairs(s.pairs).map(
                        ([p1, p2]): [Coord, Coord] =>
                            p1.y >= action.row
                                ? [
                                      { y: p1.y + 1, x: p1.x },
                                      { y: p2.y + 1, x: p2.x },
                                  ]
                                : [p1, p2],
                    );
                    return { pairs: pairsToObject(pairs), rows: s.rows + 1 };
                }),
            };
        }
    }
    console.info('unandled', action);
    return state;
};
