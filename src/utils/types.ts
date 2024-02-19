export type NonFunctionMembers<T> = {
    [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

export type Optional<T> = T | null | undefined;

export type GenericObject<T = unknown> = Record<string, T>;

export type EncodeChar = '!' | '\'' | '(' | ')' | '~' | '%20' | '%00';

export type Environment = 'LOCAL' | 'DEV' | 'PRE' | 'PRO' | 'PRO_NO' | 'PRO_FI' | 'PRO_DK';


/**
 * @typedef {object} HasSessionSuccessResponse

 * @property {string} userStatus - Example: 'notConnected' or 'connected'. Deprecated, use
 * `Identity.isConnected()`
 * @property {string} baseDomain - Example: 'localhost'
 * @property {string} id - Example: '58eca10fdbb9f6df72c3368f'. Obsolete
 * @property {number} userId - Example: 37162


 * @property {number} expiresIn - Example: 30 * 60 * 1000 (for 30 minutes)
 * @property {number} serverTime - Example: 1506285759
 * @property {string} sig - Example: 'NCdzXaz4ZRb7...' The sig parameter is a concatenation of an
 * HMAC SHA-256 signature string, a dot (.) and a base64url encoded JSON object (session).
 * {@link http://techdocs.spid.no/sdks/js/response-signature-and-validation/}

 * @property {string} givenName - (Only for connected users) Example: 'Bruce'
 * @property {string} familyName - (Only for connected users) Example: 'Wayne'
 * @property {string} gender - (Only for connected users) Example: 'male', 'female', 'undisclosed'
 * @property {string} photo - (Only for connected users) Example:
 * 'http://www.srv.com/some/picture.jpg'


 * @property {string} pairId
 * @property {string} sdrn
 */

export interface UserSession {
    /**
     * @property {number} serverTime
     * @example 1506285759
     */
    serverTime:               number;
    /**
     * @property {number} expiresIn
     * @description Session TTL
     * @example 30 * 60 * 1000 (for 30 minutes)
     */
    expiresIn:                number;
    /**
     * @property {string} baseDomain
     * @description Domain on which the session cookie is set
     * @example 'localhost'
     */
    baseDomain:               string;
    /**
     * @property {number} userId
     * @description Number-based used identifier
     * @example 23490231
     */
    userId:                   number;
    /**
     * @property {string} uuid
     * @description Globally unique user identifier
     * @example 'b3b23aa7-34f2-5d02-a10e-5a3455c6ab2c'
     */
    uuid:                     string;
    /**
     * @property {string} displayName
     * @description Username (displayed name) of a connected user
     * @example 'batman'
     */
    displayName:              string;
    /**
     * @property {string} givenName
     * @description First name of a connected user
     * @example 'Bruce'
     */
    givenName:                string;
    /**
     * @property {string} familyName
     * @description Last name of a connected user
     * @example 'Wayne'
     */
    familyName:               string;
    /**
     * @property {string} gender -
     * @description Specified Gender of a connected users
     * @example 'male'
     * @example 'female'
     * @example 'undisclosed'
     */
    gender:                   string;
    /**
     * @property {string} photo
     * @description URL to a profile picture of a connected user
     * @example 'http://www.srv.com/some/picture.jpg'
     */
    photo:                    string;
    /**
     * @property {boolean} result
     * @description Used for validating whether the user is connected to a given merchant and whether
     * said merchant can access user's data. It means that the merchant
     * id is in the list of merchants listed of this user in the database Example: false
     */
    result:                   boolean;
    /**
     * @property {boolean} tracking
     * @description
     * @example
     */
    tracking:                 boolean;
    /**
     * @property {boolean} clientAgreementAccepted - (Only for connected users)
     */
    clientAgreementAccepted:  boolean;
    /**
     * @property {boolean} defaultAgreementAccepted - (Only for connected users)
     */
    defaultAgreementAccepted: boolean;
    /**
     * @property {string} sp_id - Example: 'eyJjbGllbnRfaWQ...'
     */
    sp_id:                    string;
    merchantId:               string;
    pairId:                   string;
    sdrn:                     string;
    sig:                      string;
    [key: string]:            unknown
}
