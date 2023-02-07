import Provider, { Chapter, Page } from "../Provider";
import { Result } from "../Core";
export default class MangaSee extends Provider {
    constructor();
    search(query: string): Promise<Result[]>;
    private getMangaList;
    getChapters(id: string): Promise<Array<Chapter>>;
    getPages(id: string): Promise<Array<Page>>;
    private processScriptTagVariable;
    private processChapterNumber;
    private processChapterForImageUrl;
}
