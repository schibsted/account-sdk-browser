export default config;
export const ENDPOINTS: any;
export const NAMESPACE: any;
/**
 * Core configuration used by the SDK
 * @type {Object}
 * @memberof core
 * @prop {object} ENDPOINTS - URL to some of the services that users of this SDK may interact with
 * @prop {object} ENDPOINTS.SPiD - SPiD endpoints
 * @prop {string} ENDPOINTS.SPiD.LOCAL - Local endpoint (for Identity team)
 * @prop {string} ENDPOINTS.SPiD.DEV - Dev environment (for Identity team)
 * @prop {string} ENDPOINTS.SPiD.PRE - Staging environment
 * @prop {string} ENDPOINTS.SPiD.PRO - Production environment Sweden
 * @prop {string} ENDPOINTS.SPiD.PRO_NO - Production environment Norway
 * @prop {string} ENDPOINTS.SPiD.PRO_FI - Production environment Finland
 * @prop {string} ENDPOINTS.SPiD.PRO_DK - Production environment Denmark
 * @prop {object} ENDPOINTS.BFF - Endpoints used with new GDPR-compliant web flows
 * @prop {string} ENDPOINTS.BFF.LOCAL - Local endpoint (for Identity team)
 * @prop {string} ENDPOINTS.BFF.DEV - Dev environment (for Identity team)
 * @prop {string} ENDPOINTS.BFF.PRE - Staging environment
 * @prop {string} ENDPOINTS.BFF.PRO - Production environment Sweden
 * @prop {string} ENDPOINTS.BFF.PRO_NO - Production environment Norway
 * @prop {string} ENDPOINTS.BFF.PRO_FI - Production environment Finland
 * @prop {string} ENDPOINTS.BFF.PRO_DK - Production environment Denmark
 * @prop {object} ENDPOINTS.SESSION_SERVICE - Endpoints to check global user session data
 * @prop {string} ENDPOINTS.SESSION_SERVICE.LOCAL - Local endpoint (for Identity team)
 * @prop {string} ENDPOINTS.SESSION_SERVICE.DEV - Dev environment (for Identity team)
 * @prop {string} ENDPOINTS.SESSION_SERVICE.PRE - Staging environment
 * @prop {string} ENDPOINTS.SESSION_SERVICE.PRO - Production environment Sweden
 * @prop {string} ENDPOINTS.SESSION_SERVICE.PRO_NO - Production environment Norway
 * @prop {string} ENDPOINTS.SESSION_SERVICE.PRO_FI - Production environment Finland
 * @prop {string} ENDPOINTS.SESSION_SERVICE.PRO_DK - Production environment Denmark
 */
declare const config: Object;
