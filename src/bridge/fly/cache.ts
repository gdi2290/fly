import { registerBridge, Context } from '../'
import { ivm } from '../../'
import log from '../../log'
import { Trace } from '../../trace'
import { Config } from '../../config';
import { transferInto } from '../../utils/buffer'

const errCacheStoreUndefined = new Error("cacheStore is not defined in the config.")

registerBridge('flyCacheSet', function (ctx: Context, config: Config) {
  return function cacheSet(key: string, value: string | ArrayBuffer | Buffer, ttl: number, callback: ivm.Reference<Function>) {
    let t = Trace.tryStart("cacheSet", ctx.trace)
    ctx.addCallback(callback)
    let k = "cache:" + ctx.meta.get('app').id + ":" + key

    if (!config.cacheStore)
      return ctx.tryCallback(callback, [errCacheStoreUndefined.toString()])

    let size = 0
    if (value instanceof ArrayBuffer) {
      console.log("Setting buffer in cache:", key, value.constructor.name, value.byteLength, ttl)
      size = value.byteLength
      value = Buffer.from(value)
    } else {
      size = value.length
    }
    config.cacheStore.set(k, value, ttl).then((ok) => {
      t.end({ size: size, key: key })
      ctx.tryCallback(callback, [null, ok])
    }).catch((err) => {
      log.error(err)
      t.end()
      ctx.tryCallback(callback, [err.toString()])
    })
    return
  }
})

registerBridge('flyCacheExpire', function (ctx: Context, config: Config) {
  return function cacheExpire(key: string, ttl: number, callback: ivm.Reference<Function>) {
    let t = Trace.tryStart("cacheExpire", ctx.trace)
    ctx.addCallback(callback)
    let k = "cache:" + ctx.meta.get('app').id + ":" + key

    if (!config.cacheStore)
      return ctx.tryCallback(callback, [errCacheStoreUndefined.toString()])

    config.cacheStore.expire(k, ttl).then((ok) => {
      t.end({ key: key })
      ctx.applyCallback(callback, [null, ok])
    }).catch((err) => {
      t.end()
      ctx.tryCallback(callback, [err.toString()])
    })
  }
})

registerBridge('flyCacheGet', function (ctx: Context, config: Config) {
  return function cacheGet(key: string, callback: ivm.Reference<Function>) {
    let t = Trace.tryStart("cacheGet", ctx.trace)
    ctx.addCallback(callback)
    let k = "cache:" + ctx.meta.get('app').id + ":" + key

    if (!config.cacheStore)
      return ctx.tryCallback(callback, [errCacheStoreUndefined.toString()])

    config.cacheStore.get(k).then((buf) => {
      const size = buf ? buf.byteLength : 0
      t.end({ size: size, key: key })
      ctx.applyCallback(callback, [null, transferInto(buf)])
    }).catch((err) => {
      console.error("got err in cache.get", err)
      t.end()
      ctx.tryCallback(callback, [err.toString()])
    })
  }
})