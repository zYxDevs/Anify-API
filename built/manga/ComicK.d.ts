import Provider, { Chapter, Page } from "../Provider";
import { Result } from "../Core";
export default class ComicK extends Provider {
    private api;
    private image;
    constructor();
    search(query: string): Promise<Array<Result>>;
    getChapters(id: string): Promise<Array<Chapter>>;
    getPages(id: string): Promise<Array<Page>>;
    private getChaptersFromPage;
    private getComicId;
}
