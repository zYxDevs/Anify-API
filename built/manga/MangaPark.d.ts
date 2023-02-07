import Provider, { Chapter, Page } from "../Provider";
import { Result } from "../Core";
export default class MangaPark extends Provider {
    constructor();
    search(query: string): Promise<Result[]>;
    getChapters(id: string): Promise<Array<Chapter>>;
    getPages(id: string): Promise<Array<Page>>;
}
