import { ProviderType } from "../API";
import Provider, { Chapter, Page } from "../Provider";
import { Result } from "../Core";

export default class ComicK extends Provider {
    private api:string = "https://api.comick.app";
    private image:string = "https://meo.comick.pictures";

    constructor() {
        super("https://comick.app", ProviderType.MANGA);
    }

    public async search(query:string): Promise<Array<Result>> {
        const data = await this.fetch(`${this.api}/search?q=${encodeURIComponent(query)}`);
        const json = data.json();
        const results = json.map((result:SearchResult) => {
            let cover:any = result.md_covers ? result.md_covers[0] : null;
            if (cover && cover.b2key != undefined) {
                cover = this.image + cover.b2key;
            }
            // There are alt titles in the md_titles array
            return {
                url: this.baseURL + "/comic/" + result.slug,
                title: result.title ? result.title : result.slug
            };
        });
        return results;
    }

    public async getChapters(id:string): Promise<Array<Chapter>> {
        const chapterList = [];

        const comicId = await this.getComicId(id);
        if (!comicId) {
            return chapterList;
        }

        for (let page = 1, run = true; run; page++) {
            const chapters = await this.getChaptersFromPage(comicId, page);
            chapters.length > 0 ? chapterList.push(...chapters) : run = false;
        }

        return chapterList;
    }

    public async getPages(id:string): Promise<Array<Page>> {
        const req = await this.fetch(`${this.api}/chapter/${id}`);
        const data = req.json();

        return data.chapter.md_images.map((image, index) => {
            return {
                url: `${this.image}/${image.b2key}?width=${image.w}`,
                index: index
            }
        });
    }

    private async getChaptersFromPage(id:number, page:number): Promise<Array<Chapter>> {
        const data = await this.fetch(`${this.api}/comic/${id}/chapter?page=${page}`);
        const json = data.json();

        return json["chapters"].map((chapter) => {
            let title = '';
            if(chapter.vol) {
                title += `Vol. ${chapter.vol} `;
            }
            title += `Ch. ${chapter.chap}`;
            if(chapter.title) {
                title += ` - ${chapter.title}`;
            }
            return {
                url: this.api + "/chapter/" + chapter.hid,
                id: chapter.hid,
                title: title
            };
        });
    }

    private async getComicId(id:string): Promise<number> {
        const req = await this.fetch(`${this.api}${id}`);
        const data:Comic = req.json()["comic"];
        return data ? data.id : null;
    }
}

interface SearchResult {
    title: string;
    id: number;
    slug: string;
    rating: string;
    rating_count: number;
    follow_count: number;
    user_follow_count: number;
    content_rating: string;
    demographic: number;
    md_titles: [MDTitle];
    md_covers: Array<Cover>;
    highlight: string;
}

interface Cover {
    vol: any;
    w: number;
    h: number;
    b2key: string;
}

interface MDTitle {
    title: string;
}

interface Comic {
    id: number;
    title: string;
    country: string;
    status: number;
    links: ComicLinks;
    last_chapter: any;
    chapter_count: number;
    demographic: number;
    hentai: boolean;
    user_follow_count: number;
    follow_rank: number;
    comment_count: number;
    follow_count: number;
    desc: string;
    parsed: string;
    slug: string;
    mismatch: any;
    year: number;
    bayesian_rating: any;
    rating_count: number;
    content_rating: string;
    translation_completed: boolean;
    relate_from: Array<any>;
    mies: any;
    md_titles: Array<ComicTitles>;
    md_comic_md_genres: Array<ComicGenres>;
    mu_comics: { licensed_in_english: any, mu_comic_categories: Array<ComicCategories> };
    iso639_1: string;
    lang_name: string;
    lang_native: string;
}

interface ComicLinks {
    al: string;
    ap: string;
    bw: string;
    kt: string;
    mu: string;
    amz: string;
    cdj: string;
    ebj: string;
    mal: string;
    raw: string;
}

interface ComicTitles {
    title: string;
}

interface ComicGenres {
    md_genres: {
        name: string;
        type: string|null;
        slug: string;
        group: string;
    }
}

interface ComicCategories {
    mu_categories: {
        title: string;
        slug: string;
    }
    positive_vote: number;
    negative_vote: number;
}