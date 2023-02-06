import API, { ProviderType } from "./API";
import * as CryptoJS from "crypto-js";
import { load } from "cheerio";

export default class Provider extends API {
    public baseURL:string;
    public providerType:ProviderType;

    constructor(baseURL:string, type:ProviderType) {
        super(type);
        this.baseURL = baseURL;
        this.providerType = type;
    }

    public async getEpisodes(id:string): Promise<Array<Episode>> {
        throw new Error("Not implemented yet.");      
    }

    public async getChapters(id:string): Promise<Array<Chapter>> {
        throw new Error("Not implemented yet.");      
    }

    public async getSources(id:string): Promise<SubbedSource> {
        throw new Error("Not implemented yet.");      
    }

    public async getPages(id:string): Promise<Array<Page>> {
        throw new Error("Not implemented yet.");      
    }

    public urlToId(url:string): string {
        return url.split(this.baseURL)[1];
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
                'https://github.com/enimax-anime/key/blob/e6/key.txt'
            );

            const data = req.text();
            let key = this.substringBefore(this.substringAfter(data, '"blob-code blob-code-inner js-file-line">'), '</td>');
            if (!key) {
                key = await (await this.fetch("https://raw.githubusercontent.com/enimax-anime/key/e6/key.txt")).text();
            }
            if (!key) {
                key = "c1d17096f2ca11b7";
            }
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

    private substringBefore = (str: string, toFind: string) => {
        const index = str.indexOf(toFind);
        return index == -1 ? '' : str.substring(0, index);
    };

    private substringAfter = (str: string, toFind: string) => {
        const index = str.indexOf(toFind);
        return index == -1 ? '' : str.substring(index + toFind.length);
    };
}

interface SubbedSource {
    sources: Array<Source>;
    subtitles: Array<Subtitle>;
    intro?: {
        start: number;
        end: number;
    };
}

interface Source {
    url?:string,
    file?:string,
    isM3U8:boolean,
    quality:string,
}

interface Subtitle {
    url:string;
    lang:string;
    label:string;
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

interface Episode {
    url: string;
    id: string;
    title: string;
}

interface Chapter {
    url: string;
    id: string;
    title: string;
}

interface Page {
    url:string;
    index:number;
}

export type { SubbedSource, Episode, Chapter, Page }