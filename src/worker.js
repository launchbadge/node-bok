import moment from "moment"
import rabbit from "wascally"
import redis from "./redis"
import {tasks, everyTasks} from "./task"
import {assert as assertTopology} from "./topology"
import cluster from "cluster"

let processInterval = null

function processTasks() {
  for (let name of Object.keys(everyTasks)) {
    let key = `bok:every:${name}`
    redis.hgetall(key).then(function(res) {
      let lastRanAt = res.lastRanAt
      if (!lastRanAt) {
        // Schedule immediately
        everyTasks[name]()
        redis.hset(key, "lastRanAt", moment.utc().format())
      } else {
        let diff = moment.utc().diff(lastRanAt, res.everyKey)
        if (diff >= res.everyNumber) {
          // Schedule now
          everyTasks[name]()
          redis.hset(key, "lastRanAt", moment.utc().format())
        }
      }
    })
  }
}

export async function run() {
  await assertTopology()

  // NOTE: Always setup your handlers before establishing
  //  the connection to the message broker
  for (let key of Object.keys(tasks)) {
    let fn = tasks[key]
    rabbit.handle(key, fn)
  }

  // Only CHILD-ID #0 or master worries about this
  if (cluster.isMaster || process.env.CHILD_ID === "0") {
    // If we have any every-d tasks ..
    if (Object.keys(everyTasks).length > 0) {
      processInterval = setInterval(processTasks, 800)
    }
  }

  // Start the subscription
  // TODO: Queue names should be parameterized (at least)
  await rabbit.startSubscription("bok-q", "default")
}

export function stop() {
  if (processInterval) {
    clearInterval(processInterval)
    processInterval = null
  }
}
