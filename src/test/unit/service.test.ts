import { parseStation, Station, StationAPIResponse } from "../../script/station"
import { StationService, StationTreeSegmentResponse } from "../../script/StationService"
import axios from "axios"
import MockAdapter from "axios-mock-adapter"

const mock = new MockAdapter(axios)

export { }

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

describe("StationService", () => {
  const service = new StationService()
  describe("runSync", () => {
    beforeEach(() => {
      //service.release()
    })
    const tag = "tag"
    test("単独", async () => {
      let result = new Object()
      let task = jest.fn(() => result)
      let r = await service.runSync(tag, async () => {
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
      await expect(service.runSync(tag, async () => {
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

      // call runSync without async
      let r1 = service.runSync(tag, task1)
      let r2 = service.runSync(tag, task2)

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
      let r1 = service.runSync(tag, task1)
      let r2 = service.runSync(tag, task2)
      let r3 = service.runSync(tag, task3)

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
      let r1 = service.runSync(tag, task1)
      let r2 = service.runSync(tag, task2)

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

  describe("駅・路線データ読み出し", () => {
    let data: StationTreeSegmentResponse
    let targetData: StationAPIResponse
    let target: Station
    const stations: Station[] = []
    const mockService = jest.spyOn(service, "updateLocation").mockImplementation(async () => {
      // update & load station data
      service.stations.set(target.code, target)
      service.stationsId.set(target.id, target)
      return target
    })
    beforeAll(async () => {
      data = await import("./tree-root.json") as StationTreeSegmentResponse
      targetData = data.node_list.splice(data.station_size - 1, 1)[0] as StationAPIResponse
      target = parseStation(targetData)
      data.node_list.forEach(e => {
        let s = parseStation(e as StationAPIResponse)
        stations.push(s)
        service.stations.set(s.code, s)
        service.stationsId.set(s.id, s)
      })
    })
    beforeEach(() => {
      service.stations.delete(target.code)
      service.stationsId.delete(target.id)
    })
    afterAll(() => {
      service.release()
    })
    afterEach(() => {
      mockService.mockClear()
      mock.resetHistory()
    })
    test("getStationImmediate", () => {
      let s = stations[0]
      let r = service.getStationImmediate(s.code)
      expect(s).toBe(r)
    })
    test("getStationOrNull > found", async () => {
      let s = stations[0]
      let r = await service.getStationOrNull(s.code)
      expect(s).toBe(r)
    })
    test("getStationOrNull > API > not found", async () => {
      const path = `${process.env.REACT_APP_STATION_API_URL}/station?code=${target.code}`
      mock.onGet(path).reply(404)
      let r = await service.getStationOrNull(target.code)
      expect(r).toBeUndefined()
      expect(mock.history.get.length).toBe(1)
      expect(mock.history.get[0].url).toBe(path)
    })
    test("getStationOrNull > API > found", async () => {
      const path = `${process.env.REACT_APP_STATION_API_URL}/station?code=${target.code}`
      mock.onGet(path).reply(200, targetData)
      let r = await service.getStationOrNull(target.code)
      expect(r).toBe(target)
      expect(mockService.mock.calls.length).toBe(1)
      expect(mockService.mock.calls[0][0]).toEqual(target.position)
      expect(mock.history.get.length).toBe(1)
      expect(mock.history.get[0].url).toBe(path)
    })
    test("getStation > found", async () => {
      let s = stations[0]
      let r = await service.getStation(s.code)
      expect(s).toBe(r)
    })
    test("getStation > not found", async () => {
      const path = `${process.env.REACT_APP_STATION_API_URL}/station?code=${target.code}`
      mock.onGet(path).reply(404)
      await expect(service.getStation(target.code)).rejects.toThrowError()
      expect(mock.history.get.length).toBe(1)
      expect(mock.history.get[0].url).toBe(path)
    })
    test("getStationById code > found", async () => {
      let s = stations[0]
      let r = await service.getStationById(s.code.toString())
      expect(s).toBe(r)
    })
    test("getStationById id > found", async () => {
      let s = stations[0]
      let r = await service.getStationById(s.id)
      expect(s).toBe(r)
    })
    test("getStationById invalid id > Error", async () => {
      await expect(service.getStationById("hogehoge")).rejects.toThrowError()
    })
    test("getStationById > API > not found", async () => {
      const path = `${process.env.REACT_APP_STATION_API_URL}/station?id=${target.id}`
      mock.onGet(path).reply(404)
      await expect(service.getStationById(target.id)).rejects.toThrowError()
      expect(mock.history.get.length).toBe(1)
      expect(mock.history.get[0].url).toBe(path)
    })
    test("getStationById > API >  found", async () => {
      const path = `${process.env.REACT_APP_STATION_API_URL}/station?id=${target.id}`
      mock.onGet(path).reply(200, targetData)
      let r = await service.getStationById(target.id)
      expect(r).toBe(target)
      expect(mockService.mock.calls.length).toBe(1)
      expect(mockService.mock.calls[0][0]).toEqual(target.position)
      expect(mock.history.get.length).toBe(1)
      expect(mock.history.get[0].url).toBe(path)
    })
  })
})
