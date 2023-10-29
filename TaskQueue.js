export class TaskQueue {
  #concurrency = 1
  #resolveQueueEmpty = null
  #queueEmptyPromise = null
  #queue = []
  #concurrentTaskCount = 0

  constructor( concurrency ) {
    this.#concurrency = concurrency || this.#concurrency
  }

  get concurrency() {
    return this.#concurrency
  }

  get concurrentTaskCount() {
    return this.#concurrentTaskCount
  }

  get finished() {
    if ( !this.queue.length && this.#concurrentTaskCount === 0 ) {
      return Promise.resolve( true )
    }

    // Return queueEmptyPromise, creating a new one if necessary.
    return this.#queueEmptyPromise =
      this.#queueEmptyPromise
      || new Promise(( resolve ) => {
        this.#resolveQueueEmpty = resolve
      })
  }

  get queue() {
    return this.#queue
  }

  /*set concurrency( value ) {
    this.#concurrency = value
  }*/

  add( task, callback = promisifyTask ) {
    // We're adding more tasks, so if there's a queueEmptyPromise,
    // we should nullify it.
    this.#queueEmptyPromise = null
    this.#resolveQueueEmpty = null

    const { promise, wrappedTask } = callback( task )

    this.queue.push( wrappedTask )
    this.next()

    return promise
  }

  next() {
    if (
      this.#concurrentTaskCount >= this.concurrency
      || !this.queue.length
    ) {
      if ( this.#concurrentTaskCount === 0 && this.#resolveQueueEmpty ) {
        // If no tasks are running and there's a resolver waiting, call it.
        this.#resolveQueueEmpty( false )
      }
      return
    }

    this.#concurrentTaskCount++
    const task = this.queue.shift()
    // eslint-disable-next-line promise/catch-or-return
    task().finally(() => {
      this.#concurrentTaskCount--
      this.next()
    })
  }
}

/**
 * Promisify a task.
 * @param {Function} task The task to promisify.
 * @returns {{promise: Promise, wrappedTask: Function}} The promisified task.
 */
function promisifyTask( task ) {
  let resolve, reject
  const promise = new Promise(( _resolve, _reject ) => {
    resolve = _resolve
    reject = _reject
  })

  return {
    promise,

    wrappedTask: async () => {
      try {
        resolve( await task())
      } catch ( error ) {
        reject( error )
        throw error
      }
    }
  }
}
