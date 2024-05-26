import keys from './keys.js'
import redis from "redis";

const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retryStartegy: () => 1000,
});

const sub = redisClient.duplicate();

function fib(index) {
  if (index < 2) return 1;
  return fib(index - 1) + fib(index - 2);
}

sub.on("message", (channel, message) => {
  console.log("[DODO] message", channel, message)
  console.log("[DODO] fib result", fib(parseInt(message)))
  redisClient.hset("values", message, fib(parseInt(message)));
});
sub.subscribe('insert');
