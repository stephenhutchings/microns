/*
    Microns are generated slightly differently than other fonts. The source of
    truth is a glyphs file - preferred for its path editor - which generates the
    TTF format. All other formats are then generated after reading this file.

    A JSON dictionary, SVG images and an example HTML file are also generated
    to make it easy to consume the icons in any format.
*/

const fs = require("fs")
const svgpath = require("svgpath")
const handlebars = require("handlebars")
const { Font, woff2 } = require("fonteditor-core")
const buffer = fs.readFileSync("./fonts/microns.ttf")

const templates = {
  svg: handlebars.compile(fs.readFileSync("./templates/template.svg").toString()),
  css: handlebars.compile(fs.readFileSync("./templates/template.css").toString()),
  scss: handlebars.compile(fs.readFileSync("./templates/template.scss").toString()),
  html: handlebars.compile(fs.readFileSync("./templates/template.html").toString())
}

const note = function(type) {
  return function(err) {
    if (err) console.error(err)
    else console.log(`✓ Saved ./fonts/microns.${type}`)
  }
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
  let scss = templates.scss({ icons })

  fs.writeFile(`./fonts/microns.html`, html, note("html"))
  fs.writeFile(`./fonts/microns.css`, css, note("css"))
  fs.writeFile(`./fonts/microns.scss`, scss, note("scss"))

  let types = ["woff2", "woff", "eot", "svg"]

  types.forEach(function(type){
    let buffer = font.write({ type })
    fs.writeFile(`./fonts/microns.${type}`, buffer, note(type))

    if (type === "svg") {
      let list = buffer.match(/<glyph [^>]+>/g).map(function(str){
        let data = str.match(/d="([^"]+)"/)
        if (data) {
          let name = str.match(/glyph-name="([^"]+)"/)[1]
          let path = data[1]
          let icon = icons.filter((i) => i.name === name)[0]

          path = svgpath(path)
            .abs()
            .translate(0, -fontObject.hhea.ascent)
            .scale(1, -1)
            .round()
            .toString()

          let width = icon.data.advanceWidth

          let svg = templates.svg({ name, path, width })
          fs.writeFileSync(`./svg/${name}.svg`, svg)
          return name
        } else {
          console.log("Skipped an empty glyph while creating SVG.");
        }
      })
      .filter((e) => e)

      console.log(`✓ Saved ${list.length} SVG images.`);

    }
  })
})
