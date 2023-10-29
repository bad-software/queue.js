import o from 'ospec'
import { TaskQueue } from '../index.js'
import { asyncThrows } from './_asyncThrows.js'


o.spec( 'TaskQueue', () => {
  o( 'is non-concurrent by default', async () => {
    const queue = new TaskQueue()
    o( queue.concurrency ).equals( 1 )
  })

  o( 'adds and waits for a task', async () => {
    let
      resolve1,
      resolve2,
      resolve3

    // Create a task queue without concurrency.
    const
      concurrency = 1,
      queue = new TaskQueue( concurrency )

    o( queue.concurrency ).equals( concurrency )
    o( queue.queue.length ).equals( 0 )
    o( queue.concurrentTaskCount ).equals( 0 )

    // Add three tasks.
    const
      promise1 = new Promise( resolve => resolve1 = resolve ),
      promise2 = new Promise( resolve => resolve2 = resolve ),
      promise3 = new Promise( resolve => resolve3 = resolve ),

      task1 = queue.add(() => promise1 ),
      task2 = queue.add(() => promise2 ),
      task3 = queue.add(() => promise3 )

    o( queue.queue.length ).equals( 2 )
    o( queue.concurrentTaskCount ).equals( 1 )

    // Resolve the first task.
    resolve1()
    await task1

    o( queue.queue.length ).equals( 2 )
    o( queue.concurrentTaskCount ).equals( 1 )

    // Resolve the second task.
    resolve2()
    await task2

    o( queue.queue.length ).equals( 1 )
    o( queue.concurrentTaskCount ).equals( 1 )

    // Resolve the third task.
    resolve3()
    await task3

    o( queue.queue.length ).equals( 0 )
    o( queue.concurrentTaskCount ).equals( 1 )

    // Wait for the queue to finish.
    o( await queue.finished ).equals( false )
    o( queue.queue.length ).equals( 0 )
    o( queue.concurrentTaskCount ).equals( 0 )
    o( await queue.finished ).equals( true )
  })

  o( 'propagates errors', async () => {
    const queue = new TaskQueue( 1 )

    // Add a task that rejects.
    const errorMessage = 'test'

    // Wait for the task to reject.
    await asyncThrows(
      async () => queue.add(() => {
        throw new Error( errorMessage )
      }),

      errorMessage,
    )
  })
})
