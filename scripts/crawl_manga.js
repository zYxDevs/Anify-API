const Core = require("../built/Core").default;
let aniSync = new Core();
aniSync.crawl("ANIME").then(console.log);