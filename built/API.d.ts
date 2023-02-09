/// <reference types="node" />
import { Options, Response } from "./libraries/promise-request";
import { ReadStream, WriteStream } from "fs";
export default class API {
    private userAgent;
    providerType: ProviderType;
    config: {
        debug: boolean;
        cache_timeout: number;
        encryptionKey: string;
        storage: string;
        isMacOS: boolean;
        poppler_path: string;
        web_server: {
            url: string;
            main_url: string;
            cors: string[];
            port: number;
        };
        AniList: {
            SEASON: string;
            SEASON_YEAR: number;
            NEXT_SEASON: string;
            NEXT_YEAR: number;
            oath_id: number;
            oath_secret: string;
        };
        database_url: string;
        is_sqlite: boolean;
    };
    constructor(type: ProviderType, options?: any);
    loadConfig(options?: any): void;
    fetch(url: string, options?: Options): Promise<Response>;
    stream(url: string, stream: ReadableStream | WritableStream | ReadStream | WriteStream, options?: Options): Promise<unknown>;
    wait(time: number): Promise<unknown>;
    getRandomInt(max: any): number;
    makeId(length: any): string;
    stringSearch(string: string, pattern: string): number;
    /**
 * @description Encrypts a string to a UUID
 * @param url URL/string to encrypt
 * @returns string
 */
    encrypt(url: any): string;
    /**
     * @description Decrypts an UUID to a string
     * @param url URL/string to decrypt
     * @returns string
     */
    decrypt(url: any): string;
    solveCaptcha3(key: string, anchorLink: string, url: string): Promise<string>;
    solveCaptcha3FromHTML(html: string, anchorLink: string, url: string): Promise<string>;
}
export declare enum ProviderType {
    ANIME = "ANIME",
    MANGA = "MANGA",
    NOVEL = "NOVEL",
    META = "META",
    NONE = "NONE"
}
