"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AniList_1 = require("../meta/AniList");
const client_1 = require("./client");
const colors = require("colors");
const API_1 = require("../API");
const path_1 = require("path");
const fs_1 = require("fs");
class DB extends API_1.default {
    constructor() {
        super(API_1.ProviderType.NONE);
    }
    async init() {
        await client_1.prisma.$connect();
        return true;
    }
    async search(query, type) {
        return new Promise(async (resolve, reject) => {
            const data = await this.getAll(type);
            if (!data) {
                resolve([]);
                return;
            }
            const results = [];
            for (let i = 0; i < data.length; i++) {
                const result = data[i];
                if (this.stringSearch(result.data.title.english ?? "", query) >= 1 || this.stringSearch(result.data.title.romaji ?? "", query) >= 1 || this.stringSearch(result.data.title.native ?? "", query) >= 1) {
                    results.push(result);
                }
            }
            resolve(results);
        });
    }
    async insert(data, type) {
        const promises = [];
        for (let i = 0; i < data.length; i++) {
            const promise = new Promise(async (resolve, reject) => {
                if (!data[i]) {
                    resolve(true);
                    return;
                }
                const exists = await this.get(data[i].id, type);
                if (!exists) {
                    const db = type === AniList_1.Type.ANIME ? client_1.prisma.anime : client_1.prisma.manga;
                    await db.create({
                        data: {
                            id: Number(data[i].id),
                            data: data[i].data,
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
                    });
                }
                resolve(true);
            });
            promises.push(promise);
        }
        await Promise.all(promises);
    }
    async cacheContent(id, data, type) {
        const exists = await this.getContent(id, type);
        const db = type === AniList_1.Type.ANIME ? client_1.prisma.episodes : client_1.prisma.chapters;
        if (!exists) {
            await db.create({
                data: {
                    id: Number(id),
                    data: data,
                    lastCached: String(new Date(Date.now()).getTime())
                }
            }).then(() => {
                if (this.config.debug) {
                    console.log(colors.white("Cached ") + colors.blue(id) + " " + colors.white("into ") + colors.blue(type === AniList_1.Type.ANIME ? "episodes" : "chapters") + colors.white("."));
                }
            }).catch((err) => {
                if (this.config.debug) {
                    console.log(colors.red(err.message));
                }
            });
        }
        else {
            await db.update({
                data: {
                    data: data,
                    lastCached: String(new Date(Date.now()).getTime())
                },
                where: {
                    id: Number(id)
                }
            }).then(() => {
                if (this.config.debug) {
                    console.log(colors.white("Updated ") + colors.blue(id) + " " + colors.white("in database ") + colors.blue(type === AniList_1.Type.ANIME ? "episodes" : "chapters") + colors.white("."));
                }
            }).catch((err) => {
                if (this.config.debug) {
                    console.log(colors.red(err.message));
                }
            });
        }
    }
    async cacheSources(id, mainId, data, type) {
        const exists = await this.getSources(id, mainId, type);
        const db = type === AniList_1.Type.ANIME ? client_1.prisma.sources : client_1.prisma.pages;
        if (!exists) {
            if (type === AniList_1.Type.ANIME) {
                await client_1.prisma.sources.create({
                    data: {
                        id: Number(id),
                        data: data,
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
                });
            }
            else {
                await client_1.prisma.pages.create({
                    data: {
                        id: Number(id),
                        data: data,
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
                });
            }
        }
        else {
            if (type === AniList_1.Type.ANIME) {
                await client_1.prisma.sources.update({
                    data: {
                        data: data,
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
                });
            }
            else {
                await client_1.prisma.pages.update({
                    data: {
                        data: data,
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
                });
            }
        }
    }
    async get(id, type) {
        const db = type === AniList_1.Type.ANIME ? client_1.prisma.anime : client_1.prisma.manga;
        return db.findFirst({
            where: { id: Number(id) }
        }).then((data) => {
            return data;
        }).catch((err) => {
            if (this.config.debug) {
                console.log(colors.red(err.message));
            }
        });
    }
    async getContent(id, type) {
        const db = type === AniList_1.Type.ANIME ? client_1.prisma.episodes : client_1.prisma.chapters;
        return db.findFirst({
            where: { id: Number(id) }
        }).then((data) => {
            return data;
        }).catch((err) => {
            if (this.config.debug) {
                console.log(colors.red(err.message));
            }
        });
    }
    async getSources(id, mainId, type) {
        if (type === AniList_1.Type.ANIME) {
            return client_1.prisma.sources.findFirst({
                where: { id: Number(id), watchId: mainId }
            }).then((data) => {
                return data;
            }).catch((err) => {
                if (this.config.debug) {
                    console.log(colors.red(err.message));
                }
            });
        }
        else if (type === AniList_1.Type.MANGA) {
            return client_1.prisma.pages.findFirst({
                where: { id: Number(id), readId: mainId }
            }).then((data) => {
                return data;
            }).catch((err) => {
                if (this.config.debug) {
                    console.log(colors.red(err.message));
                }
            });
        }
    }
    async getAll(type) {
        if (type === AniList_1.Type.ANIME) {
            return client_1.prisma.anime.findMany();
        }
        else if (type === AniList_1.Type.MANGA) {
            return client_1.prisma.manga.findMany();
        }
    }
    async export() {
        const anime = await client_1.prisma.anime.findMany();
        const manga = await client_1.prisma.manga.findMany();
        const dateAsString = new Date(Date.now()).toISOString().replace(/:/g, "-");
        const toExport = (0, path_1.join)(__dirname, "../../" + dateAsString + "-export.json");
        const data = {
            anime,
            manga
        };
        (0, fs_1.writeFileSync)(toExport, JSON.stringify(data, null, 4), "utf8");
        console.log(colors.white("Exported database to ") + colors.blue(toExport) + colors.white("."));
    }
    async import() {
        const exists = (0, fs_1.existsSync)((0, path_1.join)(__dirname, "../../export.json"));
        if (!exists) {
            console.log(colors.red("No export file found. Please make sure you have an export.json file in the root directory."));
            return;
        }
        const file = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, "../../export.json"), "utf8");
        const data = JSON.parse(file);
        const anime = data.anime;
        const manga = data.manga;
        if (!anime || !manga) {
            console.log(colors.red("Invalid export file. Please make sure you have an export.json file in the root directory."));
            return;
        }
        await this.insert(anime, AniList_1.Type.ANIME);
        await this.insert(manga, AniList_1.Type.MANGA);
        if (this.config.debug) {
            console.log(colors.white("Imported database from ") + colors.blue("export.json") + colors.white("."));
        }
    }
}
exports.default = DB;
//# sourceMappingURL=DB.js.map