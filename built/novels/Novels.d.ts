/// <reference types="node" />
import API from "../API";
import { ReadStream } from "fs";
export default class Novels extends API {
    constructor();
    search(query: string): Promise<Array<SearchResponse>>;
    getTotal(): Promise<number>;
    getAllNovelsFromSQL(): Promise<Array<NovelInfo>>;
    insert(): Promise<void>;
    createCovers(): Promise<void>;
    private getFirstPage;
    getCover(route: string): ReadStream;
    getPDF(route: string): Promise<ReadStream>;
}
interface SearchResponse {
    url: string;
    id: NovelInfo["id"];
    img: string;
    title: string;
}
interface NovelInfo {
    id: string;
    title: string;
    path: string;
    cover: string;
    author: string;
    numPages: number;
}
export type { SearchResponse };
