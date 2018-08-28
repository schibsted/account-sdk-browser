const FADE_DURATION_MS = 500;

/**
 * A dialog that is shown after coming back from a login flow in the cases where
 * Schibsted Account is flagged as a tracking site by Apple ITP2.
 */
export default class ItpModal {
    /**
     * @param {JSONPClient} spid
     * @param {string} clientId
     * @param {string} redirectUri
     * @param {string} env
     */
    constructor(spid, clientId, redirectUri, env) {
        this._iframeUrl = spid.makeUrl('/authn/itp', {
            env,
            client_id: clientId,
            redirect_uri: redirectUri,
        });
    }

    /**
     * Show the ITP dialog
     * @returns {Promise} resolves to the hasSession data
     */
    show() {
        return new Promise((resolve, reject) => {
            const modalEl = this._buildModalElement();
            document.body.appendChild(modalEl);

            const closeModal = () => {
                modalEl.style.opacity = 0;
                window.removeEventListener('message', handlePostMessage);
                setTimeout(() => {
                    document.body.removeChild(modalEl);
                    this._restoreBodyScrolling();
                }, FADE_DURATION_MS);
            };

            const handlePostMessage = (event) => {
                if (this._iframeUrl.startsWith(event.origin) && event.data) {
                    closeModal();
                    if (event.data.sessionData) {
                        resolve(event.data.sessionData);
                        return;
                    }
                    reject(event.data.error);
                }
            };
            window.addEventListener('message', handlePostMessage);

            modalEl.onclick = () => {
                closeModal();
                reject('cancel');
            };

            // setTimeout is necessary because we need the element to be "mounted" in the DOM
            // with the old opacity (0) before setting the new opacity (1) or else we won't
            // get the CSS animation
            setTimeout(() => {
                modalEl.style.opacity = 1;
            }, 0);
        });
    }

    /**
     * Create the DOM element containing the modal dialog
     * @private
     * @returns {DOMElement}
     */
    _buildModalElement() {
        const modalEl = document.createElement('div');
        modalEl.style = this._buildStyleString({
            position: 'fixed',
            display: 'flex',
            'flex-direction': 'column',
            'align-items': 'center',
            'justify-content': 'center',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            'background-color': 'rgba(0, 0, 0, .7)',
            'transition': `opacity ${FADE_DURATION_MS}ms`,
            opacity: 0,
        });

        const iframeEl = document.createElement('iframe');
        iframeEl.sandbox = 'allow-storage-access-by-user-activation allow-same-origin allow-scripts';
        iframeEl.style = this._buildStyleString({
            width: '368px',
            height: '400px',
            'background-color': '#ffffff',
        });
        iframeEl.src = this._iframeUrl;
        modalEl.appendChild(iframeEl);
        return modalEl;
    }

    /**
     * @private
     * @param {object} style key value style properties
     * @returns {string} CSS style string
     */
    _buildStyleString(style) {
        return Object.keys(style).reduce((result, key) => `${result} ${key}: ${style[key]};`, '');
    }

    /**
     * Lock the page so it doesn't scroll under the dialog
     * @private
     * @returns {void}
     */
    _preventBodyScrolling() {
        this._originalBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden'
    }

    /**
     * Restore body scrolling
     * @private
     * @returns {void}
     */
    _restoreBodyScrolling() {
        document.body.style.overflow = this._originalBodyOverflow;
    }
}
