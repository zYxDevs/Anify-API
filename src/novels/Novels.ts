import { join } from "path";
import API, { ProviderType } from "../API";
import { Poppler } from "node-poppler";
import { prisma } from "../db/client";
import { createReadStream, existsSync, lstatSync, readdirSync, readFileSync, ReadStream, rename, unlink } from "fs";

export default class Novels extends API {
    constructor() {
        super(ProviderType.NOVEL);
    }

    public async search(query:string): Promise<Array<SearchResponse>> {
        const results = [];

        const novels = await this.getAllNovelsFromSQL();
        for (let i = 0; i < novels.length; i++) {
            if (this.stringSearch(novels[i].title, query) >= 1 && results.length < 20) {
                results.push(novels[i]);
            }
        }
        return results;
    }

    public async getTotal(): Promise<number> {
        const total = await this.getAllNovelsFromSQL();
        return total.length;
    }

    public async getAllNovelsFromSQL(): Promise<Array<NovelInfo>> {
        return prisma.novels.findMany() as any;
    }

    public async insert(): Promise<void> {
        return new Promise(async(resolve, reject) => {
            const instance = this;
            
            console.log("Serializing database...");
            try {
                console.log("Serialized database.");
                console.log("Reading directory...");
                const folders = readdirSync(join(this.config.storage, "/Novels"));
                const promises = [];
                
                for (const folder of folders) {
                    if (lstatSync(join(this.config.storage, `/Novels/${folder}`)).isDirectory()) {
                        const stats = readdirSync(join(this.config.storage, `/Novels/${folder}`));

                        stats.filter(stat => stat.endsWith(".pdf")).forEach(file => {
                            console.log("Reading " + file + ".");
                            const promise = new Promise(async(resolve, reject) => {
                                const folderName = folder;
                                let path = folderName + "/" + file;
                                if (!existsSync(join(this.config.storage, `/Novels/${path}`))) {
                                    console.log("Issue with path: " + join(this.config.storage, `/Novels/${path}`));
                                } else {
                                    const coverName = file.split(" [")[0] ? file.split(" [")[0] : file;
                                    const id = instance.makeId(5);
                                    path = path.endsWith(".pdf") ? path : path + ".pdf";
                                    let cover = null;

                                    const name = coverName.replace(/[^\w .-]/gi, "");
                                    resolve(true);

                                    const data = await prisma.novels.findFirst({
                                        where: {
                                            path: path
                                        }
                                    });
                                    if (!data) {
                                        console.log("Now inserting light novel " + name);
                                        if (!existsSync(join(this.config.storage, `/Novels/${folderName}/${coverName}_thumbnail.png`))) {
                                            cover = "/5 Centimeters per Second + Children Who Chase Lost Voices/5 Centimeters per Second + Children Who Chase Lost Voices - Complete_thumbnail.png"
                                        } else {
                                            cover = `${folderName}/${coverName}_thumbnail.png`;
                                        }

                                        await prisma.novels.create({
                                            data: {
                                                title: name,
                                                path: path,
                                                cover: cover,
                                                id: id
                                            }
                                        })
                                        resolve(true);
                                    } else {
                                        console.log(name + " already eixsts in the database.");
                                        resolve(true);
                                    }
                                }
                            })
                            promises.push(promise);
                        });
                    }
                }
                await Promise.all(promises).catch(console.error)
                resolve(null);
            } catch (e) {
                console.error(e);
                reject(null);
            }
        })
    }

    public async createCovers(): Promise<void> {
        const folders = readdirSync(join(this.config.storage, "/Novels"));
        const promises = [];

        for (const folder of folders) {
            if (lstatSync(join(this.config.storage, `/Novels/${folder}`)).isDirectory()) {
                const stats = readdirSync(join(this.config.storage, `/Novels/${folder}`));
                const instance = this;

                stats.filter(stat => stat.endsWith(".pdf")).forEach(file => {
                    const promise = new Promise(async(resolve, reject) => {
                        const folderName = folder;
                        const path = `/${folderName}/${file}`;
                        if (!existsSync(join(this.config.storage, `/Novels/${path}`))) {
                            console.log("Issue with path: " + join(this.config.storage, `/Novels/${path}`));
                        } else {
                            const name = file.split(" [")[0] ? file.split(" [")[0] : file;
                            const path = `/Novels/${folderName}/${file}`;
                            const pathToSnapshot = join(this.config.storage, path);
                            let cover = null;
                            // Creates thumbnails
                            if (!existsSync(join(this.config.storage, `/Novels/${folderName}/${name}_thumbnail.png`))) {
                                cover = await instance.getFirstPage(pathToSnapshot, `${folderName}/${name}_thumbnail.png`);
                                console.log("Fetched cover for " + cover + ".");
                            } else {
                                cover = `${folderName}/${name}_thumbnail.png`;
                                console.log("Cover for " + name + " already exists.");
                            }
                            
                            // Deletes all unneeded thumbnails
                            /*
                            if (existsSync(join(config.storage, `${path.split(".pdf")[0]}-001.png`))) {
                                unlink(join(config.storage, `${path.split(".pdf")[0]}-001.png`), function(err) {
                                    if (err) throw err;
                                    console.log("Deleted " + name + " err thumbnail 1");
                                })
                            }
                            if (existsSync(join(config.storage, `${path.split(".pdf")[0]}-002.png`))) {
                                unlink(join(config.storage, `${path.split(".pdf")[0]}-002.png`), function(err) {
                                    if (err) throw err;
                                    console.log("Deleted " + name + " err thumbnail 2");
                                })
                            }
                            if (existsSync(join(config.storage, `/Novels/${folderName}/${name}-1.png`))) {
                                unlink(join(config.storage, `/Novels/${folderName}/${name}-1.png`), function(err) {
                                    if (err) throw err;
                                    console.log("Deleted " + name + " err thumbnail 3");
                                })
                            }
                            if (existsSync(join(config.storage, `/Novels/${folderName}/${name}-01.png`))) {
                                unlink(join(config.storage, `/Novels/${folderName}/${name}-01.png`), function(err) {
                                    if (err) throw err;
                                    console.log("Deleted " + name + " err thumbnail 4");
                                })
                            }
                            if (existsSync(join(config.storage, `/Novels/${folderName}/${name}.pdf_thumbnail.png`))) {
                                unlink(join(config.storage, `/Novels/${folderName}/${name}.pdf_thumbnail.png`), function(err) {
                                    if (err) throw err;
                                    console.log("Deleted " + name + " err thumbnail 4");
                                })
                            }
                            // WILL DELETE ALL GOOD THUMBNAILS
                            if (existsSync(join(config.storage, `/Novels/${folderName}/${name}_thumbnail.png`))) {
                                unlink(join(config.storage, `/Novels/${folderName}/${name}_thumbnail.png`), function(err) {
                                    if (err) throw err;
                                    console.log("Deleted " + name + " real thumbnail.");
                                })
                            }
                            // WILL DELETE ALL DUPLICATES
                            if (existsSync(join(config.storage, `/Novels/${folderName}/${name}.pdf`))) {
                                unlink(join(config.storage, `/Novels/${folderName}/${name}.pdf`), function(err) {
                                    if (err) throw err;
                                    console.log("Deleted " + name + " duplicate.");
                                })
                            }
                            */
                        }
                    })
                    promises.push(promise);
                });
            }
        }

        await Promise.all(promises);
    }

    private async getFirstPage(pathToSnapshot, newPath) {
        return new Promise((resolve, reject) => {
            const file = pathToSnapshot;
            let poppler = null;
            if (this.config.isMacOS) {
                poppler = new Poppler(this.config.poppler_path);
            } else {
                poppler = new Poppler();
            }
            const options = {
                firstPageToConvert: 1,
                lastPageToConvert: 1,
                pngFile: true,
            };
            const outputFile = pathToSnapshot.split(".pdf")[0];
    
            if (existsSync(join(this.config.storage, `/Novels/${newPath}`))) {
                console.log("Cover already eixsts for " + `/Novels/${newPath}` + ".");
                resolve(newPath);
            } else {
                poppler.pdfToCairo(file, outputFile, options).then((res) => {
                    if (existsSync(outputFile + "-001.png")) {
                        rename(outputFile + "-001.png", join(this.config.storage, `/Novels/${newPath}`), (err) => {
                            if (err) throw err;
                            resolve(newPath);
                        });
                    } else if (existsSync(outputFile + "-01.png")) {
                        rename(outputFile + "-01.png", join(this.config.storage, `/Novels/${newPath}`), (err) => {
                            if (err) throw err;
                            resolve(newPath);
                        });
                    } else if (existsSync(outputFile + "-1.png")) {
                        rename(outputFile + "-1.png", join(this.config.storage, `/Novels/${newPath}`), (err) => {
                            if (err) throw err;
                            resolve(newPath);
                        });
                    } else {
                        console.log(outputFile + "-001.png and " + outputFile + "-01.png and " + outputFile + "-1.png don't exist!");
                        resolve(null);
                    }
                }).catch((err) => {
                    console.error(err);
                    resolve(null);
                });
            }
        })
    }

    public getCover(route:string): ReadStream {
        if (route.startsWith("/")) {
            route = route.substring(1);
        }
        const path = join(this.config.storage, `/Novels/${route}`);
        if (!existsSync(path)) {
            return null;
        }
        const stream = createReadStream(path);
        stream.on("error", () => {
            console.error("Could not read file.");
        })
        return stream;
    }

    public async getPDF(route:string): Promise<ReadStream> {
        if (route.startsWith("/")) {
            route = route.substring(1);
        }
        return new Promise(async(resolve, reject) => {
            const data = await prisma.novels.findFirst({
                where: {
                    id: route
                }
            })
            if (!data) {
                resolve(null);
            } else {
                const path = join(this.config.storage, `/Novels/${data.path}`);
                if (!existsSync(path)) {
                    return null;
                }
                const stream = createReadStream(path);
                stream.on("error", () => {
                    console.error("Could not read file.");
                })
                resolve(stream);
            }
        });
    }
}

interface SearchResponse {
    url:string;
    id:NovelInfo["id"];
    img:string;
    title:string;
}

interface NovelInfo {
    id:string;
    title:string;
    path:string;
    cover:string;
    author:string;
    numPages:number;
}

export type { SearchResponse };