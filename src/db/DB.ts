import { Content, FormattedResponse } from "../Anify";
import { Type } from "../meta/AniList";
import { prisma } from './client';
import * as colors from "colors";
import API, { ProviderType } from "../API";
import { SubbedSource } from "../Provider";

export default class DB extends API {
    constructor() {
        super(ProviderType.NONE);
    }

    public async init() {
        return true;
    }

    public async search(query:string, type:Type): Promise<FormattedResponse[]> {
        return new Promise(async(resolve, reject) => {
            const data = await this.getAll(type);
            if (!data) {
                resolve([]);
                return;
            }
            const results:FormattedResponse[] = [];
            for (let i = 0; i < data.length; i++) {
                const result:FormattedResponse = data[i];
                if (this.stringSearch(result.data.title.english ?? "", query) >= 1 || this.stringSearch(result.data.title.romaji ?? "", query) >= 1 || this.stringSearch(result.data.title.native ?? "", query) >= 1) {
                    results.push(result);
                }
            }
            resolve(results);
        });
    }

    public async insert(data:FormattedResponse[], type:Type): Promise<void> {
        const promises = [];
        for (let i = 0; i < data.length; i++) {
            const promise = new Promise(async(resolve, reject) => {
                if (!data[i]) {
                    resolve(true);
                    return;
                }
                const exists = await this.get(data[i].id, type);
                if (!exists) {
                    const db = type === Type.ANIME ? prisma.anime : prisma.manga;
                    await db.create({
                        data: {
                            id: Number(data[i].id),
                            data: data[i].data as any,
                            connectors: data[i].connectors
                        }
                    }).then(() => {
                        if (this.config.debug) {
                            console.log(colors.white("Inserted ") + colors.blue(data[i].data.title.romaji) + " " + colors.white("into ") + colors.blue(type.toLowerCase()) + colors.white("."));
                        }
                    }).catch((err) => {
                        if (this.config.debug) {
                            console.log(colors.red(err.message));
                        }
                    })
                }
                resolve(true);
            })
            promises.push(promise);
        }

        await Promise.all(promises);
    }

    public async cacheContent(id:string, data:Content[], type:Type): Promise<void> {
        const exists = await this.getContent(id, type);
        const db = type === Type.ANIME ? prisma.episodes : prisma.chapters;
        if (!exists) {
            await db.create({
                data: {
                    id: Number(id),
                    data: data as any,
                    lastCached: String(new Date(Date.now()).getTime())
                }
            }).then(() => {
                if (this.config.debug) {
                    console.log(colors.white("Cached ") + colors.blue(id) + " " + colors.white("into ") + colors.blue(type === Type.ANIME ? "episodes" : "chapters") + colors.white("."));
                }
            }).catch((err) => {
                if (this.config.debug) {
                    console.log(colors.red(err.message));
                }
            })
        } else {
            await db.update({
                data: {
                    data: data as any,
                    lastCached: String(new Date(Date.now()).getTime())
                },
                where: {
                    id: Number(id)
                }
            }).then(() => {
                if (this.config.debug) {
                    console.log(colors.white("Updated ") + colors.blue(id) + " " + colors.white("in database ") + colors.blue(type === Type.ANIME ? "episodes" : "chapters") + colors.white("."));
                }
            }).catch((err) => {
                if (this.config.debug) {
                    console.log(colors.red(err.message));
                }
            })
        }
    }
    
    public async cacheSources(id:string, mainId:string, data:SubbedSource, type:Type): Promise<void> {
        const exists = await this.getSources(id, mainId, type);
        const db = type === Type.ANIME ? prisma.sources : prisma.pages;
        if (!exists) {
            if (type === Type.ANIME) {
                await prisma.sources.create({
                    data: {
                        id: Number(id),
                        data: data as any,
                        watchId: mainId,
                        lastCached: String(new Date(Date.now()).getTime())
                    }
                }).then(() => {
                    if (this.config.debug) {
                        console.log(colors.white("Cached ") + colors.blue(id) + " " + colors.white("into ") + colors.blue("sources") + colors.white("."));
                    }
                }).catch((err) => {
                    if (this.config.debug) {
                        console.log(colors.red(err.message));
                    }
                })
            } else {
                await prisma.pages.create({
                    data: {
                        id: Number(id),
                        data: data as any,
                        readId: mainId,
                        lastCached: String(new Date(Date.now()).getTime())
                    }
                }).then(() => {
                    if (this.config.debug) {
                        console.log(colors.white("Cached ") + colors.blue(id) + " " + colors.white("into ") + colors.blue("pages") + colors.white("."));
                    }
                }).catch((err) => {
                    if (this.config.debug) {
                        console.log(colors.red(err.message));
                    }
                })
            }
        } else {
            if (type === Type.ANIME) {
                await prisma.sources.update({
                    data: {
                        data: data as any,
                        lastCached: String(new Date(Date.now()).getTime())
                    },
                    where: {
                        id: Number(id)
                    }
                }).then(() => {
                    if (this.config.debug) {
                        console.log(colors.white("Updated ") + colors.blue(id) + " " + colors.white("in database ") + colors.blue("sources") + colors.white("."));
                    }
                }).catch((err) => {
                    if (this.config.debug) {
                        console.log(colors.red(err.message));
                    }
                })
            } else {
                await prisma.pages.update({
                    data: {
                        data: data as any,
                        lastCached: String(new Date(Date.now()).getTime())
                    },
                    where: {
                        id: Number(id)
                    }
                }).then(() => {
                    if (this.config.debug) {
                        console.log(colors.white("Updated ") + colors.blue(id) + " " + colors.white("in database ") + colors.blue("pages") + colors.white("."));
                    }
                }).catch((err) => {
                    if (this.config.debug) {
                        console.log(colors.red(err.message));
                    }
                })
            }
        }
    }

    public async get(id:string, type:Type): Promise<FormattedResponse> {
        const db = type === Type.ANIME ? prisma.anime : prisma.manga;
        return db.findFirst({
            where: { id: Number(id) }
        }).then((data) => {
            return data as any;
        }).catch((err) => {
            if (this.config.debug) {
                console.log(colors.red(err.message));
            }
        })
    }

    public async getContent(id:string, type:Type): Promise<CachedContent> {
        const db = type === Type.ANIME ? prisma.episodes : prisma.chapters;
        return db.findFirst({
            where: { id: Number(id) }
        }).then((data) => {
            return data as any;
        }).catch((err) => {
            if (this.config.debug) {
                console.log(colors.red(err.message));
            }
        })
    }

    public async getSources(id:string, mainId:string, type:Type): Promise<CachedSources> {
        if (type === Type.ANIME) {
            return prisma.sources.findFirst({
                where: { id: Number(id), watchId: mainId }
            }).then((data) => {
                return data as any;
            }).catch((err) => {
                if (this.config.debug) {
                    console.log(colors.red(err.message));
                }
            })
        } else if (type === Type.MANGA) {
            return prisma.pages.findFirst({
                where: { id: Number(id), readId: mainId }
            }).then((data) => {
                return data as any;
            }).catch((err) => {
                if (this.config.debug) {
                    console.log(colors.red(err.message));
                }
            })
        }
    }

    public async getAll(type:Type): Promise<FormattedResponse[]> {
        if (type === Type.ANIME) {
            return prisma.anime.findMany() as any;
        } else if (type === Type.MANGA) {
            return prisma.anime.findMany() as any;
        }
    }

    public async export(type:Type): Promise<void> {
        return;
    }
}

interface CachedContent {
    id: number|string;
    data: Content[];
    lastCached: number;
}

interface CachedSources {
    id: number|string;
    data: SubbedSource;
    lastCached: number;
}

export type { CachedContent, CachedSources }