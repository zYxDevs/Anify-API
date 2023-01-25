const Novels = require("../built/providers/Novels").default;
const novels = new Novels();
novels.insert().then(() => {
    console.log("Successfully inserted novels.");
}).catch((err) => {
    console.error(err);
})