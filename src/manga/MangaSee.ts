import { load } from "cheerio";
import { ProviderType } from "../API";
import Provider, { Chapter, Page } from "../Provider";
import { Result } from "../Sync";
import * as config from "../config.json";

export default class MangaSee extends Provider {
    constructor() {
        super("https://mangasee123.com", ProviderType.MANGA);
    }

    public async search(query: string): Promise<Result[]> {
        const list = await this.getMangaList();
        const results:Result[] = [];

        for (let i = 0; i < list.length; i++) {
            if (this.stringSearch(list[i].s, query) >= 1) {
                results.push({
                    title: list[i].s,
                    url: `${this.baseURL}/manga/${list[i].i}`,
                })
            }
        }
        return results;
    }

    private async getMangaList(): Promise<Array<SearchResult>> {
        const data = await this.fetch(`${this.baseURL}/_search.php`, { method: "POST", headers: {
            Referer: this.baseURL
        }});
        const res:[SearchResult] = data.json();
        return res;
    }

    public async getChapters(id:string): Promise<Array<Chapter>> {
        try {
            const data = await this.fetch(`${this.baseURL}${id}`);
            const $ = load(data.text());
            id = id.split("/manga/")[1];
            
            const contentScript = $('body > script:nth-child(16)').get()[0].children[0];

            const chaptersData = this.processScriptTagVariable(contentScript["data"], 'vm.Chapters = ');
            return chaptersData.map((i: { [x: string]: any }) => ({
                id: `/read-online/${id}-chapter-${this.processChapterNumber(i['Chapter'])}`,
                title: `${i['ChapterName'] ?? `Chapter ${this.processChapterNumber(i['Chapter'])}`}`,
                releaseDate: i['Date'],
                url: `${this.baseURL}/read-online/${id}-chapter-${this.processChapterNumber(i['Chapter'])}`,
            }));
        } catch (err) {
            throw new Error((err as Error).message);
        }
    }

    public async getPages(id:string): Promise<Array<Page>> {
        const url = `${this.baseURL}${id}-page-1.html`;

        const images:Page[] = [];
        
        try {
            const data = await this.fetch(url);
            const $ = load(data.text());
        
            const chapterScript = $('body > script:nth-child(19)').get()[0].children[0];
            const curChapter = this.processScriptTagVariable(chapterScript["data"], 'vm.CurChapter = ');
            const imageHost = this.processScriptTagVariable(chapterScript["data"], 'vm.CurPathName = ');
            const curChapterLength = Number(curChapter['Page']);
    
            for (let i = 0; i < curChapterLength; i++) {
                const chapter = this.processChapterForImageUrl(id.replace(/[^0-9.]/g, ''));
                const page = `${i + 1}`.padStart(3, '0');
                const mangaId = id.split('-chapter-', 1)[0].split("/read-online/")[1];
                const imagePath = `https://${imageHost}/manga/${mangaId}/${chapter}-${page}.png`;
        
                images.push({
                    url: `${config.web_server.url}/proxy?url=${this.encrypt(imagePath)}&referer=${this.encrypt(this.baseURL)}`,
                    index: i
                });
            }
        
            return images;
        } catch (err) {
            throw new Error((err as Error).message);
        }
    }

    private processScriptTagVariable = (script: string, variable: string) => {
        const chopFront = script.substring(script.search(variable) + variable.length, script.length);
        const chapters = JSON.parse(chopFront.substring(0, chopFront.search(';')));

        return chapters;
    };

    private processChapterNumber = (chapter: string): string => {
        const decimal = chapter.substring(chapter.length - 1, chapter.length);
        chapter = chapter.replace(chapter[0], '').slice(0, -1);
        if (decimal == '0') return `${+chapter}`;

        if (chapter.startsWith('0')) chapter = chapter.replace(chapter[0], '');

        return `${+chapter}.${decimal}`;
    };

    private processChapterForImageUrl = (chapter: string): string => {
        if (!chapter.includes('.')) return chapter.padStart(4, '0');

        const values = chapter.split('.');
        const pad = values[0].padStart(4, '0');

        return `${pad}.${values[1]}`;
    };
}

interface SearchResult {
    i: string; // image
    s: string; // Main title
    a: [string]; // Alternative titles
}