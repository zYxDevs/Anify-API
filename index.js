const Marin = require("./built/anime/Marin").default;
let a = new Marin();
a.search("cote").then(console.log);
//a.getEpisodes("/anime/dewhzcns").then(console.log)