import _ from "lodash"
import cluster from "cluster"
import config from "config"
import rabbit from "wascally"
import os from "os"
import log from "./log"
import {run as runWorker} from "./worker"

import {task} from "./task"
export {task} from "./task"

export async function run() {
  // Approximate a concurrency count (or use the defined)
  let concurrency = true
  if (config.has("bok.concurrency")) {
    concurrency = config.get("bok.concurrency")
  }

  if (concurrency === true) {
    concurrency = os.cpus().length * 2 + 1
  } else if (concurrency == false) {
    concurrency = 1
  } else if (concurrency <= 0) {
    concurrency = 1
  }

  // Log that we have a successfull connection (if on master)
  if (cluster.isMaster) {
    log.info("Connected to amqp://guest:**@localhost:5672//")
  }

  if (concurrency >= 1) {
    if (cluster.isMaster) {
      log.info(
        `Creating cluster of ${concurrency} workers (pre-forking)`)

      // Wait for at least a single fork befor reporting ready
      cluster.on("fork", _.once(function() {
        log.warn("Ready")
      }))

      // Hook into termination and interrupt signals to gracefully stop
      // TODO: Break this up and restart workers if they die randomly
      cluster.on('exit', _.after(concurrency, function(worker) {
        // TODO: Maybe a log message?

        /* eslint-disable */
        process.exit(128);
        /* eslint-enable */
      }));

      // TODO: Maybe log that we are ignoring this and waiting for
      //  workers to terminate themselves
      function ignore() { }

      process.on("SIGTERM", ignore)
      process.on("SIGINT", ignore)

      // Create `concurrency` number of workers
      for (let i = 0; i < concurrency; i += 1) {
        cluster.fork()
      }
    } else {
      // Hook into termination and interrupt signals to gracefully stop
      let gracefulExit = _.once(function() {
        rabbit.closeAll().then(function() {
          cluster.worker.kill()
        })
      })

      process.on("SIGTERM", gracefulExit)
      process.on("SIGINT", gracefulExit)

      // Spin up the worker for this child
      runWorker()
    }
  } else {
    // Hook into termination and interrupt signals to gracefully stop
    let gracefulExit = _.once(function() {
      rabbit.closeAll().then(function() {
        process.exit(128)
      })
    })

    process.on("SIGTERM", gracefulExit)
    process.on("SIGINT", gracefulExit)

    // Report that we are ready to accept tasks
    log.warn("Ready")

    // Spin up the single worker
    runWorker()
  }
}

export default {run,task}
