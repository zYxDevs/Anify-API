const Anify = require("./built/Anify").default;
const colors = require("colors");
let anify = new Anify({ is_sqlite: true });
const start = new Date(Date.now());
/*
anify.get("98659").then((data) => {
    console.log(data.data.title)
    console.log(data.connectors);
    const end = new Date(Date.now());
    console.log(colors.gray("Finished fetching data. Request(s) took ") + colors.cyan(String(end.getTime() - start.getTime())) + colors.gray(" milliseconds."));
})
*/
anify.search("kaguya-sama love is war season 2", "ANIME").then((res) => {
    console.log(res[0].data.id);
    console.log(res[0].data.title)
    console.log(res[0].connectors);
    const end = new Date(Date.now());
    console.log(colors.gray("Finished fetching data. Request(s) took ") + colors.cyan(String(end.getTime() - start.getTime())) + colors.gray(" milliseconds."));
});
/*
anify.searchAccurate("86", "ANIME").then((res) => {
    console.log(res[0].data.id);
    console.log(res[0].data.title)
    console.log(res[0].connectors);
    const end = new Date(Date.now());
    console.log(colors.gray("Finished fetching data. Request(s) took ") + colors.cyan(String(end.getTime() - start.getTime())) + colors.gray(" milliseconds."));
})
*/