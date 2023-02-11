const Core = require("../built/Core").default;
let aniSync = new Core();
aniSync.crawl("MANGA").then(console.log);