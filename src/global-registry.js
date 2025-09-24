
/**
 * Registers a component as a property on the provided global object, if not already registered, and dispatches an event to notify listeners.
 * The event is dispatched on `document` and will have the name `$sch${componentClassName}:ready` and a `detail` property with the instance.
 *
 * @param {any} global typically `window`
 * @param {string} componentClassName the name of the component to register, 'identity', 'monetization' or 'payment'
 * @param {any} instance the instance of the component to register
 * @returns {void}
 */
export const registerGlobal = (global, componentClassName, instance) => {
    const prefixedName = `sch${componentClassName}`;
    if (!(global)[prefixedName]) {
        (global)[prefixedName] = instance;
    }
    document.dispatchEvent(new CustomEvent(`${prefixedName}:ready`, { detail: { instance } }));
}

