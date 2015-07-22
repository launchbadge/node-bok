import config from "./config"
export default require("simple-bunyan")("bok", config.get("log"))
