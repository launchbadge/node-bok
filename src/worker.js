import rabbit from "wascally"
import {tasks} from "./task"
import {assert as assertTopology} from "./topology"

export async function run() {
  await assertTopology()

  // NOTE: Always setup your handlers before establishing
  //  the connection to the message broker
  for (let key of Object.keys(tasks)) {
    let fn = tasks[key]
    rabbit.handle(key, fn)
  }

  // Start the subscription
  // TODO: Queue names should be parameterized (at least)
  await rabbit.startSubscription("bok-q", "default")
}
