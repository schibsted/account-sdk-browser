import { GenericObject } from '../src/utils/types';

export class MockStorage implements Storage {
    [name: string]: unknown;

    // these should be readonly, but for simplicity it's left as mutable.
    store: GenericObject<string> = {};

    length: number = 0;

    clear(): void {
        this.store = {};
    }

    getItem(key: string): string | null {
        return this.store[key] || null;
    }

    key(index: number): string | null {
        if (index >= this.length)
            return null;
        return Object.keys(this.store)[index] || null;
    }

    removeItem(key: string): void {
        delete this.store[key];
        this.length -= 1;
    }

    setItem(key: string, value: string): void {
        this.store[key] = value;
        this.length += 1;
    }
}
