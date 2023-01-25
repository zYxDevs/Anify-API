import Anime, { Episode, SearchResponse, SubbedSource } from "./Anime";
import { load } from "cheerio";

export default class AnimeFox extends Anime {
    constructor() {
        super("https://animefox.to", "AnimeFox");
    }

    public async search(query:string): Promise<Array<SearchResponse>> {
        const dom = await this.fetchDOM(`${this.baseUrl}/search?keyword=${encodeURIComponent(query)}`, "div.film_list-wrap > div");
        const results = [];

        const $ = load(dom.Response.text());
        
        dom.Cheerio.map((index, element) => {
            const id = $(element).find("div.film-poster > a").attr('href')!;
            // Title is generally just the romaji name, or the same as the jname
            //const title = $(element).find("a.dynamic-name").attr('title')!;
            const jName = $(element).find("a.dynamic-name").attr("data-jname")!;
            const format = $(element).find("div.fd-infor > span:nth-child(1)").text()!.split(" ")[0];
            const url = this.baseUrl + id;

            results.push({
                url,
                id,
                format,
                romaji: jName
            })
        })

        return results;
    }

    public async getRecentShows(): Promise<Array<SearchResponse>> {
        const dom = await this.fetchDOM(`${this.baseUrl}/home`, "div#main-wrapper div.container div.tab-content div.block_area-content div.film_list-wrap div.flw-item");
        const results = [];

        const $ = load(dom.Response.text());
        
        dom.Cheerio.map((index, element) => {
            const id = $(element).find("div.film-poster > a").attr('href')!;
            const title = $(element).find("a.dynamic-name").attr('title')!;
            const jName = $(element).find("a.dynamic-name").attr("data-jname")!;
            const img = $(element).find("img.film-poster-img").attr("src")!;
            const url = this.baseUrl + id;

            results.push({
                url,
                id,
                img,
                title,
                romaji: jName
            })
        })

        return results;
    }

    public async getEpisodes(id: string): Promise<Episode[]> {
        const dom = await this.fetchDOM(`${this.baseUrl}${id}`, "div.anisc-detail div.film-buttons a.btn");
        const $ = load(dom.Response.text());
        const link = $(dom.Cheerio[0]).attr("href") || "";
        const episodes = await this.getEpisodesFromSources(link);
        return episodes;
    }

    public async getEpisodesFromSources(id: string): Promise<Episode[]> {
        const dom = await this.fetchDOM(`${this.baseUrl}${id}`, "div.ss-list a.ep-item");
        const $ = load(dom.Response.text());
        const episodes:any[] = [];

        dom.Cheerio.map((index, element) => {
            episodes?.push({
                id: $(element).attr('href')?.trim(),
                numer: $(element).attr("data-number"),
                url: `${this.baseUrl}${$(element).attr('href')?.trim()}`,
                title: $(element).attr("title")
            });  
        })

        return episodes;
    }

    public async getSources(id: string): Promise<SubbedSource> {
        const dom = await this.fetch(`${this.baseUrl}${id}`);
        const $ = load(dom.text());
        const iframe = $("#iframe-to-load").attr("src") || "";
        const streamUrl = `https://goload.io/streaming.php?id=${iframe.split('=').pop()}`;
        const extracted = await this.extractGogoCDN(new URL(streamUrl));
        return extracted;
    }
}