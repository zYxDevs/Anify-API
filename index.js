const Sync = require("./built/Sync").default;
let a = new Sync();
a.getRecentEpisodes().then(console.log)
//a.crawl("ANIME").then(console.log);