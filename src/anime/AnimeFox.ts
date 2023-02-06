import { load } from "cheerio";
import { ProviderType } from "../API";
import Provider, { Episode, SubbedSource } from "../Provider";
import { Result } from "../Core";

export default class AnimeFox extends Provider {
    constructor() {
        super("https://animefox.tv", ProviderType.ANIME);
    }

    public async search(query:string): Promise<Array<Result>> {
        const dom = await this.fetch(`${this.baseURL}/search?keyword=${encodeURIComponent(query)}`);
        const results:Result[] = [];

        const $ = load(dom.text());
        
        $("div.film_list-wrap > div").map((index, element) => {
            const id = $(element).find("div.film-poster > a").attr('href')!;
            // Title is generally just the romaji name, or the same as the jname
            const title = $(element).find("a.dynamic-name").attr('title')!;
            //const jName = $(element).find("a.dynamic-name").attr("data-jname")!;
            const url = this.baseURL + id;

            results.push({
                url,
                title: title
            })
        })
        return results;
    }

    public async getEpisodes(id: string): Promise<Episode[]> {
        const dom = await this.fetch(`${this.baseURL}${id}`);
        const $ = load(dom.text());
        const link = $("div.anisc-detail div.film-buttons a.btn").attr("href") || "";
        const episodes = await this.getEpisodesFromSources(link);
        return episodes;
    }

    public async getEpisodesFromSources(id: string): Promise<Episode[]> {
        const dom = await this.fetch(`${this.baseURL}${id}`);
        const $ = load(dom.text());
        const episodes:any[] = [];

        $("div.ss-list a.ep-item").map((index, element) => {
            episodes?.push({
                id: $(element).attr('href')?.trim(),
                number: $(element).attr("data-number"),
                url: `${this.baseURL}${$(element).attr('href')?.trim()}`,
                title: $(element).attr("title")
            });  
        })

        return episodes;
    }

    public async getSources(id: string): Promise<SubbedSource> {
        const dom = await this.fetch(`${this.baseURL}${id}`);
        const $ = load(dom.text());
        const iframe = $("#iframe-to-load").attr("src") || "";
        const streamUrl = `https://goload.io/streaming.php?id=${iframe.split('=').pop()}`;
        const extracted = await this.extractGogoCDN(new URL(streamUrl));
        return extracted;
    }
}