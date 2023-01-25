import PromiseRequest, { Options, Response } from "./libraries/promise-request";
import { Cheerio, load } from "cheerio";
import { ReadStream, WriteStream } from "fs";
import { config } from "./config";
import * as CryptoJS from "crypto-js";

export default class API {
    private userAgent:string = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36';
    public providerType:ProviderType;

    constructor(type:ProviderType) {
        this.providerType = type;
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

    public async fetchDOM(url:string, selector:string, options?:Options): Promise<DOM> {
        const request = new PromiseRequest(url, {
            ...options,
            headers: {
                ...options?.headers,
                'User-Agent': this.userAgent
            }
        });
        
        const data = await request.request();

        if (!data.text()) {
            throw new Error("Couldn't fetch data.");
        }

        const $ = load(data.text());
        const result = $(selector);
        const dom:DOM = {
            Response: data,
            Cheerio: result
        };
        return dom;
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

    public encrypt(url):string {
        if (!config.web_server.password) {
            return null;
        }
        const buff = Buffer.from(url);
        const encodedString = buff.toString("base64");
        const encrypted = CryptoJS.AES.encrypt(encodedString, config.web_server.password).toString();
        const b64 = CryptoJS.enc.Base64.parse(encrypted);
        return b64.toString(CryptoJS.enc.Hex);
    }

    public decrypt(url):string {
        if (!config.web_server.password) {
            return null;
        }
        const b64 = CryptoJS.enc.Hex.parse(url);
        const bytes = b64.toString(CryptoJS.enc.Base64);
        const decrypted = CryptoJS.AES.decrypt(bytes, config.web_server.password);
        const decodedString = Buffer.from(decrypted.toString(CryptoJS.enc.Utf8), "base64");
        return decodedString.toString();
    }
}

interface DOM {
    Response:Response;
    Cheerio:Cheerio<any>;
}

export enum ProviderType {
    ANIME = "ANIME",
    MANGA = "MANGA",
    NOVEL = "NOVEL",
    META = "META",
    NONE = "NONE"
}

// Base tables are below.
// CREATE TABLE anime(id int(7) NOT NULL, anilist longtext not null, connectors longtext not null);
// CREATE TABLE manga(id int(7) NOT NULL, anilist longtext not null, connectors longtext not null);
// CREATE TABLE novels(id varchar(20), title longtext not null, path longtext not null, cover longtext not null);

// Cached table can store episodes or chapters.
// CREATE TABLE episodes(id int(7) NOT NULL, data longtext not null, lastCached bigint);
// CREATE TABLE chapters(id int(7) NOT NULL, data longtext not null, lastCached bigint);
// CREATE TABLE sources(id int(7) NOT NULL, watchId longtext not null, data longtext not null, lastCached bigint);
// CREATE TABLE pages(id int(7) NOT NULL, readId longtext not null, data longtext not null, lastCached bigint);

export type { DOM };