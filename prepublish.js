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

const dict = JSON.parse(fs.readFileSync("icons.json"))

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

// Throws an error if the dictionary icon codes are out of sync with the font
const testDictionaryCodes = function (icons) {
  const errors = []
  icons.forEach((icon) => {
    const item = dict.find((other) => other.class.slice(3) === icon.name)

    if (!item) {
      errors.push(["Missing item", icon.name])
    }

    const codeA = parseInt(icon.code, 16)
    const codeB = parseInt(item.code, 16)

    if (codeA !== codeB) {
      errors.push(["Codes do not match", icon.name, icon.code, item.code])
    }
  })

  if (errors.length) {
    console.log("Build cancelled. Check these items in the dictionary.")

    errors.forEach((err) => {
      console.log(err.join(" - "))
    })

    process.exit()
  }
}

woff2.init().then(function () {
  const font = Font.create(buffer, { type: "otf" })
  const fontObject = font.get()

  const icons = fontObject.glyf
    .filter((g) => g.unicode && g.name !== "space")
    .map((g) => ({
      code: g.unicode[0].toString(16),
      name: g.name,
      data: g,
    }))

  testDictionaryCodes(icons)

  // Empty folders
  dest.make(dest.fonts())
  dest.make(dest.svg())

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

      const cols = 12
      const rows = Math.ceil(list.length / cols)

      const iconSize = 24
      const iconGap = 24
      const padding = 24
      const scale = height / iconSize

      list.forEach((icon, i) => {
        const x = i % cols
        const y = Math.floor(i / cols)

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
