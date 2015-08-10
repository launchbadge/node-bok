import _ from "lodash"
import cluster from "cluster"
import config from "./config"
import rabbit from "wascally"
import os from "os"
import log from "./log"
import {run as runWorker, stop as stopWorker} from "./worker"

import {task, publish} from "./task"
export {task, publish} from "./task"

function gracefulExit() {
  stopWorker()
  rabbit.closeAll().then(function() {
    // If this is a worker; let the master know
    if (cluster.worker) {
      cluster.worker.kill()
    } else {
      // The world has been cleaned; exit now
      /* eslint-disable */
      process.exit(128)
      /* eslint-enable */
    }
  })
}

let terminateCount = 0
function onTerminate() {
  if (terminateCount === 0) {
    terminateCount += 1
    gracefulExit()
  } else {
    // Force exit immediately
    /* eslint-disable */
    process.exit(128)
    /* eslint-enable */
  }
}

export async function run() {
  // Approximate a concurrency count (or use the defined)
  let concurrency = true
  if (config.has("concurrency")) {
    concurrency = config.get("concurrency")
  }

  if (concurrency === true) {
    concurrency = os.cpus().length * 2 + 1
  } else if (concurrency === false) {
    concurrency = 1
  } else if (concurrency <= 0) {
    concurrency = 1
  }

  // Log that we have a successfull connection (if on master)
  if (cluster.isMaster) {
    log.info("Connected to amqp://guest:**@localhost:5672//")
  }

  if (cluster.isMaster && concurrency >= 1) {
    log.info(
      `Creating cluster of ${concurrency} workers (pre-forking)`)

    // Wait for at least a single fork befor reporting ready
    cluster.on("fork", _.once(function() {
      log.warn("Ready")
    }))

    // Hook into termination and interrupt signals to gracefully stop
    cluster.on("disconnect", _.after(concurrency, function() {
      /* eslint-disable */
      process.exit(128);
      /* eslint-enable */
    }))

    // Restart the worker that exited pre-maturely
    var terminating = false
    cluster.on("exit", function(worker) {
      if (terminating) return

      log.warn(`worker ${worker.process.pid} has exited, restarting ...`)

      // Restart the worker
      cluster.fork()
    })

    // Ignore termination signals on master
    function ignore() {
      terminating = true
    }

    process.on("SIGTERM", ignore)
    process.on("SIGINT", ignore)

    // Create `concurrency` number of workers
    for (let i = 0; i < concurrency; i += 1) {
      cluster.fork({"CHILD_ID": i})
    }
  } else {
    // Hook into termination and interrupt signals to gracefully exit
    process.on("SIGTERM", onTerminate)
    process.on("SIGINT", onTerminate)

    if (!(concurrency >= 1)) {
      // Report that we are ready to accept tasks
      log.warn("Ready")
    }

    // Spin up the single worker
    runWorker()
  }
}

export default {run, task, publish}
