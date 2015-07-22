import redis from "./redis"
import shortid from "shortid"
import _ from "lodash"
import rabbit from "wascally"
import config from "./config"
import {assert as assertTopology} from "./topology"
import microtime from "microtime"
import log from "./log"

export let tasks = {}
export let everyTasks = {}

let eagerExecution = false
if (config.has("eager")) {
  eagerExecution = config.get("eager")
}

function Task(name, method) {
  function publish() {
    let params = Array.prototype.slice.call(arguments)

    return new Promise((resolve, reject) => {
      assertTopology().then(function() {
        if (eagerExecution) {
          method({
            body: params,
            ack: resolve,
            reject
          })
        } else {
          rabbit.publish("bok-x", name, params).done(() => {
            setImmediate(resolve)
          })
        }
      })
    })
  }

  publish.every = function(number, key) {
    // Convert short-hand to long-hand (and default to s)
    const keys = {
      y: "years",
      Q: "quarters",
      M: "months",
      w: "weeks",
      d: "days",
      h: "hours",
      m: "minutes",
      s: "seconds"
    }

    if (_.values(keys).indexOf(key) < 0) {
      key = keys[key]
      if (key == null) {
        key = "seconds"
      }
    }

    // Store this job in redis (if it's not already)
    redis.hmset(`bok:every:${name}`, {
      everyNumber: parseInt(number),
      everyKey: key
    })

    // Add to everyTasks list
    everyTasks[name] = publish

    return publish
  }

  return publish
}

export function task(name, fn) {
  async function method(msg) {
    try {
      let uid = shortid.generate()
      let timestamp = microtime.now()
      log.info({id: uid}, "Received task", name)

      await fn.apply(undefined, msg.body)

      // TODO: This timestamp logging should go somewhere else
      let elapsed = (microtime.now() - timestamp) / 1000
      log.info({id: uid}, "Task", name,
        `succeeded in ${elapsed.toFixed(1)}ms`)

      // Task finished execution
      msg.ack()

    } catch(err) {
      log.error(err)

      // Task failed execution; dispose
      // TODO: Should be configurable (retry, etc.)
      msg.reject()
    }
  }

  // TODO: Report on overriding tasks
  tasks[name] = method

  return Task(name, method)
}
