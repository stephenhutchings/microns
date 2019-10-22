const fs = require("fs")
const handlebars = require("handlebars")


const svgFont = fs.readFileSync("./fonts/microns.svg").toString()
const icons = require("./icons.json")

const templates = {
  html: handlebars.compile(fs.readFileSync("./templates/test.html").toString())
}

fs.writeFileSync("./fonts/test.html", templates.html({icons}))
