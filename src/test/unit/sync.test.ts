import { getSynchronizer } from "../../data/sync"


interface Latch {
  readonly wait: Promise<void>
  readonly resolve: () => void
  readonly reject: () => void
}

function initLatch(): Latch {
  let resolveFun: (() => void) | null = null
  let rejectFun: ((why?: any) => void) | null = null
  const wait = new Promise<void>((resolve, reject) => {
    resolveFun = resolve
    rejectFun = reject
  })
  return {
    wait: wait,
    resolve: () => resolveFun?.(),
    reject: (why?: any) => rejectFun?.(why),
  }
}

describe("sync", () => {
  const sync = getSynchronizer()
  const tag = "tag"
  test("単独", async () => {
    let result = new Object()
    let task = jest.fn(() => result)
    let r = await sync(tag, async () => {
      return task()
    })
    expect(r).toBe(result)
    expect(task).toHaveBeenCalled()
  })
  test("単独 例外", async () => {
    let err = Error()
    let task = jest.fn(() => {
      throw err
    })
    await expect(sync(tag, async () => {
      task()
    })).rejects.toThrowError(err)
    expect(task).toHaveBeenCalled()
  })
  test("ふたつ 待機", async () => {
    const latch = initLatch()
    let result1 = new Object()
    let task1 = jest.fn(async () => {
      await latch.wait
      return result1
    })
    let result2 = new Object()
    let task2 = jest.fn(() => Promise.resolve(result2))

    // call sync without async
    let r1 = sync(tag, task1)
    let r2 = sync(tag, task2)

    await Promise.all([
      Promise.resolve().then(async () => {
        await expect(r1).resolves.toBe(result1)
      }),
      Promise.resolve().then(async () => {
        // task1 is pending, task2 not started
        expect(task1).toHaveBeenCalled()
        expect(task2).not.toHaveBeenCalled()
        // fin task1
        latch.resolve()
        // task2 triggered
        await expect(r2).resolves.toBe(result2)
        expect(task2).toHaveBeenCalled()
      }),
    ])
  })
  test("みっつ 待機", async () => {
    const latch = initLatch()
    let result1 = new Object()
    let task1 = jest.fn(async () => {
      await latch.wait
      return result1
    })
    let result2 = new Object()
    let task2 = jest.fn(() => Promise.resolve(result2))
    let result3 = new Object()
    let task3 = jest.fn(() => Promise.resolve(result3))

    // call runSync without async
    let r1 = sync(tag, task1)
    let r2 = sync(tag, task2)
    let r3 = sync(tag, task3)

    await Promise.all([
      Promise.resolve().then(async () => {
        // wait task async
        await expect(r1).resolves.toBe(result1)
      }),
      Promise.resolve().then(async () => {
        // task1 is pending, task2 nor task3 started
        expect(task1).toHaveBeenCalled()
        expect(task2).not.toHaveBeenCalled()
        expect(task3).not.toHaveBeenCalled()
        // fin task1
        latch.resolve()
        // task2 then task3 triggered
        await expect(r2).resolves.toBe(result2)
        expect(task2).toHaveBeenCalled()
        await expect(r3).resolves.toBe(result3)
        expect(task2).toHaveBeenCalled()
      }),
    ])
  })
  test("ふたつ 待機-rejectあり", async () => {
    const latch = initLatch()
    let error1 = new Error()
    let task1 = jest.fn(async () => {
      await latch.wait
      throw error1
    })
    let result2 = new Object()
    let task2 = jest.fn(() => Promise.resolve(result2))

    // call runSync without async
    let r1 = sync(tag, task1)
    let r2 = sync(tag, task2)

    await Promise.all([
      Promise.resolve().then(async () => {
        await expect(r1).rejects.toThrow(error1)
      }),
      Promise.resolve().then(async () => {
        // task1 is pending, task2 not started
        expect(task1).toHaveBeenCalled()
        expect(task2).not.toHaveBeenCalled()
        // fin task1
        latch.resolve()
        // task2 triggered
        await expect(r2).resolves.toBe(result2)
        expect(task2).toHaveBeenCalled()
      }),
    ])
  })
})