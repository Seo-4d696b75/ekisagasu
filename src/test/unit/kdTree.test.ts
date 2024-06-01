import { LatLng } from "../../location/location"
import { StationKdTree } from "../../search/kdTree"
import { NormalNodeResponse, StationNodeImpl, StationNodeResponse, StationTreeSegmentResponse, initRoot, isSegmentNode } from "../../station/node"
import { Station, StationAPIResponse, parseStation } from "../../station/station"


describe("kdTree", () => {
  let data: StationTreeSegmentResponse
  const stations = new Map<number, Station>()
  const nodes = new Map<number, StationNodeResponse>()
  const nodeMapSpy = jest.spyOn(nodes, "get")

  const stationProviderImpl = (code: number): Station => {
    return stations.get(code)!!
  }
  const treeSegmentProviderImpl = async (name: string): Promise<StationTreeSegmentResponse> => {
    if (name === "root") {
      return data
    }
    // 単一頂点を返す
    let node = data.node_list.find(d => d?.segment === name) as NormalNodeResponse
    return {
      name: name,
      root: node.code,
      node_list: [
        {
          ...node,
          segment: undefined,
          left: undefined,
          right: undefined
        }
      ]
    }
  }
  const provider = {
    station: jest.fn(stationProviderImpl),
    segment: jest.fn(treeSegmentProviderImpl),
  }

  beforeAll(async () => {
    // load data
    data = await import("./tree-root.json") as StationTreeSegmentResponse
    data.node_list.forEach(d => {
      nodes.set(d.code, d)
      let s = parseStation(d as StationAPIResponse)
      stations.set(s.code, s)
    })
  })
  beforeEach(() => {
    // clear history of calling mocked function
    nodeMapSpy.mockClear()
    provider.station.mockClear()
    provider.segment.mockClear()
  })
  describe("StationNodeImpl", () => {
    test("末端", async () => {
      let nodeData = data.node_list.find(d => d.code == 1190533)
      expect(nodeData).not.toBeUndefined()
      if (!nodeData) return
      expect(isSegmentNode(nodeData)).toBe(false)
      if (isSegmentNode(nodeData)) return
      expect(nodeData?.left).toBeUndefined()
      expect(nodeData?.right).toBeUndefined()
      let rect = {
        north: 90,
        south: -90,
        west: -180,
        east: 180,
      }
      let node = new StationNodeImpl(10, nodeData, nodes, provider, rect)
      expect(node._left).toBe(null)
      expect(node._right).toBe(null)
      let s = stations.get(1190533)
      expect(node._station).toBe(s)
      expect(nodeMapSpy.mock.calls.length).toBe(0)
      expect(provider.station.mock.calls.length).toBe(1)
      expect(provider.station.mock.calls[0][0]).toBe(1190533)
      expect(provider.segment.mock.calls.length).toBe(0)
      let nodeSpy = jest.spyOn(node, "build")
      let station = await node.station()
      expect(station).toBe(s)
      expect(nodeSpy.mock.calls.length).toBe(0)
      expect(provider.station.mock.calls.length).toBe(1)
      expect(provider.segment.mock.calls.length).toBe(0)
    })

    test("途中", async () => {
      let nodeData = data.node_list.find(d => d.code == 9991511)
      expect(nodeData).not.toBeUndefined()
      if (!nodeData) return
      expect(isSegmentNode(nodeData)).toBe(false)
      if (isSegmentNode(nodeData)) return
      let rect = {
        north: 90,
        south: -90,
        west: -180,
        east: 180,
      }
      let node = new StationNodeImpl(10, nodeData, nodes, provider, rect)
      expect(node._left?.code).toBe(9992111)
      expect(node._right?.code).toBe(1190533)
      let s = stations.get(9991511)
      expect(node._station).toBe(s)
      expect(nodeMapSpy.mock.calls.length).toBe(2)
      expect(nodeMapSpy.mock.calls[0][0]).toBe(9992111)
      expect(nodeMapSpy.mock.calls[1][0]).toBe(1190533)
      expect(provider.station.mock.calls.length).toBe(3)
      expect(provider.station.mock.calls[0][0]).toBe(9991511)
      expect(provider.station.mock.calls[1][0]).toBe(9992111)
      expect(provider.station.mock.calls[2][0]).toBe(1190533)
      expect(provider.segment.mock.calls.length).toBe(0)
      let nodeSpy = jest.spyOn(node, "build")
      let station = await node.station()
      expect(station).toBe(s)
      expect(nodeSpy.mock.calls.length).toBe(0)
      expect(provider.station.mock.calls.length).toBe(3)
      expect(provider.segment.mock.calls.length).toBe(0)
    })

    test("末端 非同期でsegment読み出し", async () => {
      let nodeData = data.node_list.find(d => d.code == 1192911)
      expect(nodeData).not.toBeUndefined()
      if (!nodeData) return
      expect(isSegmentNode(nodeData)).toBe(true)
      if (!isSegmentNode(nodeData)) return
      expect(nodeData.segment).toBe("segment3")
      let rect = {
        north: 90,
        south: -90,
        west: -180,
        east: 180,
      }
      let node = new StationNodeImpl(10, nodeData, nodes, provider, rect)
      expect(node._left).toBe(null)
      expect(node._right).toBe(null)
      let s = stations.get(1192911)
      expect(node._station).toBe(null)
      console.log(nodeMapSpy.mock.calls)

      expect(nodeMapSpy.mock.calls.length).toBe(0)
      expect(provider.station.mock.calls.length).toBe(0)
      expect(provider.segment.mock.calls.length).toBe(0)
      let nodeSpy = jest.spyOn(node, "build")
      let station = await node.station()
      expect(station).toBe(s)
      expect(nodeSpy.mock.calls.length).toBe(1)
      expect(provider.station.mock.calls.length).toBe(1)
      expect(provider.station.mock.calls[0][0]).toBe(1192911)
      expect(provider.segment.mock.calls.length).toBe(1)
      expect(provider.segment.mock.calls[0][0]).toBe("segment3")
      expect(node._left).toBe(null)
      expect(node._right).toBe(null)
      expect(node._station).toBe(s)
    })

  })

  describe("探索", () => {

    const findNearestOrderN = (pos: LatLng) => {
      let min = Number.MAX_VALUE
      let s: Station
      for (let e of stations.values()) {
        let d = tree.measure(pos, e.position)
        if (d < min) {
          min = d
          s = e
        }
      }
      return s!
    }

    let tree: StationKdTree

    beforeAll(async () => {
      // init tree
      const rootNode = await initRoot(provider)
      tree = new StationKdTree(rootNode)
    })
    test("case 1: station(9942506)", async () => {
      let s = stations.get(9942506)!
      let result = await tree.search(s.position, 1, 0)
      expect(result[0].station).toBe(s)
    })
    test("case 2: 東京", async () => {
      let pos = {
        lat: 35.68139312179635,
        lng: 139.76720604605077
      }
      let s = findNearestOrderN(pos)
      let result = await tree.search(pos, 1, 0)
      expect(result[0].station).toBe(s)
    })
    test("case 3: 名古屋", async () => {
      let pos = {
        lat: 35.18238486018337,
        lng: 136.90724090952892,
      }
      let s = findNearestOrderN(pos)
      let result = await tree.search(pos, 1, 0)
      expect(result[0].station).toBe(s)
    })
    test("case 4: 大阪", async () => {
      let pos = {
        lat: 34.70136715329247,
        lng: 135.50068730795476,
      }
      let s = findNearestOrderN(pos)
      let result = await tree.search(pos, 1, 0)
      expect(result[0].station).toBe(s)
    })
  })

})

export { }
