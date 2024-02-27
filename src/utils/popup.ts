/* Copyright 2024 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */
import { assert, isObject, isUrl, isFunction } from './validate';
import { GenericObject } from './types';

type FeatureActivation = 'yes' | 'no';

interface WindowFeatures {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
    menubar?: FeatureActivation;
    toolbar?: FeatureActivation;
    location?: FeatureActivation;
    status?: FeatureActivation;
    resizable?: FeatureActivation;
    scrollbars?: FeatureActivation;
    [key: string]: unknown
}

/**
 * Serializes an object to string.
 * @memberof core
 * @private
 * @param {object} obj - for example {a: 'b', c: 1}
 * @return {string} - for example 'a=b,c=1'
 */
function serialize(obj: GenericObject) {
    assert(isObject(obj), `Object must be an object but it is '${obj}'`);
    return Object.keys(obj)
        .map(key => `${key}=${obj[key]}`)
        .join(',');
}

const defaultWindowFeatures: WindowFeatures = {
    scrollbars: 'yes',
    location: 'yes',
    status: 'no',
    menubar: 'no',
    toolbar: 'no',
    resizable: 'yes',
};

/**
 * Opens a popup
 * @param {Window} parentWindow - A reference to the window that will open the popup
 * @param {string} url - The URL that the popup will open
 * @param {string} [windowName] - A name for the window
 * @param {object} [windowFeatures] - Window features for the popup (default ones are usually ok)
 * @returns {Window|null} - A reference to the popup window
 * @private
 */
export function open(parentWindow: Window, url: string, windowName = '', windowFeatures: WindowFeatures = defaultWindowFeatures) {
    assert(isObject(parentWindow), `window was supposed to be an object but it is ${parentWindow}`);
    assert(isObject(parentWindow.screen),
        'window should be a valid Window object but it lacks a \'screen\' property');
    assert(isFunction(parentWindow.open),
        'window should be a valid Window object but it lacks an \'open\' function');
    assert(isUrl(url), 'Invalid URL for popup');

    const { height, width } = parentWindow.screen;

    if (Number.isFinite(windowFeatures.width) && Number.isFinite(width)) {
        windowFeatures.left = (width - (windowFeatures.width || 0)) / 2;
    }
    if (Number.isFinite(windowFeatures.height) && Number.isFinite(height)) {
        windowFeatures.top = (height - (windowFeatures.height || 0)) / 2;
    }
    const features = serialize({ ...defaultWindowFeatures, ...windowFeatures });
    return parentWindow.open(url, windowName, features);
}
