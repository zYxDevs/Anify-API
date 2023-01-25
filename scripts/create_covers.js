const Novels = require("../built/providers/Novels").default;
const novels = new Novels();
novels.createCovers().then(() => {
    console.log("Successfully created covers for light novels.");
}).catch((err) => {
    console.error(err);
})