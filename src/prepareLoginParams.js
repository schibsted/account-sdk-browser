
/**
 * A simple utility function that fire state is typeof state is function
 * @memberof core
 * @param {LoginOptions} loginPrams
 * @return {LoginOptions} loginPrams
 */
export async function prepareLoginParams(loginPrams) {
    if (typeof loginPrams.state === 'function') {
        loginPrams.state = await loginPrams.state();
    }

    return loginPrams;
}
