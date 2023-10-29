
export class WorkerQueue {
  #concurrency = 1
  #id = crypto.randomUUID()
  #workerPool = []
  #resolveQueueEmpty = null
  #queueEmptyPromise = null
  #messagesQueue = []
  #concurrentMessageCount = 0
  #uri

  constructor( concurrency, uri ) {
    this.#concurrency = concurrency || this.#concurrency
    this.#uri = uri

    for ( let i = 0; i < this.#concurrency; i++ ) {
      this.#workerPool.push( createWorker( this.#uri, this.#finishTask ))
    }
  }

  #finishTask( worker ) {
    worker.currentTask = null
    this.#concurrentMessageCount--
    this.#next()
  }

  #next() {
    if (
      this.#concurrentMessageCount >= this.concurrency ||
      !this.messagesQueue.length
    ) {
      if (
        this.#concurrentMessageCount === 0
        && this.#resolveQueueEmpty
      ) {
        this.#resolveQueueEmpty( false )
      }
      return
    }

    const availableWorker = this.#workerPool.find( w => !w.currentTask )
    if ( !availableWorker ) return

    this.#concurrentMessageCount++
    const task = this.messagesQueue.shift()

    availableWorker.currentTask = task

    availableWorker.postMessage( task.message )
  }

  get concurrency() {
    return this.#concurrency
  }

  get concurrentMessageCount() {
    return this.#concurrentMessageCount
  }

  get finished() {
    if ( !this.messagesQueue.length && this.#concurrentMessageCount === 0 ) {
      return Promise.resolve( true )
    }

    return (
      this.#queueEmptyPromise ||
      ( this.#queueEmptyPromise = new Promise(( resolve ) => {
        this.#resolveQueueEmpty = resolve
      }))
    )
  }

  get messagesQueue() {
    return this.#messagesQueue
  }

  add( message ) {
    this.#queueEmptyPromise = null
    this.#resolveQueueEmpty = null

    return new Promise(( resolve, reject ) => {
      this.messagesQueue.push({ message, resolve, reject })
      this.#next()
    })
  }

  terminate() { this.#workerPool.forEach( worker => worker.terminate())}
}


/**
 * Create a worker.
 * @param {string} uri The URI of the worker.
 * @param {Function} callback The callback to call when the worker finishes a
 * task.
 * @returns {Worker} The worker.
 */
function createWorker( uri, callback ) {
  const worker = new Worker( uri )

  worker.onmessage = ( event ) => {
    if ( worker.currentTask ) {
      worker.currentTask.resolve( event.data )
      callback( worker )
    }
  }

  worker.onerror = ( error ) => {
    if ( worker.currentTask ) {
      worker.currentTask.reject( error )
      callback( worker )
    }
  }

  return worker
}
