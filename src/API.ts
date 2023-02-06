import PromiseRequest, { Options, Response } from "./libraries/promise-request";
import { ReadStream, WriteStream } from "fs";
import * as CryptoJS from "crypto-js";

export default class API {
    private userAgent:string = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36';
    public providerType:ProviderType;
    public config = {
        debug: true,
        cache_timeout: 14400000,
        encryptionKey: "myheroacademia",
        storage: "/Users/eltik/Documents/Anify-API/storage",
        isMacOS: true,
        poppler_path: "/opt/homebrew/Cellar/poppler/22.12.0/bin",
        web_server: {
            url: "http://localhost:3060",
            main_url: "http://localhost:3000",
            cors: ["https://anify.tv", "https://api.anify.tv", "http://localhost:3000", "http://localhost:3060"],
            port: 3060
        },
        AniList: {
            SEASON: "WINTER",
            SEASON_YEAR: 2023,
            NEXT_SEASON: "SPRING",
            NEXT_YEAR: 2023,
            oath_id: -1,
            oath_secret: ""
        },
        database_url: "postgresql://postgres:password@localhost:3306"
    }

    constructor(type:ProviderType, options?) {
        this.providerType = type;
        this.loadConfig(options);
    }

    private loadConfig(options?) {
        if (process.env.DEBUG) {
            this.config.debug = process.env.DEBUG.toLowerCase() === "true";
        }
        if (process.env.CACHE_TIMEOUT) {
            this.config.cache_timeout = Number(process.env.CACHE_TIMEOUT);
        }
        if (process.env.ENCRYPTION_KEY) {
            this.config.encryptionKey = process.env.ENCRYPTION_KEY;
        }
        if (process.env.STORAGE) {
            this.config.storage = process.env.STORAGE;
        }
        if (process.env.IS_MACOS) {
            this.config.isMacOS = process.env.IS_MACOS.toLowerCase() === "true";
        }
        if (process.env.POPPLER_PATH) {
            this.config.poppler_path = process.env.POPPLER_PATH;
        }
        if (process.env.WEB_SERVER_URL) {
            this.config.web_server.url = process.env.WEB_SERVER_URL;
        }
        if (process.env.WEB_SERVER_MAIN_URL) {
            this.config.web_server.main_url = process.env.WEB_SERVER_MAIN_URL;
        }
        if (process.env.WEB_SERVER_CORS) {
            this.config.web_server.cors = process.env.WEB_SERVER_CORS.split(",");
        }
        if (process.env.WEB_SERVER_PORT) {
            this.config.web_server.port = Number(process.env.WEB_SERVER_PORT);
        }
        if (process.env.ANILIST_SEASON) {
            this.config.AniList.SEASON = process.env.ANILIST_SEASON;
        }
        if (process.env.ANILIST_SEASON_YEAR) {
            this.config.AniList.SEASON_YEAR = Number(process.env.ANILIST_SEASON_YEAR);
        }
        if (process.env.ANILIST_NEXT_SEASON) {
            this.config.AniList.NEXT_SEASON = process.env.ANILIST_NEXT_SEASON;
        }
        if (process.env.ANILIST_NEXT_YEAR) {
            this.config.AniList.NEXT_YEAR = Number(process.env.ANILIST_NEXT_YEAR);
        }
        if (process.env.ANILIST_OATH_ID) {
            this.config.AniList.oath_id = Number(process.env.ANILIST_OATH_ID);
        }
        if (process.env.ANILIST_OATH_SECRET) {
            this.config.AniList.oath_secret = process.env.ANILIST_OATH_SECRET;
        }
        if (process.env.DATABASE_URL) {
            this.config.database_url = process.env.DATABASE_URL;
        }

        if (options) {
            this.config = {
                ...this.config,
                ...options
            }
        }
    }

    public async fetch(url:string, options?:Options): Promise<Response> {
        const request = new PromiseRequest(url, {
            ...options,
            headers: {
                ...options?.headers,
                'User-Agent': this.userAgent
            }
        });
        const data = await request.request();
        return data;
    }

    public async stream(url:string, stream:ReadableStream|WritableStream|ReadStream|WriteStream, options?:Options) {
        const request = new PromiseRequest(url, {
            ...options,
            stream: true,
            headers: {
                ...options?.headers,
                'User-Agent': this.userAgent
            }
        });
        const final = await request.stream(stream).catch((err) => {
            console.error(err);
            return null;
        });
        return final;
    }

    public async wait(time:number) {
        return new Promise(resolve => {
            setTimeout(resolve, time);
        });
    }

    public getRandomInt(max):number {
        return Math.floor(Math.random() * max);
    }

    public makeId(length) {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() *
                charactersLength));
        }
        return result;
    }

    public stringSearch(string:string, pattern:string):number {
        let count = 0;
        string = string.toLowerCase();
        pattern = pattern.toLowerCase();
        string = string.replace(/[^a-zA-Z0-9 -]/g, "");
        pattern = pattern.replace(/[^a-zA-Z0-9 -]/g, "");
        
        for (let i = 0; i < string.length; i++) {
            for (let j = 0; j < pattern.length; j++) {
                if (pattern[j] !== string[i + j]) break;
                if (j === pattern.length - 1) count++;
            }
        }
        return count;
    }

        /**
     * @description Encrypts a string to a UUID
     * @param url URL/string to encrypt
     * @returns string
     */
    public encrypt(url):string {
        if (!this.config.encryptionKey) {
            return null;
        }
        const buff = Buffer.from(url);
        const encodedString = buff.toString("base64");
        const encrypted = CryptoJS.AES.encrypt(encodedString, this.config.encryptionKey).toString();
        const b64 = CryptoJS.enc.Base64.parse(encrypted);
        return b64.toString(CryptoJS.enc.Hex);
    }

    /**
     * @description Decrypts an UUID to a string
     * @param url URL/string to decrypt
     * @returns string
     */
    public decrypt(url):string {
        if (!this.config.encryptionKey) {
            return null;
        }
        const b64 = CryptoJS.enc.Hex.parse(url);
        const bytes = b64.toString(CryptoJS.enc.Base64);
        const decrypted = CryptoJS.AES.decrypt(bytes, this.config.encryptionKey);
        const decodedString = Buffer.from(decrypted.toString(CryptoJS.enc.Utf8), "base64");
        return decodedString.toString();
    }
}

export enum ProviderType {
    ANIME = "ANIME",
    MANGA = "MANGA",
    NOVEL = "NOVEL",
    META = "META",
    NONE = "NONE"
}