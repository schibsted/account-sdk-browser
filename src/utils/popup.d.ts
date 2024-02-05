/**
 * Opens a popup
 * @param {Window} parentWindow - A reference to the window that will open the popup
 * @param {string} url - The URL that the popup will open
 * @param {string} [windowName] - A name for the window
 * @param {object} [windowFeatures] - Window features for the popup (default ones are usually ok)
 * @returns {Window|null} - A reference to the popup window
 * @private
 */
export function open(parentWindow: Window, url: string, windowName?: string, windowFeatures?: any): Window;
