import shortid from "shortid"
import rabbit from "wascally"
import config from "config"
import {assert as assertTopology} from "./topology"
import microtime from "microtime"
import log from "./log"

export let tasks = {}

let eagerExecution = false
if (config.has("bok.eager")) {
  config.get("bok.eager")
}

function Task(name, method) {
  return function publish() {
    let params = Array.prototype.slice.call(arguments);

    return new Promise((resolve, reject) => {
      assertTopology().then(function() {
        if (eagerExecution) {
          method.then(resolve).catch(reject)
        } else {
          rabbit.publish("bok-x", name, params).done(() => {
            setImmediate(resolve)
          })
        }
      })
    })
  }
}

export function task(name, fn) {
  let method = async function wrapper(msg) {
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
