const Novels = require("./built/novels/Novels").default;
let novels = new Novels();
novels.loadConfig();
novels.insert()