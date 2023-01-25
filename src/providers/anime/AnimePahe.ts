import { config } from "../../config";
import Anime, { Episode, SearchResponse, SubbedSource } from "./Anime";

export default class AnimePahe extends Anime {
    constructor() {
        super("https://animepahe.com", "AnimePahe");
    }

    public async search(query:string): Promise<Array<SearchResponse>> {
        const req = await this.fetch(`${this.baseUrl}/api?m=search&q=${encodeURIComponent(query)}`);
        const data = req.json();

        if (!data.data) {
            if (config.crawling.debug) {
                console.log("Unable to fetch data for " + query + " - " + this.providerName);
            }
            return [];
        }
        return data.data.map((item:Result) => ({
            id: item.session,
            title: item.title,
            img: item.poster,
            url: `${this.baseUrl}/anime/${item.session}`
        }));
    }

    public async getEpisodes(id: string): Promise<Episode[]> {
        const page = 0;
        const res = await this.fetch(`${this.baseUrl}/api?m=release&id=${id}&sort=episode_asc&page=${page}`);

        const epData = res.json().data;

        const episodes:any[] = [];

        epData.map((item:any) => {
            const sessionId = item.session;
            const number = item.episode;
            const title = item.title.length > 0 ? item.title : `Episode ${number}`;
            episodes.push({
                id: sessionId,
                number,
                title,
                url: `${this.baseUrl}/play/${id}/${sessionId}`
            })
        })
        return episodes;
    }

    // REQUIRES A M3U8 PROXY
    // Header must include a referer of https://kwik.cx
    public async getSources(id: string): Promise<SubbedSource> {
        const req = await this.fetch(`${this.baseUrl}/api?m=links&id=${id}`, {
            headers: {
                Referer: this.baseUrl
            }
        })
        const data = req.json();
        const links = data.data.map((item:any) => {
            return {
                quality: Object.keys(item)[0],
                iframe: item[Object.keys(item)[0]].kwik,
                size: item[Object.keys(item)[0]].filesize,
            }
        })

        const sources:SubbedSource = {
            sources: [],
            subtitles: [],
            intro: {
                start: 0,
                end: 0
            }
        };
        const promises = [];

        for (const link of links) {
            const promise = new Promise(async(resolve, reject) => {
                // Kwik extractor contains a URL and whether it's an m3u8.
                // But only one source, so we can just take the first one.
                const res = await this.extractKwik(new URL(link.iframe));
                sources.sources.push(res.sources[0]);
                resolve(true);
            })
            promises.push(promise);
        }
        await Promise.all(promises);
        return sources;
    }
}

interface Result {
    id: number;
    title: string;
    type: string;
    episodes: number;
    status: string;
    season: string;
    year: number;
    score: number;
    poster: string;
    session: string;
}