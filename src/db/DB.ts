import { Content, FormattedResponse } from "../Core";
import { Type } from "../meta/AniList";
import { prisma } from './client';
import * as colors from "colors";
import API, { ProviderType } from "../API";
import { SubbedSource } from "../Provider";
import { join } from "path";
import { Database } from "sqlite3";
import { existsSync, readFileSync, writeFileSync } from "fs";

export default class DB extends API {
    private isSQlite:boolean;
    private db = null;
    
    constructor(isSQlite:boolean = false) {
        super(ProviderType.NONE);
        this.isSQlite = isSQlite;
        if (this.isSQlite) {
            this.db = new Database(join(__dirname, "../../db.db"));
        }
    }

    public async init() {
        if (this.isSQlite) {
            await this.createDatabase();
            return;
        }
        await prisma.$connect();
        return;
    }

    private async createDatabase(): Promise<void> {
        const db = this.db;
        const config = this.config;

        const promises = [];
        const anime = new Promise((resolve, reject) => {
            db.run("CREATE TABLE IF NOT EXISTS anime (id INTEGER PRIMARY KEY, data longtext not null, connectors longtext not null)", function (err) {
                if (err) reject(err);

                if (config.debug) {
                    console.log(colors.gray("Created ") + colors.blue("anime") + colors.gray(" table."));
                }
                resolve(true);
            });
        })
        const manga = new Promise((resolve, reject) => {
            db.run("CREATE TABLE IF NOT EXISTS manga (id INTEGER PRIMARY KEY, data longtext not null, connectors longtext not null)", function (err) {
                if (err) reject(err);

                if (config.debug) {
                    console.log(colors.gray("Created ") + colors.blue("manga") + colors.gray(" table."));
                }
                resolve(true);
            });
        })
        const episodes = new Promise((resolve, reject) => {
            db.run("CREATE TABLE IF NOT EXISTS episodes (id INTEGER PRIMARY KEY, data longtext not null, lastCached bigint not null)", function (err) {
                if (err) reject(err);

                if (config.debug) {
                    console.log(colors.gray("Created ") + colors.blue("episodes") + colors.gray(" table."));
                }
                resolve(true);
            });
        })
        const chapters = new Promise((resolve, reject) => {
            db.run("CREATE TABLE IF NOT EXISTS chapters (id INTEGER PRIMARY KEY, data longtext not null, lastCached bigint not null)", function (err) {
                if (err) reject(err);

                if (config.debug) {
                    console.log(colors.gray("Created ") + colors.blue("chapters") + colors.gray(" table."));
                }
                resolve(true);
            });
        })
        const sources = new Promise((resolve, reject) => {
            db.run("CREATE TABLE IF NOT EXISTS sources (id INTEGER PRIMARY KEY, watchId longtext not null, data longtext not null, lastCached bigint not null)", function (err) {
                if (err) reject(err);

                if (config.debug) {
                    console.log(colors.gray("Created ") + colors.blue("sources") + colors.gray(" table."));
                }
                resolve(true);
            });
        })
        const pages = new Promise((resolve, reject) => {
            db.run("CREATE TABLE IF NOT EXISTS pages (id INTEGER PRIMARY KEY, readId longtext not null, data longtext not null, lastCached bigint not null)", function (err) {
                if (err) reject(err);

                if (config.debug) {
                    console.log(colors.gray("Created ") + colors.blue("pages") + colors.gray(" table."));
                }
                resolve(true);
            });
        })
        promises.push(anime);
        promises.push(manga);
        promises.push(episodes);
        promises.push(chapters);
        promises.push(sources);
        promises.push(pages);
        await Promise.all(promises);
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
                    if (this.isSQlite) {
                        const stmt = await this.db.prepare(`INSERT OR IGNORE INTO ${type.toLowerCase()} (id, data, connectors) VALUES ($id, $data, $connectors)`);
                        await stmt.run({ $id: data[i].id, $data: JSON.stringify(data[i].data), $connectors: JSON.stringify(data[i].connectors) });
                        await stmt.finalize();
    
                        if (this.config.debug) {
                            console.log(colors.white("Inserted ") + colors.blue(data[i].data.title.romaji) + " " + colors.white("into ") + colors.blue(type.toLowerCase()) + colors.white("."));
                        }
                    } else {
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
            if (this.isSQlite) {
                const stmt = await this.db.prepare(`INSERT OR IGNORE INTO ${type === Type.ANIME ? "episodes" : "chapters"} (id, data, lastCached) VALUES ($id, $data, $lastCached)`);
                await stmt.run({ $id: Number(id), $data: JSON.stringify(data), $lastCached: new Date(Date.now()).getTime() });
                await stmt.finalize();
    
                if (this.config.debug) {
                    console.log(colors.white("Cached ") + colors.blue(id) + " " + colors.white("into ") + colors.blue(type === Type.ANIME ? "episodes" : "chapters") + colors.white("."));
                }
            } else {
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
            }
        } else {
            if (this.isSQlite) {
                const stmt = this.db.prepare(`UPDATE ${type === Type.ANIME ? "episodes" : "chapters"} SET data=$data, lastCached=$lastCached WHERE id=$id`);
                await stmt.run({ $data: JSON.stringify(data), $lastCached: new Date(Date.now()).getTime(), $id: Number(id) });
                await stmt.finalize();
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
    }
    
    public async cacheSources(id:string, mainId:string, data:SubbedSource, type:Type): Promise<void> {
        const exists = await this.getSources(id, mainId, type);
        if (!exists) {
            if (type === Type.ANIME) {
                if (this.isSQlite) {
                    const stmt = await this.db.prepare(`INSERT OR IGNORE INTO sources (id, watchId, data, lastCached) VALUES ($id, $mainId, $data, $lastCached)`);
                    await stmt.run({ $id: Number(id), $mainId: mainId, $data: JSON.stringify(data), $lastCached: new Date(Date.now()).getTime() });
                    await stmt.finalize();
        
                    if (this.config.debug) {
                        console.log(colors.white("Cached ") + colors.blue(id) + " " + colors.white("into ") + colors.blue(type === Type.ANIME ? "sources" : "pages") + colors.white("."));
                    }
                } else {
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
                }
            } else {
                if (this.isSQlite) {
                    const stmt = await this.db.prepare(`INSERT OR IGNORE INTO pages (id, readId, data, lastCached) VALUES ($id, $mainId, $data, $lastCached)`);
                    await stmt.run({ $id: Number(id), $mainId: mainId, $data: JSON.stringify(data), $lastCached: new Date(Date.now()).getTime() });
                    await stmt.finalize();
        
                    if (this.config.debug) {
                        console.log(colors.white("Cached ") + colors.blue(id) + " " + colors.white("into ") + colors.blue("pages") + colors.white("."));
                    }
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
            }
        } else {
            if (type === Type.ANIME) {
                if (this.isSQlite) {
                    const stmt = this.db.prepare(`UPDATE sources SET data=$data, lastCached=$lastCached WHERE id=$id`);
                    await stmt.run({ $data: JSON.stringify(data), $lastCached: new Date(Date.now()).getTime(), $id: Number(id) });
                    await stmt.finalize();

                    if (this.config.debug) {
                        console.log(colors.white("Updated ") + colors.blue(id) + " " + colors.white("in database ") + colors.blue("sources") + colors.white("."));
                    }
                } else {
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
                }
            } else {
                if (this.isSQlite) {
                    const stmt = this.db.prepare(`UPDATE pages SET data=$data, lastCached=$lastCached WHERE id=$id`);
                    await stmt.run({ $data: JSON.stringify(data), $lastCached: new Date(Date.now()).getTime(), $id: Number(id) });
                    await stmt.finalize();

                    if (this.config.debug) {
                        console.log(colors.white("Updated ") + colors.blue(id) + " " + colors.white("in database ") + colors.blue("pages") + colors.white("."));
                    }
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
    }

    public async get(id:string, type:Type): Promise<FormattedResponse> {
        if (this.isSQlite) {
            return new Promise((resolve, reject) => {
                this.db.get(`SELECT * FROM ${type.toLowerCase()} WHERE id = ${id}`, (err, row) => {
                    if (err) reject(err);
                    if (row != undefined) {
                        row.data = JSON.parse(row.data);
                        row.connectors = JSON.parse(row.connectors);
                        resolve(row);
                    } else {
                        resolve(null);
                    }
                });
            });
        } else {
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
    }

    public async getContent(id:string, type:Type): Promise<CachedContent> {
        if (this.isSQlite) {
            return new Promise((resolve, reject) => {
                this.db.get(`SELECT * FROM ${type === Type.ANIME ? "episodes" : "chapters"} WHERE id = ?`, [id], (err, row) => {
                    if (err) reject(err);
                    if (row != undefined) {
                        row.data = JSON.parse(row.data);
                        resolve(row);
                    } else {
                        resolve(null);
                    }
                });
            });
        } else {
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
    }

    public async getSources(id:string, mainId:string, type:Type): Promise<CachedSources> {
        if (this.isSQlite) {
            return new Promise((resolve, reject) => {
                this.db.get(`SELECT * FROM ${type === Type.ANIME ? "sources" : "pages"} WHERE id = ? AND ${type === Type.ANIME ? "watchId" : "readId"} = ?`, [id, mainId], (err, row) => {
                    if (err) reject(err);
                    if (row != undefined) {
                        row.data = JSON.parse(row.data);
                        resolve(row);
                    } else {
                        resolve(null);
                    }
                });
            });
        } else {
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
    }

    public async getAll(type:Type): Promise<FormattedResponse[]> {
        if (this.isSQlite) {
            return new Promise((resolve, reject) => {
                this.db.all(`SELECT * FROM ${type.toLowerCase()}`, (err, rows) => {
                    if (err) reject(err);
                    if (rows != undefined) {
                        for (let i = 0; i < rows.length; i++) {
                            rows[i].data = JSON.parse(rows[i].data);
                            rows[i].connectors = JSON.parse(rows[i].connectors);
                        }
                        resolve(rows);
                    } else {
                        resolve(null);
                    }
                });
            });
        } else {
            if (type === Type.ANIME) {
                return prisma.anime.findMany() as any;
            } else if (type === Type.MANGA) {
                return prisma.manga.findMany() as any;
            }
        }
    }

    public async export(): Promise<void> {
        let data:any = [];
        const dateAsString = new Date(Date.now()).toISOString().replace(/:/g, "-");
        const toExport = join(__dirname, "../../" + dateAsString + "-export.json");

        if (this.isSQlite) {
            const anime = await this.getAll(Type.ANIME);
            const manga = await this.getAll(Type.MANGA);
            data = {
                anime,
                manga
            };
        } else {
            const anime = await prisma.anime.findMany();
            const manga = await prisma.manga.findMany();
            data = {
                anime,
                manga
            };
        }
        writeFileSync(toExport, JSON.stringify(data, null, 4), "utf8");
        console.log(colors.white("Exported database to ") + colors.blue(toExport) + colors.white("."));
    }

    public async import(): Promise<void> {
        const exists = existsSync(join(__dirname, "../../export.json"));
        if (!exists) {
            console.log(colors.red("No export file found. Please make sure you have an export.json file in the root directory."));
            return;
        }
        const file = readFileSync(join(__dirname, "../../export.json"), "utf8");
        const data = JSON.parse(file);
        const anime:FormattedResponse[] = data.anime;
        const manga:FormattedResponse[] = data.manga;
        if (!anime || !manga) {
            console.log(colors.red("Invalid export file. Please make sure you have an export.json file in the root directory."));
            return;
        }
        await this.insert(anime, Type.ANIME);
        await this.insert(manga, Type.MANGA);
        if (this.config.debug) {
            console.log(colors.white("Imported database from ") + colors.blue("export.json") + colors.white("."));
        }
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