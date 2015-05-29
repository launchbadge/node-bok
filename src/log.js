import bunyan from "bunyan"
import config from "config"

// Create a stdout pipe (if during tests)
var stdout = process.stdout
if (process.env.NODE_ENV === "test") {
  var PrettyStream = require("bunyan-prettystream")

  stdout = new PrettyStream()
  stdout.pipe(process.stdout)
}

let logLevel = "info"
if (config.has("bok.log.level")) {
  logLevel = config.get("bok.log.level")
}

let log = bunyan.createLogger({
  name: "bok",
  stream: stdout,
  level: logLevel
})

export default log
