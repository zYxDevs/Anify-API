import { load } from "cheerio";
import Provider, { Episode, StreamingServers, SubbedSource } from "../Provider";
import { ProviderType } from "../API";
import { Result } from "../Sync";

export default class GogoAnime extends Provider {
    private api = "https://ajax.gogo-load.com/ajax";

    constructor() {
        super("https://www1.gogoanime.bid", ProviderType.ANIME);
    }

    public async search(query:string): Promise<Array<Result>> {
        const dom = await this.fetch(`${this.baseURL}/search.html?keyword=${encodeURIComponent(query)}`);
        const results = [];

        const $ = load(dom.text());

        $("div.last_episodes > ul > li").map((index, element) => {
            const title = $(element).find('p.name > a').attr('title')!;
            const id = "/category/" + $(element).find('p.name > a').attr('href')?.split('/')[2]!;
            const url = this.baseURL + id;

            results.push({
                url,
                title: title
            })
        })

        return results;
    }

    public async getEpisodes(id:string): Promise<Episode[]> {
        const episodes = [];

        const dom = await this.fetch(`${this.baseURL}${id}`);
        const $ = load(dom.text());
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
                url: `${this.baseURL}${$(el).find(`a`).attr('href')?.trim()}`,
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
            const res = await this.fetch(`${this.baseURL}${id}`);
        
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

    public async fetchRecentEpisodes(page: number = 1, type: number = 1): Promise<RecentEpisode[]> {
        try {
            const res = await this.fetch(`${this.api}/page-recent-release.html?page=${page}&type=${type}`);

            const $ = load(res.text());

            const recentEpisodes = [];

            $('div.last_episodes.loaddub > ul > li').each((i, el) => {
                recentEpisodes.push({
                    id: $(el).find('a').attr('href')?.split('/')[1]?.split('-episode')[0]!,
                    episodeId: $(el).find('a').attr('href')?.split('/')[1]!,
                    episodeNumber: parseInt($(el).find('p.episode').text().replace('Episode ', '')),
                    title: $(el).find('p.name > a').attr('title')!,
                    image: $(el).find('div > a > img').attr('src'),
                    url: `${this.baseURL}${$(el).find('a').attr('href')?.trim()}`,
                });
            });

            const hasNextPage = !$('div.anime_name_pagination.intro > div > ul > li').last().hasClass('selected');

            return recentEpisodes;
        } catch (err) {
            throw new Error('Something went wrong. Please try again later.');
        }
    };
}

interface RecentEpisode {
    id: string;
    episodeId: string;
    episodeNumber: number;
    title: string;
    image: string;
    url: string;
}