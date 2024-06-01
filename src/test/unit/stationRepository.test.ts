import axios from "axios"
import MockAdapter from "axios-mock-adapter"
import { StationTreeSegmentResponse } from "../../station/node"
import { parseStation, Station, StationAPIResponse } from "../../station/station"
import { StationRepository } from "../../station/StationRepository"

const mock = new MockAdapter(axios)

export { }


describe("StationRepository", () => {

  const path = `${process.env.REACT_APP_STATION_API_URL}/info`
  mock.onGet(path).reply(200, { data_version: 20221030 })
  const repository = new StationRepository()

  describe("駅・路線データ読み出し", () => {
    let data: StationTreeSegmentResponse
    let targetData: StationAPIResponse
    let target: Station
    const stations: Station[] = []
    const mockSearch = jest.spyOn(repository, "search").mockImplementation(async () => {
      // update & load station data
      repository.stations.set(target.code, target)
      repository.stationsId.set(target.id, target)
      return [
        {
          station: target,
          dist: 0,
        }
      ]
    })
    beforeAll(async () => {
      data = await import("./tree-root.json") as StationTreeSegmentResponse
      targetData = data.node_list.splice(data.node_list.length - 1, 1)[0] as StationAPIResponse
      target = parseStation(targetData)
      data.node_list.forEach(e => {
        let s = parseStation(e as StationAPIResponse)
        stations.push(s)
        repository.stations.set(s.code, s)
        repository.stationsId.set(s.id, s)
      })
    })
    beforeEach(() => {
      repository.stations.delete(target.code)
      repository.stationsId.delete(target.id)
    })
    afterAll(() => {
      repository.release()
    })
    afterEach(() => {
      mockSearch.mockClear()
      mock.resetHistory()
    })
    test("getStationImmediate", () => {
      let s = stations[0]
      let r = repository.getStationImmediate(s.code)
      expect(s).toBe(r)
    })
    test("getStationOrNull > found", async () => {
      let s = stations[0]
      let r = await repository.getStationOrNull(s.code)
      expect(s).toBe(r)
    })
    test("getStationOrNull > API > not found", async () => {
      const path = `${process.env.REACT_APP_STATION_API_URL}/station?code=${target.code}`
      mock.onGet(path).reply(404)
      let r = await repository.getStationOrNull(target.code)
      expect(r).toBeUndefined()
      expect(mock.history.get.length).toBe(1)
      expect(mock.history.get[0].url).toBe(path)
    })
    test("getStationOrNull > API > found", async () => {
      const path = `${process.env.REACT_APP_STATION_API_URL}/station?code=${target.code}`
      mock.onGet(path).reply(200, targetData)
      let r = await repository.getStationOrNull(target.code)
      expect(r).toBe(target)
      expect(mockSearch.mock.calls.length).toBe(1)
      expect(mockSearch.mock.calls[0][0]).toEqual(target.position)
      expect(mock.history.get.length).toBe(1)
      expect(mock.history.get[0].url).toBe(path)
    })
    test("getStation > found", async () => {
      let s = stations[0]
      let r = await repository.getStation(s.code)
      expect(s).toBe(r)
    })
    test("getStation > not found", async () => {
      const path = `${process.env.REACT_APP_STATION_API_URL}/station?code=${target.code}`
      mock.onGet(path).reply(404)
      await expect(repository.getStation(target.code)).rejects.toThrowError()
      expect(mock.history.get.length).toBe(1)
      expect(mock.history.get[0].url).toBe(path)
    })
    test("getStationById code > found", async () => {
      let s = stations[0]
      let r = await repository.getStationById(s.code.toString())
      expect(s).toBe(r)
    })
    test("getStationById id > found", async () => {
      let s = stations[0]
      let r = await repository.getStationById(s.id)
      expect(s).toBe(r)
    })
    test("getStationById invalid id > Error", async () => {
      await expect(repository.getStationById("hogehoge")).rejects.toThrowError()
    })
    test("getStationById > API > not found", async () => {
      const path = `${process.env.REACT_APP_STATION_API_URL}/station?id=${target.id}`
      mock.onGet(path).reply(404)
      await expect(repository.getStationById(target.id)).rejects.toThrowError()
      expect(mock.history.get.length).toBe(1)
      expect(mock.history.get[0].url).toBe(path)
    })
    test("getStationById > API >  found", async () => {
      const path = `${process.env.REACT_APP_STATION_API_URL}/station?id=${target.id}`
      mock.onGet(path).reply(200, targetData)
      let r = await repository.getStationById(target.id)
      expect(r).toBe(target)
      expect(mockSearch.mock.calls.length).toBe(1)
      expect(mockSearch.mock.calls[0][0]).toEqual(target.position)
      expect(mock.history.get.length).toBe(1)
      expect(mock.history.get[0].url).toBe(path)
    })
  })
})
