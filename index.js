const MangaPark = require("./built/providers/manga/MangaPark").default;
let a = new MangaPark();
a.getPages("/manga/kubo-san-wa-boku-mobu-wo-yurusanai-yukimori-nene//manga/kubo-san-wa-boku-mobu-wo-yurusanai-yukimori-nene/i2753939/c110/1").then(console.log)