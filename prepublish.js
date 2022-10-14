/*
    Microns are generated slightly differently than other fonts. The source of
    truth is a glyphs file - preferred for its path editor - which generates the
    OTF format. All other formats are then generated after reading this file.

    A JSON dictionary, SVG images and an preview SVG image are also available
    to make it easy to consume the icons in any format.
*/

const fs = require("fs")
const path = require("path")
const svgpath = require("svgpath")
const handlebars = require("handlebars")
const { Font, woff2 } = require("fonteditor-core")
const buffer = fs.readFileSync("./fonts/microns.otf")

handlebars.registerHelper("round", Math.round)

const templates = {
  svg: handlebars.compile(
    fs.readFileSync("./templates/template.svg").toString()
  ),
  css: handlebars.compile(
    fs.readFileSync("./templates/template.css").toString()
  ),
  scss: handlebars.compile(
    fs.readFileSync("./templates/template.scss").toString()
  ),
  preview: handlebars.compile(
    fs.readFileSync("./templates/preview.svg").toString()
  ),
}

const dest = {
  svg: (file = "") => path.join(__dirname, "svg", file),
  fonts: (file = "") => path.join(__dirname, "fonts", file),
  make: (dir) => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { force: true, recursive: true })
    }

    fs.mkdirSync(dir)
  },
}

const note = function (type) {
  return function (err) {
    if (err) console.error(err)
    else console.log(`✓ Saved ./fonts/microns.${type}`)
  }
}

woff2.init().then(function () {
  const font = Font.create(buffer, { type: "otf" })
  const fontObject = font.get()

  // Empty folders
  dest.make(dest.fonts())
  dest.make(dest.svg())

  const icons = fontObject.glyf
    .filter((g) => g.unicode && g.name !== "space")
    .map((g) => ({
      code: g.unicode[0].toString(16),
      name: g.name,
      data: g,
    }))

  const css = templates.css({ icons })
  const scss = templates.scss({ icons })

  fs.writeFile(dest.fonts("microns.css"), css, note("css"))
  fs.writeFile(dest.fonts("microns.scss"), scss, note("scss"))
  fs.writeFile(dest.fonts("microns.otf"), buffer, note("scss"))

  const types = ["woff2", "woff", "ttf", "svg"]

  types.forEach(function (type) {
    const buffer = font.write({ type })

    fs.writeFile(dest.fonts(`microns.${type}`), buffer, note(type))

    if (type === "svg") {
      const height = fontObject.hhea.ascent - fontObject.hhea.descent

      const list = buffer
        .match(/<glyph [^>]+>/g)
        .map((str) => {
          const data = str.match(/d="([^"]+)"/)

          if (data) {
            const name = str.match(/glyph-name="([^"]+)"/)[1]
            const icon = icons.filter((i) => i.name === name)[0]

            const path = svgpath(data[1])
              .rel()
              .translate(0, -fontObject.hhea.ascent)
              .scale(1, -1)
              .round()
              .toString()

            const width = icon.data.advanceWidth

            return { name, width, height, path }
          } else {
            console.log("Skipped an empty glyph while creating SVG.")
          }
        })
        .filter((e) => e)

      const rows = Math.ceil(Math.sqrt(list.length))
      const cols = Math.ceil(list.length / rows)

      const iconSize = 24
      const iconGap = 24
      const padding = 24
      const scale = height / iconSize

      list.forEach((icon, i) => {
        const x = i % cols
        const y = Math.floor(i / rows)

        icon.x =
          padding +
          (iconGap + iconSize) * x +
          (iconSize - icon.width / scale) / 2
        icon.y = padding + (iconGap + iconSize) * y
        icon.w = iconSize * (icon.width / height)
        icon.h = iconSize
      })

      fs.writeFileSync(
        dest.fonts("preview.svg"),
        templates.preview({
          list,
          height: rows * iconSize + (rows - 1) * iconGap + padding * 2,
          width: cols * iconSize + (cols - 1) * iconGap + padding * 2,
        })
      )

      list.forEach((icon) => {
        if (icon) {
          fs.writeFileSync(dest.svg(`${icon.name}.svg`), templates.svg(icon))
        }
      })

      console.log(`✓ Saved ${list.length} SVG images.`)
    }
  })
})
