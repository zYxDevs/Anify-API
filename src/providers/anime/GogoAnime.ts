import Anime, { Episode, SearchResponse, StreamingServers, SubbedSource } from "./Anime";
import { load } from "cheerio";

export default class GogoAnime extends Anime {
    private api = "https://ajax.gogo-load.com/ajax";

    constructor() {
        super("https://www1.gogoanime.bid", "GogoAnime");
    }

    public async search(query:string): Promise<Array<SearchResponse>> {
        const dom = await this.fetchDOM(`${this.baseUrl}/search.html?keyword=${encodeURIComponent(query)}`, "div.last_episodes > ul > li");
        const results = [];

        const $ = load(dom.Response.text());
        
        dom.Cheerio.map((index, element) => {
            const title = $(element).find('p.name > a').attr('title')!;
            const img = $(element).find('div > a > img').attr('src');
            const id = "/category/" + $(element).find('p.name > a').attr('href')?.split('/')[2]!;
            const url = this.baseUrl + id;
            const year = $(element).find("p.released").text().trim().replace(/\\n/g, '')?.split("Released: ")[1];

            results.push({
                url,
                id,
                img,
                romaji: title,
                year: year
            })
        })

        return results;
    }

    public async getEpisodes(id:string): Promise<Episode[]> {
        const episodes = [];

        const dom = await this.fetchDOM(`${this.baseUrl}${id}`, "html");
        const $ = load(dom.Response.text());
        const ep_start = $('#episode_page > li').first().find('a').attr('ep_start');
        const ep_end = $('#episode_page > li').last().find('a').attr('ep_end');
        const movie_id = $('#movie_id').attr('value');
        const alias = $('#alias_anime').attr('value');

        const html = await this.fetch(
            `${this.api}/load-list-episode?ep_start=${ep_start}&ep_end=${ep_end}&id=${movie_id}&default_ep=${0}&alias=${alias}`
        );
        const $$ = load(html.text());

        $$('#episode_related > li').each((i, el) => {
            episodes?.push({
                id: $(el).find('a').attr('href')?.trim(),
                number: parseFloat($(el).find(`div.name`).text().replace('EP ', '')),
                url: `${this.baseUrl}${$(el).find(`a`).attr('href')?.trim()}`,
                title: $(el).find(`div.name`).text()
            });
        });
        return episodes;
    }

    public async getSources(id:string, server:StreamingServers = StreamingServers.VidStreaming): Promise<SubbedSource> {
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
            const download = `https://gogohd.net/download${serverUrl.search}`;

            switch (server) {
                case StreamingServers.GogoCDN:
                    return await this.extractGogoCDN(serverUrl).catch((err) => {
                        console.error(err);
                        return result;
                    });
                case StreamingServers.StreamSB:
                    return await this.extractStreamSB(serverUrl).catch((err) => {
                        console.error(err);
                        return result;
                    });
                default:
                    return await this.extractGogoCDN(serverUrl).catch((err) => {
                        console.error(err);
                        return result;
                    });
            }
        }

        try {
            const res = await this.fetch(`${this.baseUrl}${id}`);
        
            const $ = load(res.text());
        
            let serverUrl: URL;
        
            switch (server) {
                case StreamingServers.GogoCDN:
                    serverUrl = new URL(`https:${$('#load_anime > div > div > iframe').attr('src')}`);
                    break;
                case StreamingServers.VidStreaming:
                    serverUrl = new URL(
                        `https:${$('div.anime_video_body > div.anime_muti_link > ul > li.vidcdn > a').attr('data-video')}`
                    );
                    break;
                case StreamingServers.StreamSB:
                    serverUrl = new URL(
                        $('div.anime_video_body > div.anime_muti_link > ul > li.streamsb > a').attr('data-video')!
                    );
                    break;
                default:
                serverUrl = new URL(`https:${$('#load_anime > div > div > iframe').attr('src')}`);
                break;
            }
        
            return await this.getSources(serverUrl.href, server);
        } catch (err) {
            console.error(err);
            throw new Error('Episode not found.');
        }
    }
}