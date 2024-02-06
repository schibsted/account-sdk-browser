export type NonFunctionMembers<T> = {
    [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

export type Optional<T> = T | null | undefined;

export type GenericObject<T = unknown> = Record<string, T>;

export type EncodeChar = '!' | '\'' | '(' | ')' | '~' | '%20' | '%00';

export type Environment = 'LOCAL' | 'DEV' | 'PRE' | 'PRO' | 'PRO_NO' | 'PRO_FI' | 'PRO_DK';
