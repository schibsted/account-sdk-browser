import { ENDPOINTS } from './config';

export const isReferredFromAccountPages = (referrer, env) => {
    return referrer && (referrer.startsWith(ENDPOINTS.BFF[env]) || referrer.startsWith(ENDPOINTS.SPiD[env]));
};
