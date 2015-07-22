process.env.SUPPRESS_NO_CONFIG_WARNING = "y"
var config = require("config")

// Declare default configuration
let defaults = {
  eager: false,

  // Enable cluster by-default if we're in production
  cluster: (process.env.NODE_ENV === "production"),

  // RabbitMQ configuration (AMQP)
  rabbit: {
    user: "guest",
    password: "guest",
    host: "localhost",
    port: 5672,
  },

  // Redis configuration
  redis: {
    host: "127.0.0.1",
    port: 6379,
    database: 0,
    password: null
  },

  // Bind address of the API server
  host: "0.0.0.0",
  port: 9090,

  // Default log-level
  log: "info",

  // Trace each BOK task (yes/no)
  trace: (process.env.NODE_ENV !== "test"),
}

// Setup default configuration
config.util.setModuleDefaults("bok", defaults)

export function configure(options = {}) {
  // Mixin configs that have been passed in, and make those my defaults
  config.util.extendDeep(defaults, options)
  config.util.setModuleDefaults("bok", defaults)
}

export function has(key) {
  return config.has(`bok.${key}`)
}

export function get(key) {
  return config.get(`bok.${key}`)
}

export default {
  configure,
  get,
  has
}
