/*
    Microns are generated slightly differently than other fonts. The source of
    truth is a glyphs file - preferred for its path editor - which generates the
    TTF format. All other formats are then generated after reading this file.

    A JSON dictionary, SVG images and an example HTML file are also generated
    to make it easy to consume the icons in any format.
*/

let fs = require("fs")
let svgpath = require("svgpath")
let handlebars = require("handlebars")
let { Font, woff2 } = require("fonteditor-core")
let buffer = fs.readFileSync("./fonts/microns.ttf")

const templates = {
  svg: handlebars.compile(fs.readFileSync("./templates/template.svg").toString()),
  css: handlebars.compile(fs.readFileSync("./templates/template.css").toString()),
  html: handlebars.compile(fs.readFileSync("./templates/template.html").toString())
}

woff2.init().then(function(){
  let font = Font.create(buffer, { type: "ttf" })
  let fontObject = font.get()

  let icons = fontObject.glyf
    .filter((g) => g.unicode && g.name !== "space")
    .map((g) => ({
      code: g.unicode[0].toString(16),
      name: g.name,
      data: g
    }))

  let html = templates.html({ icons })
  let css = templates.css({ icons })

  fs.writeFileSync(`./fonts/microns.html`, html)
  fs.writeFileSync(`./fonts/microns.css`, css)

  let types = ["woff2", "woff", "eot", "svg"]

  types.forEach(function(type){
    let buffer = font.write({ type })
    fs.writeFileSync(`./fonts/microns.${type}`, buffer)

    if (type === "svg") {
      buffer.match(/<glyph [^>]+>/g).forEach(function(str){
        let data = str.match(/d="([^"]+)"/)
        if (data) {
          let name = str.match(/glyph-name="([^"]+)"/)[1]
          let path = data[1]
          let icon = icons.filter((i) => i.name === name)[0]

          if (name == "radio-on") {
            console.log(path);
          }

          path = svgpath(path)
            .abs()
            .translate(0, -fontObject.hhea.ascent)
            .scale(1, -1)
            .round()
            .toString()

          let width = icon.data.advanceWidth

          let svg = templates.svg({ name, path, width })
          fs.writeFileSync(`./svg/${name}.svg`, svg)
        } else {
          console.log(str);
        }
      })
    }
  })
})
