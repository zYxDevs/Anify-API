"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const API_1 = require("../API");
const node_poppler_1 = require("node-poppler");
const client_1 = require("../db/client");
const fs_1 = require("fs");
class Novels extends API_1.default {
    constructor() {
        super(API_1.ProviderType.NOVEL);
    }
    async search(query) {
        const results = [];
        const novels = await this.getAllNovelsFromSQL();
        for (let i = 0; i < novels.length; i++) {
            if (this.stringSearch(novels[i].title, query) >= 1 && results.length < 20) {
                results.push(novels[i]);
            }
        }
        return results;
    }
    async getTotal() {
        const total = await this.getAllNovelsFromSQL();
        return total.length;
    }
    async getAllNovelsFromSQL() {
        return client_1.prisma.novels.findMany();
    }
    async insert() {
        return new Promise(async (resolve, reject) => {
            const instance = this;
            console.log("Serializing database...");
            try {
                console.log("Serialized database.");
                console.log("Reading directory...");
                const folders = (0, fs_1.readdirSync)((0, path_1.join)(this.config.storage, "/Novels"));
                const promises = [];
                for (const folder of folders) {
                    if ((0, fs_1.lstatSync)((0, path_1.join)(this.config.storage, `/Novels/${folder}`)).isDirectory()) {
                        const stats = (0, fs_1.readdirSync)((0, path_1.join)(this.config.storage, `/Novels/${folder}`));
                        stats.filter(stat => stat.endsWith(".pdf")).forEach(file => {
                            console.log("Reading " + file + ".");
                            const promise = new Promise(async (resolve, reject) => {
                                const folderName = folder;
                                let path = folderName + "/" + file;
                                if (!(0, fs_1.existsSync)((0, path_1.join)(this.config.storage, `/Novels/${path}`))) {
                                    console.log("Issue with path: " + (0, path_1.join)(this.config.storage, `/Novels/${path}`));
                                }
                                else {
                                    const coverName = file.split(" [")[0] ? file.split(" [")[0] : file;
                                    const id = instance.makeId(5);
                                    path = path.endsWith(".pdf") ? path : path + ".pdf";
                                    let cover = null;
                                    const name = coverName.replace(/[^\w .-]/gi, "");
                                    resolve(true);
                                    const data = await client_1.prisma.novels.findFirst({
                                        where: {
                                            path: path
                                        }
                                    });
                                    if (!data) {
                                        console.log("Now inserting light novel " + name);
                                        if (!(0, fs_1.existsSync)((0, path_1.join)(this.config.storage, `/Novels/${folderName}/${coverName}_thumbnail.png`))) {
                                            cover = "/5 Centimeters per Second + Children Who Chase Lost Voices/5 Centimeters per Second + Children Who Chase Lost Voices - Complete_thumbnail.png";
                                        }
                                        else {
                                            cover = `${folderName}/${coverName}_thumbnail.png`;
                                        }
                                        await client_1.prisma.novels.create({
                                            data: {
                                                title: name,
                                                path: path,
                                                cover: cover,
                                                id: id
                                            }
                                        });
                                        resolve(true);
                                    }
                                    else {
                                        console.log(name + " already eixsts in the database.");
                                        resolve(true);
                                    }
                                }
                            });
                            promises.push(promise);
                        });
                    }
                }
                await Promise.all(promises).catch(console.error);
                resolve(null);
            }
            catch (e) {
                console.error(e);
                reject(null);
            }
        });
    }
    async createCovers() {
        const folders = (0, fs_1.readdirSync)((0, path_1.join)(this.config.storage, "/Novels"));
        const promises = [];
        for (const folder of folders) {
            if ((0, fs_1.lstatSync)((0, path_1.join)(this.config.storage, `/Novels/${folder}`)).isDirectory()) {
                const stats = (0, fs_1.readdirSync)((0, path_1.join)(this.config.storage, `/Novels/${folder}`));
                const instance = this;
                stats.filter(stat => stat.endsWith(".pdf")).forEach(file => {
                    const promise = new Promise(async (resolve, reject) => {
                        const folderName = folder;
                        const path = `/${folderName}/${file}`;
                        if (!(0, fs_1.existsSync)((0, path_1.join)(this.config.storage, `/Novels/${path}`))) {
                            console.log("Issue with path: " + (0, path_1.join)(this.config.storage, `/Novels/${path}`));
                        }
                        else {
                            const name = file.split(" [")[0] ? file.split(" [")[0] : file;
                            const path = `/Novels/${folderName}/${file}`;
                            const pathToSnapshot = (0, path_1.join)(this.config.storage, path);
                            let cover = null;
                            // Creates thumbnails
                            if (!(0, fs_1.existsSync)((0, path_1.join)(this.config.storage, `/Novels/${folderName}/${name}_thumbnail.png`))) {
                                cover = await instance.getFirstPage(pathToSnapshot, `${folderName}/${name}_thumbnail.png`);
                                console.log("Fetched cover for " + cover + ".");
                            }
                            else {
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
                    });
                    promises.push(promise);
                });
            }
        }
        await Promise.all(promises);
    }
    async getFirstPage(pathToSnapshot, newPath) {
        return new Promise((resolve, reject) => {
            const file = pathToSnapshot;
            let poppler = null;
            if (this.config.isMacOS) {
                poppler = new node_poppler_1.Poppler(this.config.poppler_path);
            }
            else {
                poppler = new node_poppler_1.Poppler();
            }
            const options = {
                firstPageToConvert: 1,
                lastPageToConvert: 1,
                pngFile: true,
            };
            const outputFile = pathToSnapshot.split(".pdf")[0];
            if ((0, fs_1.existsSync)((0, path_1.join)(this.config.storage, `/Novels/${newPath}`))) {
                console.log("Cover already eixsts for " + `/Novels/${newPath}` + ".");
                resolve(newPath);
            }
            else {
                poppler.pdfToCairo(file, outputFile, options).then((res) => {
                    if ((0, fs_1.existsSync)(outputFile + "-001.png")) {
                        (0, fs_1.rename)(outputFile + "-001.png", (0, path_1.join)(this.config.storage, `/Novels/${newPath}`), (err) => {
                            if (err)
                                throw err;
                            resolve(newPath);
                        });
                    }
                    else if ((0, fs_1.existsSync)(outputFile + "-01.png")) {
                        (0, fs_1.rename)(outputFile + "-01.png", (0, path_1.join)(this.config.storage, `/Novels/${newPath}`), (err) => {
                            if (err)
                                throw err;
                            resolve(newPath);
                        });
                    }
                    else if ((0, fs_1.existsSync)(outputFile + "-1.png")) {
                        (0, fs_1.rename)(outputFile + "-1.png", (0, path_1.join)(this.config.storage, `/Novels/${newPath}`), (err) => {
                            if (err)
                                throw err;
                            resolve(newPath);
                        });
                    }
                    else {
                        console.log(outputFile + "-001.png and " + outputFile + "-01.png and " + outputFile + "-1.png don't exist!");
                        resolve(null);
                    }
                }).catch((err) => {
                    console.error(err);
                    resolve(null);
                });
            }
        });
    }
    getCover(route) {
        if (route.startsWith("/")) {
            route = route.substring(1);
        }
        const path = (0, path_1.join)(this.config.storage, `/Novels/${route}`);
        if (!(0, fs_1.existsSync)(path)) {
            return null;
        }
        const stream = (0, fs_1.createReadStream)(path);
        stream.on("error", () => {
            console.error("Could not read file.");
        });
        return stream;
    }
    async getPDF(route) {
        if (route.startsWith("/")) {
            route = route.substring(1);
        }
        return new Promise(async (resolve, reject) => {
            const data = await client_1.prisma.novels.findFirst({
                where: {
                    id: route
                }
            });
            if (!data) {
                resolve(null);
            }
            else {
                const path = (0, path_1.join)(this.config.storage, `/Novels/${data.path}`);
                if (!(0, fs_1.existsSync)(path)) {
                    return null;
                }
                const stream = (0, fs_1.createReadStream)(path);
                stream.on("error", () => {
                    console.error("Could not read file.");
                });
                resolve(stream);
            }
        });
    }
}
exports.default = Novels;
//# sourceMappingURL=Novels.js.map