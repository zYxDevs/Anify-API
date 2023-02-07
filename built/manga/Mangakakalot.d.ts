import Provider, { Chapter, Page } from "../Provider";
import { Result } from "../Core";
export default class Mangakakalot extends Provider {
    private types;
    constructor();
    search(query: string): Promise<Array<Result>>;
    getChapters(id: string): Promise<Array<Chapter>>;
    getPages(id: string): Promise<Array<Page>>;
    private parseQuery;
    private parseTitle;
    private parseType;
}
