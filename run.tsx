import React from 'react';
import { Root, createRoot } from 'react-dom/client';
import { App2 } from './src/App2';

declare global {
    var root: Root;
}

const getRoot = () => {
    if (window.root) return window.root;
    const node = document.createElement('div');
    document.body.append(node);
    return (window.root = createRoot(node));
};

getRoot().render(<App2 />);
