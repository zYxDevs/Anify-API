import { load } from "cheerio";
import Manga, { Chapter, Page, SearchResponse } from "./Manga";
import { config } from "../../config";

export default class MangaPark extends Manga {
    constructor() {
        super("https://v2.mangapark.net", "MangaPark");
    }

    public async search(query: string): Promise<SearchResponse[]> {
        const url = `${this.baseUrl}/search?q=${query}`;
        try {
            const data = await this.fetch(url);
            const $ = load(data.text());
        
            const results:any = $('.item').get().map(item => {
                const cover = $(item).find('.cover');
                return {
                    id: `${cover.attr('href')}`,
                    url: `${this.baseUrl}${cover.attr("href")}`,
                    title: `${cover.attr('title')}`,
                    img: `${$(cover).find('img').attr('src')}}`,
                };
            });
        
            return results;
        } catch (err) {
        throw new Error((err as Error).message);
        }
    }
    
    public async getChapters(id:string): Promise<Array<Chapter>> {
        const url = `${this.baseUrl}${id}`;
        const result:Chapter[] = [];

        const data = await this.fetch(url);
        const $ = load(data.text());
        $(".py-1.item").get().map((chapter) => {
            const chapId = `${id}/${$(chapter).find("a.ml-1.visited.ch").attr("href")!.split(`/manga/${id}`).toString().replace(",", "")}`;
            result.push({
                id: chapId,
                title: $(chapter).find('.ml-1.visited.ch').text() + $(chapter).find('div.d-none.d-md-flex.align-items-center.ml-0.ml-md-1.txt').text().trim(),
                url: `${this.baseUrl}${chapId}`,
            })
        })
        return result;
    }

    public async getPages(id:string): Promise<Array<Page>> {
        const regex = /var _load_pages = \[(.*)\]/gm;
        const url = `${this.baseUrl}${id.substring(0, id.length - 2)}`;

        try {
            const data = await (await this.fetch(url)).text();
        
            const varLoadPages: string = data.match(regex)[0];
            const loadPagesJson = JSON.parse(varLoadPages.replace('var _load_pages = ', ''));
        
            const pages = loadPagesJson.map((page: { n: string; u: string }) => {
                return { url: page.u, index: page.n };
            });
        
            return pages;
        } catch (err) {
            throw new Error((err as Error).message);
        }
    }
}