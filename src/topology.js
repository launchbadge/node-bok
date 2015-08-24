import config from "./config"
import rabbit from "wascally"

let connected = false

export async function assert(options = {}) {
  if (!connected) {
    await configure(rabbit, options)
    connected = true
  }
}

function configure(rabbit, options) {
  return rabbit.configure({
    // Gather the broker connection information
    connection: {
      user: config.get("rabbit.user"),
      pass: config.get("rabbit.password"),
      server: [config.get("rabbit.host")],
      port: config.get("rabbit.port"),
      vhost: "%2f",
      replyQueue: false,
    },

    // Configure the single exchange
    exchanges: [
      {
        // TODO: Should be parameterized with a defined name
        name: "bok-x",
        type: "fanout",
      }
    ],

    // Configure the queues only subscribe if
    // the caller is requesting (publishers shouldn't
    // subscribe)
    queues: [
      // Default queue that most messages can be
      // routed through. We should only add additional
      // queues to handle throughput issues.
      {
        // TODO: Should be parameterized with a defined name
        name: "bok-q",
        subscribe: options.subscribe === true,
        limit: 5,
      }
    ],

    // Bind queues to exchanges
    bindings: [
      {
        // TODO: Should be parameterized with a defined name
        exchange: "bok-x",
        target: "bok-q",
        keys: []
      }
    ]
  })
}
