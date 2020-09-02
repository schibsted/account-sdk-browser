export class Identity {
    constructor(options: {
        clientId: string,
        env?: string | null,
        log?: (message?: any, ...params: any[] ) => void,
        redirectUri?: string | null })

    hasSession(): Promise<any>
    logSettings(): void
    _enableSessionCaching: boolean;
    _itpMode: boolean;
}
