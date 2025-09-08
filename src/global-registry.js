
/**
 * Registers a component globally if not already registered, and dispatches an event to notify listeners.
 * The event is dispatched on `document` and will have the name `$sch_${componentName}:init` and a `detail` property with the instance.
 *
 * @param {any} global typically `window`
 * @param {string} componentName the name of the component to register
 * @param {any} instance the instance of the component to register
 * @returns {void}
 */
export const registerGlobal = (global, componentName, instance) => {
    const prefixedName = `sch_${componentName}`;
    if (!(global)[prefixedName]) {
        (global)[prefixedName] = instance;
    }
    document.dispatchEvent(new CustomEvent(`${prefixedName}:init`, { detail: { instance } }));
}

