import { config } from "../../config";
import Anime, { Episode, SearchResponse, Source, SubbedSource, Subtitle } from "./Anime";
import Cronchy from "cronchy";

export default class CrunchyRoll extends Anime {
    private credentials:Credentials;
    private config = config.mapping.provider.CrunchyRoll;
    private cronchy:Cronchy;
    public hasInit = false;

    constructor() {
        super("https://www.crunchyroll.com", "CrunchyRoll");
        this.credentials = {
            email: this.config.email,
            password: this.config.password
        }
        this.cronchy = new Cronchy(this.credentials.email, this.credentials.password);
    }

    public async init() {
        await this.cronchy.login();
        this.hasInit = true;
        setInterval(() => {
            this.cronchy.login();
        }, 25000)
        return this.cronchy;
    }

    public async search(query:string): Promise<Array<SearchResponse>> {
        const results = [];
        const json:CrunchySearchResponse = await this.cronchy.search(encodeURIComponent(query), 8).catch((err) => {
            return null;
        });

        if (!json) {
            if (config.crawling.debug) {
                console.log("Unable to fetch data for " + query + " - " + this.providerName);
            }
            return [];
        }

        const data:Data[] = json.data;
        const item = data[1] ? data[1] : data[0];
        const items:Item[] = item ? item.items : null;
        if (!items) {
            console.log("Unable to parse data.");
            return [];
        }
        items.map((item, index) => {
            const images = item.images.poster_tall;
            const url = `${this.baseUrl}/series/${item.id}`;
            const id = `/series/${item.id}`;
            const title = item.title;
            const img = images[0][images.length - 1].source;

            results.push({
                url,
                id,
                title,
                img
            });
        })
        return results;
    }

    public async getEpisodes(id: string, locale?:string, mediaType?:string): Promise<Episode[]> {
        locale = locale ? locale : "en-US";
        mediaType = mediaType ? mediaType : "series";

        if (!locale || !mediaType) {
            throw new Error("Locale or media type not found");
        }

        const showId = id.includes("/series/") ? id.split("/series/")[1] : id;

        const result = [];
        const episodes = await this.cronchy.getEpisodes(showId, locale, mediaType, false).catch((err) => {
            console.error(err);
            return null;
        });
        if (!episodes) {
            return [];
        }
        episodes.episodes.map((element, index) => {
            const episode:Episode = {
                id: element.id,
                url: this.baseUrl + element.__href__,
                title: element.title,
            }
            result.push(episode);
        })
        return result;
    }

    public async getSources(id: string, locale?:string): Promise<SubbedSource> {
        locale = locale ? locale : "en-US";
        const sources = await this.cronchy.getSources(id, locale);

        const sourceData:Source[] = [];
        const subData:Subtitle[] = [];
        const result:SubbedSource = {
            sources: sourceData,
            subtitles: subData,
            intro: {
                start: 0,
                end: 0,
            },
        }

        sources.sources.map((element, index) => {
            const source:Source = {
                isM3U8: element.isM3U8,
                url: element.url,
                quality: element.quality,
            }
            sourceData.push(source);
        })

        sources.subtitles.map((element, index) => {
            const subtitle:Subtitle = {
                url: element.url,
                lang: element.lang,
                label: element.lang
            }
            subData.push(subtitle);
        })

        return result;
    }
}

interface CrunchySearchResponse {
    total: number;
    data: Data[];
}

interface Data {
    type: string;
    count: number;
    items: [Item];
}

interface Item {
    title: string;
    description: string;
    slug: string;
    slug_title: string;
    linked_resource_key: string;
    promo_title: string;
    type: "series"|"objects"|"movie_listing"|"episode"|"top_results";
    series_metadata: {
        audio_locales: [string]
        availability_notes: string;
        episode_count: number;
        extended_description: string;
        extended_maturity_rating: any;
        is_dubbed: boolean;
        is_subbed: boolean;
        is_mature: boolean;
        is_simulcast: boolean;
        mature_blocked: boolean;
        maturity_ratings: [string]
        season_count: number;
        series_launch_year: number;
        subtitle_locales: [string];
        tenant_categories: [string]; // Genres
    };
    new: boolean;
    search_metadata: {
        score: number;
    };
    external_id: string;
    promo_description: string;
    channel_id: string;
    images: {
        poster_tall: [Poster[]];
        poster_wide: [Poster[]];
    }
    id: string;
}

interface Poster {
    height: number;
    source: string;
    type: "poster_tall"|"poster_wide";
    width: number;
}

interface Credentials {
    email: string;
    password: string;
}