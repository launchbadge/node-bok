import redis from "then-redis"
import config from "./config"

// Create and configure the redis client
let client = redis.createClient(
  {
    "port": config.get("redis.port"),
    "host": config.get("redis.host"),
    "auth_pass": config.get("redis.password"),
  }
)

// Export the redis client
export default client

// Select the database index (think name in traditional SQL)
client.select(config.get("redis.database"))
