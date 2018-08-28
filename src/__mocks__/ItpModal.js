
const { default: Base } = jest.genMockFromModule('../ItpModal');

export default class ItpModal extends Base {
    async show() {
        return { foo: 'dummy itp modal return value' }
    }
}
