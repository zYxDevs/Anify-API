import { join } from "path";
import API, { ProviderType } from "../../API";
import { Database } from "sqlite3";
import { Provider, ProviderEpisodes, Result } from "../../AniSync";
import { createWriteStream } from "fs";
import * as CryptoJS from "crypto-js";
import { load } from "cheerio";
import { config } from "../../config";

export default class Anime extends API {
    public baseUrl:string = undefined;
    public providerName:string = undefined;

    private db = new Database(config.crawling.database_path);

    constructor(baseUrl:string, providerName:string) {
        super(ProviderType.ANIME);
        this.baseUrl = baseUrl;
        this.providerName = providerName;
    }

    public async search(query?:string): Promise<SearchResponse[]> {
        throw new Error("Method not implemented.");
    }

    public async getEpisodes(id?:string): Promise<Episode[]> {
        throw new Error("Method not implemented.");
    }

    public async getSources(any?): Promise<SubbedSource> {
        throw new Error("Method not implemented.");
    }

    public async insert(results:Result[]): Promise<Boolean> {
        // CREATE TABLE anime(id int(7) NOT NULL, anilist longtext not null, connectors longtext not null);
        const db = this.db;
        const data = await this.getAll();
        try {
            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                let canAdd = true;

                for (let j = 0; j < data.length; j++) {
                    if (data[j].id === result.id) {
                        canAdd = false;
                    }
                }

                if (canAdd) {
                    const stmt = db.prepare("INSERT INTO anime(id, anilist, connectors) VALUES ($id, $anilist, $connectors)");
                    stmt.run({ $id: result.id, $anilist: JSON.stringify(result.anilist), $connectors: JSON.stringify(result.connectors) });
                    stmt.finalize();
                    console.log("Inserted " + result.anilist.title.english);
                }
            }
            return true;
        } catch(e) {
            console.error(e);
            return false;
        }
    }

    public async getCachedEpisodes(id:string): Promise<CachedEpisodes> {
        const db = this.db;
        return new Promise((resolve, reject) => {
            db.get("SELECT * FROM episodes WHERE id=?", [id], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    if (rows != undefined) {
                        if (rows.data === '[]') {
                            rows.data = [];
                        } else {
                            rows.data = JSON.parse(rows.data);
                        }
                        resolve(rows);
                    } else {
                        resolve(null);
                    }
                }
            });
        });
    }

    public async cacheEpisodes(id:string, data:ProviderEpisodes[]): Promise<Boolean> {
        const db = this.db;

        const curCached = await this.getCachedEpisodes(id);
        if (!curCached) {
            const stmt = db.prepare("INSERT INTO episodes(id, data, lastCached) VALUES ($id, $data, $lastCached)");
            await stmt.run({ $id: id, $data: JSON.stringify(data), $lastCached: new Date(Date.now()).getTime() });
            await stmt.finalize();
        } else {
            const stmt = db.prepare("UPDATE episodes SET data=$data, lastCached=$lastCached WHERE id=$id");
            await stmt.run({ $data: JSON.stringify(data), $lastCached: new Date(Date.now()).getTime(), $id: id });
            await stmt.finalize();
        }
        return true;
    }

    public async getCachedSources(id:string, watchId:string): Promise<CachedSources> {
        const db = this.db;
        return new Promise((resolve, reject) => {
            db.get("SELECT * FROM sources WHERE id=? AND watchId=?", [id, watchId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    if (rows != undefined) {
                        if (rows.data === '[]') {
                            rows.data = [];
                        } else {
                            rows.data = JSON.parse(rows.data);
                        }
                        resolve(rows);
                    } else {
                        resolve(null);
                    }
                }
            });
        });
    }

    public async cacheSources(id:string, watchId:string, data:SubbedSource): Promise<Boolean> {
        const db = this.db;

        const curCached = await this.getCachedSources(id, watchId);
        if (!curCached) {
            const stmt = db.prepare("INSERT INTO sources(id, watchId, data, lastCached) VALUES ($id, $watchId, $data, $lastCached)");
            await stmt.run({ $id: id, $watchId: watchId, $data: JSON.stringify(data), $lastCached: new Date(Date.now()).getTime() });
            await stmt.finalize();
        } else {
            const stmt = db.prepare("UPDATE sources SET data=$data, lastCached=$lastCached WHERE id=$id");
            await stmt.run({ $data: JSON.stringify(data), $lastCached: new Date(Date.now()).getTime(), $id: id });
            await stmt.finalize();
        }
        return true;
    }

    public async get(id:string): Promise<Result> {
        const db = this.db;
        return new Promise((resolve, reject) => {
            db.get("SELECT * FROM anime WHERE id=?", [id], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    if (rows != undefined) {
                        rows.anilist = JSON.parse(rows.anilist);
                        rows.connectors = JSON.parse(rows.connectors);
                        resolve(rows);
                    } else {
                        resolve(null);
                    }
                }
            });
        });
    }

    public async getTotal(): Promise<number> {
        const total = await this.getAll();
        return total.length;
    }

    public async export(): Promise<String> {
        const all = await this.getAll();
        const output = join(__dirname, "../../../output.json");

        createWriteStream(output).write(JSON.stringify(all, null, 4));
        return output;
    }

    public async getAll(): Promise<Result[]> {
        const db = this.db;
        return new Promise((resolve, reject) => {
            db.all("SELECT * FROM anime", (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const results = [];
                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        results.push({
                            id: row.id,
                            anilist: JSON.parse(row.anilist),
                            connectors: JSON.parse(row.connectors)
                        });
                    }
                    resolve(results);
                }
            });
        });
    }

    public async extractGogoCDN(url:URL): Promise<SubbedSource> {
        const keys = {
            key: CryptoJS.enc.Utf8.parse('37911490979715163134003223491201'),
            secondKey: CryptoJS.enc.Utf8.parse('54674138327930866480207815084989'),
            iv: CryptoJS.enc.Utf8.parse('3134003223491201'),
        };

        const referer = url.href;
        const req = await this.fetch(referer);
        const $ = load(req.text());

        const encyptedParams = await generateEncryptedAjaxParams(url.searchParams.get('id') ?? '');

        const encryptedData = await this.fetch(`${url.protocol}//${url.hostname}/encrypt-ajax.php?${encyptedParams}`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const decryptedData = await decryptAjaxData(encryptedData.json()?.data);
        if (!decryptedData.source) throw new Error('No source found. Try a different server.');

        const sources: SubbedSource = {
            sources: [],
            subtitles: [],
            intro: {
                start: 0,
                end: 0
            }
        }

        if (decryptedData.source[0].file.includes('.m3u8')) {
            const resResult = await this.fetch(decryptedData.source[0].file.toString());
            const resolutions = resResult.text().match(/(RESOLUTION=)(.*)(\s*?)(\s*.*)/g);
            resolutions?.forEach((res: string) => {
                const index = decryptedData.source[0].file.lastIndexOf('/');
                const quality = res.split('\n')[0].split('x')[1].split(',')[0];
                const url = decryptedData.source[0].file.slice(0, index);
                sources.sources.push({
                    url: url + '/' + res.split('\n')[1],
                    isM3U8: (url + res.split('\n')[1]).includes('.m3u8'),
                    quality: quality + 'p',
                });
            });
        
            decryptedData.source.forEach((source: any) => {
                sources.sources.push({
                    url: source.file,
                    isM3U8: source.file.includes('.m3u8'),
                    quality: 'default',
                });
            });
        } else {
            decryptedData.source.forEach((source: any) => {
                sources.sources.push({
                url: source.file,
                isM3U8: source.file.includes('.m3u8'),
                quality: source.label.split(' ')[0] + 'p',
                });
            });
        
            decryptedData.source_bk.forEach((source: any) => {
                sources.sources.push({
                    url: source.file,
                    isM3U8: source.file.includes('.m3u8'),
                    quality: 'backup',
                });
            });
        }
        return sources;

        function generateEncryptedAjaxParams(id: string) {
            const encryptedKey = CryptoJS.AES.encrypt(id, keys.key, {
                iv: keys.iv,
            });
    
            const scriptValue = $("script[data-name='episode']").data().value as string;
    
            const decryptedToken = CryptoJS.AES.decrypt(scriptValue, keys.key, {
                iv: keys.iv,
            }).toString(CryptoJS.enc.Utf8);
    
            return `id=${encryptedKey}&alias=${id}&${decryptedToken}`;
        }

        function decryptAjaxData(encryptedData: string) {
            const decryptedData = CryptoJS.enc.Utf8.stringify(
                CryptoJS.AES.decrypt(encryptedData, keys.secondKey, {
                    iv: keys.iv,
                })
            );
        
            return JSON.parse(decryptedData);
        }
    }

    public async extractStreamSB(url:URL): Promise<SubbedSource> {
        throw new Error("Method not implemented yet.");
    }
    
    public async extractVidCloud(url:URL): Promise<SubbedSource> {
        const result:SubbedSource = {
            sources: [],
            subtitles: [],
            intro: {
                start: 0,
                end: 0
            }
        };

        const host = "https://rapid-cloud.co";
        const id = url.href.split('/').pop()?.split('?')[0];

        const options = {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                Referer: url.href
            },
        };

        const request = await this.fetch(`${host}/ajax/embed-6/getSources?id=${id}`, {
            headers: {
                "X-Requested-With": "XMLHttpRequest"
            }
        });

        let { sources, tracks, intro, encrypted } = request.json();

        if (!isJson(sources)) {
            const req = await this.fetch(
                'https://raw.githubusercontent.com/consumet/rapidclown/main/key.txt'
            );

            const key = req.text();
            try {
                sources = JSON.parse(CryptoJS.AES.decrypt(sources, key).toString(CryptoJS.enc.Utf8));
            } catch {
                sources = null;
            }
        }

        if (!sources) {
            return result;
        }

        for (const source of sources) {
            const req = await this.fetch(source.file, options);
            const data = req.text();
            const urls = data.split('\n').filter((line: string) => line.includes('.m3u8')) as string[];
            const qualities = data.split('\n').filter((line: string) => line.includes('RESOLUTION=')) as string[];
    
            const TdArray = qualities.map((s, i) => {
                const f1 = s.split('x')[1];
                const f2 = urls[i];
    
                return [f1, f2];
            });
    
            for (const [f1, f2] of TdArray) {
                result.sources.push({
                    url: `${source.url ? source.url : source.file.split('master.m3u8')[0]}${f2.replace('iframes', 'index')}`,
                    quality: f1.split(',')[0] + 'p',
                    isM3U8: f2.includes('.m3u8'),
                });
            }

            if (intro.end > 1) {
                result.intro = {
                    start: intro.start,
                    end: intro.end,
                };
            }
        }
    
        result.sources.push({
            url: sources[0].file,
            isM3U8: sources[0].file.includes('.m3u8'),
            quality: 'auto',
        });

        result.subtitles = tracks?.map((s: any) => ({
            url: s.file,
            lang: s.label ? s.label : 'Thumbnails',
        }));

        return result;

        function isJson(str: string) {
            try {
                JSON.parse(str);
            } catch (e) {
                return false;
            }
            return true;
        }
    }

    public async extractKwik(url:URL): Promise<SubbedSource> {
        const host = "https://animepahe.com"; // Subject to change maybe.
        const req = await this.fetch(`${url.href}`, { headers: { Referer: host } });
        const match = load(req.text()).html().match(/p\}.*kwik.*/g);
        if (!match) {
            throw new Error('Video not found.');
        }
        let arr: string[] = match[0].split('return p}(')[1].split(',');

        const l = arr.slice(0, arr.length - 5).join('');
        arr = arr.slice(arr.length - 5, -1);
        arr.unshift(l);

        const [p, a, c, k, e, d] = arr.map(x => x.split('.sp')[0]);

        const formated = this.format(p, a, c, k, e, {});
        const source = formated.match(/source=\\(.*?)\\'/g)[0].replace(/\'/g, '').replace(/source=/g, '').replace(/\\/g, '');

        const sources:SubbedSource = {
            sources: [],
            subtitles: [],
            intro: {
                start: 0,
                end: 0
            }
        }
        sources.sources.push({
            url: source,
            quality: 'auto',
            isM3U8: source.includes('.m3u8'),
        })
        return sources;
    }

    // Thanks to consumet for this.
    private format = (p: any, a: any, c: any, k: any, e: any, d: any) => {
        k = k.split('|');
        e = (c: any) => {
            return (
            (c < a ? '' : e(parseInt((c / a).toString()))) +
            ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36))
            );
        };
        if (!''.replace(/^/, String)) {
            while (c--) {
            d[e(c)] = k[c] || e(c);
            }
            k = [
            (e: any) => {
                return d[e];
            },
            ];
            e = () => {
            return '\\w+';
            };
            c = 1;
        }
        while (c--) {
            if (k[c]) {
            p = p.replace(new RegExp('\\b' + e(c) + '\\b', 'g'), k[c]);
            }
        }
        return p;
    };

    public async extractStreamTape(url:URL): Promise<SubbedSource> {
        throw new Error("Method not implemented yet.");
    }
}

interface SearchResponse {
    url: string;
    id: string;
    img: string;
    title?: string;
    romaji?: string;
    native?: string;
    year?: string;
    format?: string;
}

interface Episode {
    url: string;
    id: string;
    title: string;
}

interface Source {
    url?:string,
    file?:string,
    isM3U8:boolean,
    quality:string,
}

interface SubbedSource {
    sources: Array<Source>;
    subtitles: Array<Subtitle>;
    intro?: {
        start: number;
        end: number;
    };
}

interface Subtitle {
    url:string;
    lang:string;
    label:string;
}

interface CachedEpisodes {
    id: number;
    data: ProviderEpisodes[];
    lastCached: number;
}

interface CachedSources {
    id: number;
    data: SubbedSource;
    lastCached: number;
}

export enum StreamingServers {
    AsianLoad = 'asianload',
    GogoCDN = 'gogocdn',
    StreamSB = 'streamsb',
    MixDrop = 'mixdrop',
    UpCloud = 'upcloud',
    VidCloud = 'vidcloud',
    StreamTape = 'streamtape',
    VizCloud = 'vizcloud',
    // same as vizcloud
    MyCloud = 'mycloud',
    Filemoon = 'filemoon',
    VidStreaming = 'vidstreaming',
}

export type { SearchResponse, Episode, Source, Subtitle, SubbedSource };