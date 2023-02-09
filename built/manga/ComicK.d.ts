import Provider, { Chapter, Page } from "../Provider";
import { Result } from "../Core";
export default class ComicK extends Provider {
    private api;
    private image;
    constructor();
    search(query: string): Promise<Array<Result>>;
    getChapters(id: string): Promise<Array<Chapter>>;
    getPages(id: string): Promise<Array<Page>>;
    /**
     * @description Get the covers for a comic
     * @param id ComicK slug (NOT ComicK ID)
     * @returns Promise<Array<Cover>>
     */
    getCovers(id: string): Promise<Array<Cover>>;
    parseCover(cover: Cover): {
        volume: any;
        url: string;
    };
    private getChaptersFromPage;
    private getComicId;
}
interface Cover {
    vol: any;
    w: number;
    h: number;
    b2key: string;
}
export {};
