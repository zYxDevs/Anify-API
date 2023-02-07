"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AniList_1 = require("../meta/AniList");
const client_1 = require("./client");
const colors = require("colors");
const API_1 = require("../API");
const path_1 = require("path");
const sqlite3_1 = require("sqlite3");
const fs_1 = require("fs");
class DB extends API_1.default {
    constructor(isSQlite = false) {
        super(API_1.ProviderType.NONE);
        this.db = null;
        this.isSQlite = isSQlite;
        if (this.isSQlite) {
            this.db = new sqlite3_1.Database((0, path_1.join)(__dirname, "../../db.db"));
        }
    }
    async init() {
        if (this.isSQlite) {
            await this.createDatabase();
            return;
        }
        await client_1.prisma.$connect();
        return;
    }
    async createDatabase() {
        const db = this.db;
        const config = this.config;
        const promises = [];
        const anime = new Promise((resolve, reject) => {
            db.run("CREATE TABLE IF NOT EXISTS anime (id INTEGER PRIMARY KEY, data longtext not null, connectors longtext not null)", function (err) {
                if (err)
                    reject(err);
                if (config.debug) {
                    console.log(colors.gray("Created ") + colors.blue("anime") + colors.gray(" table."));
                }
                resolve(true);
            });
        });
        const manga = new Promise((resolve, reject) => {
            db.run("CREATE TABLE IF NOT EXISTS manga (id INTEGER PRIMARY KEY, data longtext not null, connectors longtext not null)", function (err) {
                if (err)
                    reject(err);
                if (config.debug) {
                    console.log(colors.gray("Created ") + colors.blue("manga") + colors.gray(" table."));
                }
                resolve(true);
            });
        });
        const episodes = new Promise((resolve, reject) => {
            db.run("CREATE TABLE IF NOT EXISTS episodes (id INTEGER PRIMARY KEY, data longtext not null, lastCached bigint not null)", function (err) {
                if (err)
                    reject(err);
                if (config.debug) {
                    console.log(colors.gray("Created ") + colors.blue("episodes") + colors.gray(" table."));
                }
                resolve(true);
            });
        });
        const chapters = new Promise((resolve, reject) => {
            db.run("CREATE TABLE IF NOT EXISTS chapters (id INTEGER PRIMARY KEY, data longtext not null, lastCached bigint not null)", function (err) {
                if (err)
                    reject(err);
                if (config.debug) {
                    console.log(colors.gray("Created ") + colors.blue("chapters") + colors.gray(" table."));
                }
                resolve(true);
            });
        });
        const sources = new Promise((resolve, reject) => {
            db.run("CREATE TABLE IF NOT EXISTS sources (id INTEGER PRIMARY KEY, watchId longtext not null, data longtext not null, lastCached bigint not null)", function (err) {
                if (err)
                    reject(err);
                if (config.debug) {
                    console.log(colors.gray("Created ") + colors.blue("sources") + colors.gray(" table."));
                }
                resolve(true);
            });
        });
        const pages = new Promise((resolve, reject) => {
            db.run("CREATE TABLE IF NOT EXISTS pages (id INTEGER PRIMARY KEY, readId longtext not null, data longtext not null, lastCached bigint not null)", function (err) {
                if (err)
                    reject(err);
                if (config.debug) {
                    console.log(colors.gray("Created ") + colors.blue("pages") + colors.gray(" table."));
                }
                resolve(true);
            });
        });
        promises.push(anime);
        promises.push(manga);
        promises.push(episodes);
        promises.push(chapters);
        promises.push(sources);
        promises.push(pages);
        await Promise.all(promises);
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
                    if (this.isSQlite) {
                        const stmt = await this.db.prepare(`INSERT OR IGNORE INTO ${type.toLowerCase()} (id, data, connectors) VALUES ($id, $data, $connectors)`);
                        await stmt.run({ $id: data[i].id, $data: JSON.stringify(data[i].data), $connectors: JSON.stringify(data[i].connectors) });
                        await stmt.finalize();
                        if (this.config.debug) {
                            console.log(colors.white("Inserted ") + colors.blue(data[i].data.title.romaji) + " " + colors.white("into ") + colors.blue(type.toLowerCase()) + colors.white("."));
                        }
                    }
                    else {
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
            if (this.isSQlite) {
                const stmt = await this.db.prepare(`INSERT OR IGNORE INTO ${type === AniList_1.Type.ANIME ? "episodes" : "chapters"} (id, data, lastCached) VALUES ($id, $data, $lastCached)`);
                await stmt.run({ $id: Number(id), $data: JSON.stringify(data), $lastCached: new Date(Date.now()).getTime() });
                await stmt.finalize();
                if (this.config.debug) {
                    console.log(colors.white("Cached ") + colors.blue(id) + " " + colors.white("into ") + colors.blue(type === AniList_1.Type.ANIME ? "episodes" : "chapters") + colors.white("."));
                }
            }
            else {
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
        }
        else {
            if (this.isSQlite) {
                const stmt = this.db.prepare(`UPDATE ${type === AniList_1.Type.ANIME ? "episodes" : "chapters"} SET data=$data, lastCached=$lastCached WHERE id=$id`);
                await stmt.run({ $data: JSON.stringify(data), $lastCached: new Date(Date.now()).getTime(), $id: Number(id) });
                await stmt.finalize();
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
    }
    async cacheSources(id, mainId, data, type) {
        const exists = await this.getSources(id, mainId, type);
        if (!exists) {
            if (type === AniList_1.Type.ANIME) {
                if (this.isSQlite) {
                    const stmt = await this.db.prepare(`INSERT OR IGNORE INTO sources (id, watchId, data, lastCached) VALUES ($id, $mainId, $data, $lastCached)`);
                    await stmt.run({ $id: Number(id), $mainId: mainId, $data: JSON.stringify(data), $lastCached: new Date(Date.now()).getTime() });
                    await stmt.finalize();
                    if (this.config.debug) {
                        console.log(colors.white("Cached ") + colors.blue(id) + " " + colors.white("into ") + colors.blue(type === AniList_1.Type.ANIME ? "sources" : "pages") + colors.white("."));
                    }
                }
                else {
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
            }
            else {
                if (this.isSQlite) {
                    const stmt = await this.db.prepare(`INSERT OR IGNORE INTO pages (id, readId, data, lastCached) VALUES ($id, $mainId, $data, $lastCached)`);
                    await stmt.run({ $id: Number(id), $mainId: mainId, $data: JSON.stringify(data), $lastCached: new Date(Date.now()).getTime() });
                    await stmt.finalize();
                    if (this.config.debug) {
                        console.log(colors.white("Cached ") + colors.blue(id) + " " + colors.white("into ") + colors.blue("pages") + colors.white("."));
                    }
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
        }
        else {
            if (type === AniList_1.Type.ANIME) {
                if (this.isSQlite) {
                    const stmt = this.db.prepare(`UPDATE sources SET data=$data, lastCached=$lastCached WHERE id=$id`);
                    await stmt.run({ $data: JSON.stringify(data), $lastCached: new Date(Date.now()).getTime(), $id: Number(id) });
                    await stmt.finalize();
                    if (this.config.debug) {
                        console.log(colors.white("Updated ") + colors.blue(id) + " " + colors.white("in database ") + colors.blue("sources") + colors.white("."));
                    }
                }
                else {
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
            }
            else {
                if (this.isSQlite) {
                    const stmt = this.db.prepare(`UPDATE pages SET data=$data, lastCached=$lastCached WHERE id=$id`);
                    await stmt.run({ $data: JSON.stringify(data), $lastCached: new Date(Date.now()).getTime(), $id: Number(id) });
                    await stmt.finalize();
                    if (this.config.debug) {
                        console.log(colors.white("Updated ") + colors.blue(id) + " " + colors.white("in database ") + colors.blue("pages") + colors.white("."));
                    }
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
    }
    async get(id, type) {
        if (this.isSQlite) {
            return new Promise((resolve, reject) => {
                this.db.get(`SELECT * FROM ${type.toLowerCase()} WHERE id = ${id}`, (err, row) => {
                    if (err)
                        reject(err);
                    if (row != undefined) {
                        row.data = JSON.parse(row.data);
                        row.connectors = JSON.parse(row.connectors);
                        resolve(row);
                    }
                    else {
                        resolve(null);
                    }
                });
            });
        }
        else {
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
    }
    async getContent(id, type) {
        if (this.isSQlite) {
            return new Promise((resolve, reject) => {
                this.db.get(`SELECT * FROM ${type === AniList_1.Type.ANIME ? "episodes" : "chapters"} WHERE id = ?`, [id], (err, row) => {
                    if (err)
                        reject(err);
                    if (row != undefined) {
                        row.data = JSON.parse(row.data);
                        resolve(row);
                    }
                    else {
                        resolve(null);
                    }
                });
            });
        }
        else {
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
    }
    async getSources(id, mainId, type) {
        if (this.isSQlite) {
            return new Promise((resolve, reject) => {
                this.db.get(`SELECT * FROM ${type === AniList_1.Type.ANIME ? "sources" : "pages"} WHERE id = ? AND ${type === AniList_1.Type.ANIME ? "watchId" : "readId"} = ?`, [id, mainId], (err, row) => {
                    if (err)
                        reject(err);
                    if (row != undefined) {
                        row.data = JSON.parse(row.data);
                        resolve(row);
                    }
                    else {
                        resolve(null);
                    }
                });
            });
        }
        else {
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
    }
    async getAll(type) {
        if (this.isSQlite) {
            return new Promise((resolve, reject) => {
                this.db.all(`SELECT * FROM ${type.toLowerCase()}`, (err, rows) => {
                    if (err)
                        reject(err);
                    if (rows != undefined) {
                        for (let i = 0; i < rows.length; i++) {
                            rows[i].data = JSON.parse(rows[i].data);
                            rows[i].connectors = JSON.parse(rows[i].connectors);
                        }
                        resolve(rows);
                    }
                    else {
                        resolve(null);
                    }
                });
            });
        }
        else {
            if (type === AniList_1.Type.ANIME) {
                return client_1.prisma.anime.findMany();
            }
            else if (type === AniList_1.Type.MANGA) {
                return client_1.prisma.manga.findMany();
            }
        }
    }
    async export() {
        let data = [];
        const dateAsString = new Date(Date.now()).toISOString().replace(/:/g, "-");
        const toExport = (0, path_1.join)(__dirname, "../../" + dateAsString + "-export.json");
        if (this.isSQlite) {
            const anime = await this.getAll(AniList_1.Type.ANIME);
            const manga = await this.getAll(AniList_1.Type.MANGA);
            data = {
                anime,
                manga
            };
        }
        else {
            const anime = await client_1.prisma.anime.findMany();
            const manga = await client_1.prisma.manga.findMany();
            data = {
                anime,
                manga
            };
        }
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