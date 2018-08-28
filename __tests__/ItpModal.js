import ItpModal, { eventValidatorFunc } from '../src/ItpModal';
import { EventEmitter } from 'events';

const fakeSpid = {
    makeUrl: (path) => (new URL(path, 'https://idp.example')).href
}

describe('ItpModal', () => {
    it('should be possible to construct a modal', () => {
        const modal = new ItpModal(fakeSpid);
        expect(modal).toBeDefined();
        expect(modal._iframeUrl).toBe('https://idp.example/authn/itp');
    });

    describe('standard validator', () => {
        it('should validate _iframeUrl', () => {
            const itpModal = { _iframeUrl: 'http://foo.example' };
            const event = { origin: 'http://foo.example', data: 123 };
            expect(eventValidatorFunc(itpModal, event)).toBeTruthy();
        });

        it('should fail if event.origin is a child of _iframeUrl', () => {
            const itpModal = { _iframeUrl: 'http://foo.example' };
            const event = { origin: 'http://child.foo.example', data: 123 };
            expect(eventValidatorFunc(itpModal, event)).toBe(false);
        });

        it('should fail if data is absent in the event', () => {
            const itpModal = { _iframeUrl: 'http://foo.example' };
            const event = { origin: 'http://foo.example' };
            expect(eventValidatorFunc(itpModal, event)).toBeFalsy();
        });
    });

    describe('show', () => {
        const realAppendChild = document.body.appendChild;
        const childNotifier = new EventEmitter();

        // We can't properly simulate `event.origin` in jsdom, so need a workaround
        const postMsgValidator =
            (itp, ev) => ev.data && itp._iframeUrl.startsWith(ev.data.fakeOrigin);

        beforeEach(() => {
            document.body.appendChild = child => {
                realAppendChild.call(document.body, child);
                childNotifier.emit('child', child);
            }
        });

        afterEach(() => {
            document.body.appendChild = realAppendChild;
        });

        it('should show and close on valid postMessage', () => {
            const modal = new ItpModal(fakeSpid, null, null, null, postMsgValidator);
            const sessionData = { whatever: 123 };
            childNotifier.once('child', () => {
                setTimeout(() => {
                    window.postMessage({ fakeOrigin: 'https://idp.example', sessionData }, '*');
                }, 1);
            });
            const promise = modal.show();
            return expect(promise).resolves.toBe(sessionData);
        });

        it('should show and close when clicked', () => {
            const modal = new ItpModal(fakeSpid);
            childNotifier.once('child', child => {
                setTimeout(() => child.click(), 1);
            });
            return expect(modal.show()).rejects.toBe('cancel');
        });

        it('should be removed from DOM after clicking', async () => {
            const modal = new ItpModal(fakeSpid);
            let isChildPartOfDOM;
            childNotifier.once('child', child => {
                isChildPartOfDOM = () => document.body.contains(child);
                setTimeout(() => child.click(), 1);
            });
            await expect(modal.show()).rejects.toBe('cancel');
            return new Promise((resolve) => {
                setTimeout(() => {
                    expect(isChildPartOfDOM()).toBe(false);
                    resolve();
                }, 501);
            });
        });

        it('should not process any postMessage that fails validation', () => {
            const alwaysFalseValidator = () => false;
            const modal = new ItpModal(fakeSpid, null, null, null, alwaysFalseValidator);
            childNotifier.once('child', child => {
                setTimeout(() => {
                    window.postMessage({ fakeOrigin: 'https://idp.example', sessionData: {} }, '*');
                }, 1);
                setTimeout(() => child.click(), 50);
            });
            return expect(modal.show()).rejects.toBe('cancel');
        });

        it('should fail if sessionData contains an error', () => {
            const modal = new ItpModal(fakeSpid, null, null, null, postMsgValidator);
            childNotifier.once('child', () => {
                setTimeout(() => {
                    window.postMessage({ fakeOrigin: 'https://idp.example', error: 'sumtin-bad-happened' }, '*');
                }, 1);
            });
            return expect(modal.show()).rejects.toBe('sumtin-bad-happened');
        });
    });
});
