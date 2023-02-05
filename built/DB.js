"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = require("./config.json");
const AniList_1 = require("./meta/AniList");
const sqlite3_1 = require("sqlite3");
const colors = require("colors");
const API_1 = require("./API");
const fs_1 = require("fs");
const path_1 = require("path");
class DB extends API_1.default {
    constructor() {
        super(API_1.ProviderType.NONE);
        this.db = new sqlite3_1.Database(config.database_path);
    }
    async init() {
        await this.createDatabase();
    }
    async createDatabase() {
        const db = this.db;
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
                const newId = +data[i].id;
                if (!exists) {
                    const stmt = await this.db.prepare(`INSERT OR IGNORE INTO ${type.toLowerCase()} (id, data, connectors) VALUES ($id, $data, $connectors)`);
                    await stmt.run({ $id: newId, $data: JSON.stringify(data[i].data), $connectors: JSON.stringify(data[i].connectors) });
                    await stmt.finalize();
                    if (config.debug) {
                        console.log(colors.white("Inserted ") + colors.blue(data[i].data.title.romaji) + " " + colors.white("into ") + colors.blue(type.toLowerCase()) + colors.white("."));
                    }
                }
                resolve(true);
            });
            promises.push(promise);
        }
        await Promise.all(promises);
    }
    async cacheContent(id, data, type) {
        const parsedId = +id;
        const exists = await this.getContent(id, type);
        if (!exists) {
            const stmt = await this.db.prepare(`INSERT OR IGNORE INTO ${type === AniList_1.Type.ANIME ? "episodes" : "chapters"} (id, data, lastCached) VALUES ($id, $data, $lastCached)`);
            await stmt.run({ $id: parsedId, $data: JSON.stringify(data), $lastCached: new Date(Date.now()).getTime() });
            await stmt.finalize();
            if (config.debug) {
                console.log(colors.white("Cached ") + colors.blue(id) + " " + colors.white("into ") + colors.blue(type === AniList_1.Type.ANIME ? "episodes" : "chapters") + colors.white("."));
            }
        }
        else {
            const stmt = this.db.prepare(`UPDATE ${type === AniList_1.Type.ANIME ? "episodes" : "chapters"} SET data=$data, lastCached=$lastCached WHERE id=$id`);
            await stmt.run({ $data: JSON.stringify(data), $lastCached: new Date(Date.now()).getTime(), $id: parsedId });
            await stmt.finalize();
        }
    }
    async cacheSources(id, mainId, data, type) {
        const parsedId = +id;
        const exists = await this.getSources(id, mainId, type);
        if (!exists) {
            const stmt = await this.db.prepare(`INSERT OR IGNORE INTO ${type === AniList_1.Type.ANIME ? "sources" : "pages"} (id, ${type === AniList_1.Type.ANIME ? "watchId" : "readId"}, data, lastCached) VALUES ($id, $mainId, $data, $lastCached)`);
            await stmt.run({ $id: parsedId, $mainId: mainId, $data: JSON.stringify(data), $lastCached: new Date(Date.now()).getTime() });
            await stmt.finalize();
            if (config.debug) {
                console.log(colors.white("Cached ") + colors.blue(id) + " " + colors.white("into ") + colors.blue(type === AniList_1.Type.ANIME ? "sources" : "pages") + colors.white("."));
            }
        }
        else {
            const stmt = this.db.prepare(`UPDATE ${type === AniList_1.Type.ANIME ? "sources" : "pages"} SET data=$data, lastCached=$lastCached WHERE id=$id`);
            await stmt.run({ $data: JSON.stringify(data), $lastCached: new Date(Date.now()).getTime(), $id: parsedId });
            await stmt.finalize();
        }
    }
    async get(id, type) {
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
    async getContent(id, type) {
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
    async getSources(id, mainId, type) {
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
    async getAll(type) {
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
    async export(type) {
        const all = await this.getAll(type);
        (0, fs_1.createWriteStream)((0, path_1.join)(config.export_path, type + ".json")).write(JSON.stringify(all, null, 4));
    }
}
exports.default = DB;
//# sourceMappingURL=DB.js.map