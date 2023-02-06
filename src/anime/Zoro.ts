import { load } from "cheerio";
import Provider, { Episode, StreamingServers, SubbedSource } from "../Provider";
import { ProviderType } from "../API";
import { Result } from "../Core";

export default class Zoro extends Provider {
    private api:string = `${this.baseURL}/ajax/v2`;

    constructor() {
        super("https://zoro.to", ProviderType.ANIME);
    }

    public async search(query:string): Promise<Array<Result>> {
        const dom = await this.fetch(`${this.baseURL}/search?keyword=${encodeURIComponent(query)}`);
        const results = [];

        const $ = load(dom.text());
        
        $(".film_list-wrap > div.flw-item").map((index, element) => {
            const title = $(element).find('div.film-detail h3.film-name a.dynamic-name').attr('title').trim().replace(/\\n/g, '');
            const id = $(element).find('div:nth-child(1) > a').last().attr('href');
            const url = this.baseURL + id;

            results.push({
                url,
                title
            })
        })

        return results;
    }

    public async getEpisodes(id:string): Promise<Episode[]> {
        const episodes = [];

        const request = await this.fetch(`${this.api}/episode/list/${id.split("-").pop()}`, {
            headers: {
                "X-Requested-With": "XMLHttpRequest",
                Referer: `${this.baseURL}/watch/${id}`
            }
        })

        const $ = load(request.json().html);
        $("div.detail-infor-content > div > a").map((index, element) => {
            const number = parseInt($(element).attr('data-number'));
            const title = $(element).attr('title');
            const id = $(element).attr("href");
            const url = this.baseURL + id;

            const episode:Episode = {
                id: id,
                url: url,
                title: "Ep. " + number + " - " + title
            }

            episodes.push(episode);
        })
        
        return episodes;
    }

    public async getSources(id:string, server:StreamingServers = StreamingServers.VidCloud): Promise<SubbedSource> {
        const result:SubbedSource = {
            sources: [],
            subtitles: [],
            intro: {
                start: 0,
                end: 0
            }
        }

        if (id.startsWith('http')) {
            const serverUrl = new URL(id);
            switch (server) {
                case StreamingServers.VidStreaming:
                case StreamingServers.VidCloud:
                    return await this.extractVidCloud(serverUrl).catch((err) => {
                        console.error(err);
                        return result;
                    });
                case StreamingServers.StreamSB:
                    return await this.extractStreamSB(serverUrl).catch((err) => {
                        console.error(err);
                        return result;
                    });
                case StreamingServers.StreamTape:
                    return await this.extractStreamTape(serverUrl).catch((err) => {
                        console.error(err);
                        return result;
                    });
                default:
                case StreamingServers.VidCloud:
                    return await this.extractVidCloud(serverUrl).catch((err) => {
                        console.error(err);
                        return result;
                    });
            }
        }
        const subOrDub:SuborDub = id.split('$')?.pop() === 'dub' ? SuborDub.DUB : SuborDub.SUB;
        id = `${this.baseURL}/watch/${id.replace(/\$auto|\$sub|\$dub/gi, '')}`;

        const fetchReq = await this.fetch(`${this.baseURL}/ajax/v2/episode/servers?episodeId=${id.split('?ep=')[1]}`);
        const $ = load(fetchReq.json().html);

        /**
         * vidtreaming -> 4
         * rapidcloud  -> 1
         * streamsb -> 5
         * streamtape -> 3
        */
        let serverId = '';
        try {
            switch (server) {
            case StreamingServers.VidCloud:
                // Index 1 works, but since the m3u8s expire its better to use VidStreaming.
                serverId = this.retrieveServerId($, /*1*/4, subOrDub);

                if (!serverId) throw new Error('RapidCloud not found');
                break;
            case StreamingServers.VidStreaming:
                serverId = this.retrieveServerId($, 4, subOrDub);

                if (!serverId) throw new Error('vidtreaming not found');
                break;
            case StreamingServers.StreamSB:
                serverId = this.retrieveServerId($, 5, subOrDub);

                if (!serverId) throw new Error('StreamSB not found');
                break;
            case StreamingServers.StreamTape:
                serverId = this.retrieveServerId($, 3, subOrDub);

                if (!serverId) throw new Error('StreamTape not found');
                break;
            }
        } catch (err) {
            throw new Error(err.message);
        }

        const req = await this.fetch(`${this.baseURL}/ajax/v2/episode/sources?id=${serverId}`);
        return await this.getSources(req.json()?.link, server);
    }

    private retrieveServerId ($: any, index: number, subOrDub: SuborDub) {
        return $(`div.ps_-block.ps_-block-sub.servers-${subOrDub} > div.ps__-list > div`).map((i: any, el: any) => ($(el).attr('data-server-id') === `${index}` ? $(el) : null)).get()[0]?.attr('data-id')!;
    };
}

enum SuborDub {
    SUB = "sub",
    DUB = "dub"
}