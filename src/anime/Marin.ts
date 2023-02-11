import Provider, { Episode, SubbedSource } from "../Provider";
import { ProviderType } from "../API";
import { Result } from "../Core";
import { load } from "cheerio";

export default class Marin extends Provider {
    /**
     * REQUIRES MARIN MOE SESSION COOKIE
     */
    constructor() {
        super("https://marin.moe", ProviderType.ANIME);
    }

    // TODO: Use GET instead of POST
    public async search(query:string): Promise<Array<Result>> {
        const token = await this.getToken();
        /*
        const req = await this.fetch(`${this.baseURL}/anime`, {
            method: "POST",
            body: JSON.stringify({ search: query }),
            headers: {
                Cookie: `__ddg1_=;__ddg2_=;marinmoe_session=${token};`,
                Referer: `${this.baseURL}`,
            }
        });
        const data:SearchResponse = req.json();

        if (!data.props.anime_list) {
            return [];
        }
        return data.props.anime_list.data.map((item) => ({
            title: item.title,
            url: `${this.baseURL}/anime/${item.slug}`
        }));
        */
        console.log(token);
        return null;
    }

    public async getEpisodes(id: string): Promise<Episode[]> {
        id = id.split("/anime/")[1];
        const req = await this.fetch(`${this.baseURL}/anime/${id}`);

        const $ = load(req.text());
        const data:AnimeDetail = JSON.parse($("#__NEXT_DATA__").html());

        const epData = data.props.episode_list.data;

        const episodes:any[] = [];

        epData.map((item) => {
            const number = item.sort;
            const title = item.title;
            episodes.push({
                id: `/anime/${id}/${item.slug}`,
                number,
                title,
                url: `${this.baseURL}/anime/${id}/${item.slug}`
            })
        })
        return episodes;
    }

    public async getSources(id: string): Promise<SubbedSource> {
        const req = await this.fetch(`${this.baseURL}${id}`)
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

    public async getToken() {
        const token: string[] = [];
      
        const response = await this.fetch('https://marin.moe/anime', {
            headers: {
                Referer: 'https://marin.moe/anime',
                Cookie: '__ddg1_=;__ddg2_=;',
            },
        });
      
        token.push(response.headers['set-cookie']![1].replace('marinmoe_session=', '').split(';')[0]);
        token.push(response.headers['set-cookie']![0].replace('XSRF-TOKEN=', '').split(';')[0]);
      
        return token;
    }
}

interface SearchResponse {
    component: string;
    props: {
        errors: any;
        anime_list: {
            data: [{
                title: string;
                slug: string;
                cover: string;
                type: string;
                year: string;
            }];
            links: {
                first: string;
                last: string;
                next: string|null;
                prev: string|null;
            };
            meta: {
                current_page: number;
                from: number;
                last_page: number;
                per_page: number;
                to: number;
                total: number;
                path: string;
                links: [{
                    url: string|null;
                    label: string;
                    active: boolean;
                }];
            };
        };
        disqus: {
            shortname: string;
            enabled: boolean;
        };
        search_tax: string;
        sort_list: {
            "add-a": string;
            "add-d": string;
            "az-a": string;
            "az-d": string;
            "rel-a": string;
            "rel-d": string;
            "vdy-a": string;
            "vdy-d": string;
            "vmt-a": string;
            "vmt-d": string;
            "vtt-a": string;
            "vtt-d": string;
            "vwk-a": string;
            "vwk-d": string;
            "vyr-a": string;
            "vyr-d": string;
        };
        taxonomy_list: any;
    };
    url: string;
    version: string;
}

interface AnimeDetail {
    component: string;
    props: {
        errors: any;
        anime: {
            title: string;
            alt_titles: {
                Official_Title: [Title];
                Short: [Title];
                Synonym: [Title];
            };
            audio_list: [{
                id: number;
                name: string;
                code: string;
            }];
            content_rating: {
                id: number;
                name: string;
            };
            cover: string;
            description: string;
            first_episode: string;
            genre_list: [{
                name: string;
                slug: string;
                cover: string;
                count: number;
                description: string;
            }];
            group_list: [{
                name: string;
                slug: string;
                tag: string;
                description: string;
                cover: string;
                count: number;
            }];
            last_episode: string;
            production_list: [{
                name: string;
                slug: string;
                cover: string;
                description: string;
                count: number;
            }];
            release_date: string;
            resolution_list: [{
                id: number;
                name: string;
                slug: string;
                sort: number;
            }];
            similar_list: [{
                title: string;
                cover: string;
                slug: string;
                type: string;
                year: string;
            }];
            slug: string;
            source_list: [{
                id: number;
                name: string;
                slug: string;
            }];
            status: {
                id: number;
                name: string;
            };
            subtitle_list: [{
                id: number;
                code: string;
                name: string;
            }];
            type: {
                id: number;
                name: string;
            };
        };
        disqus: {
            shortname: string;
            enabled: boolean;
        };
        episode_list: {
            data: [{
                cover: string;
                release_ago: string;
                release_date: string;
                slug: string;
                sort: number;
                status: number;
                title: string;
                type: number;
                video_count: number;
            }];
            links: {
                first: string;
                last: string;
                next: string|null;
                prev: string|null;
            };
            meta: {
                current_page: number;
                from: number;
                last_page: number;
                per_page: number;
                to: number;
                total: number;
                path: string;
                links: [{
                    url: string|null;
                    label: string;
                    active: boolean;
                }]
            };
        };
        init: boolean;
        sort_list: {
            "add-a": string;
            "add-d": string;
            "az-a": string;
            "az-d": string;
            "rel-a": string;
            "rel-d": string;
            "vdy-a": string;
            "vdy-d": string;
            "vmt-a": string;
            "vmt-d": string;
            "vtt-a": string;
            "vtt-d": string;
            "vwk-a": string;
            "vwk-d": string;
            "vyr-a": string;
            "vyr-d": string;
        };
        ziggy: {
            defaults: [any];
            location: string;
            port: string|null;
            routes: {
                "anime.index": { uri: string; methods: string[] };
                "anime.random": { uri: string; methods: string[] };
                "anime.show": { uri: string; methods: string[] };
                "episode.index": { uri: string; methods: string[] };
                "episode.show": { uri: string; methods: string[] };
                "genre.index": { uri: string; methods: string[] };
                "genre.show": { uri: string; methods: string[] };
                "group.index": { uri: string; methods: string[] };
                "group.show": { uri: string; methods: string[] };
                "home": { uri: string; methods: string[] };
                "production.index": { uri: string; methods: string[] };
                "production.show": { uri: string; methods: string[] };
            };
            url: string;
        };
    };
    url: string;
    version: string;
}
interface Title {
    sort: number;
    language: {
        id: number;
        name: string;
        code: string;
    };
    text: string;
}