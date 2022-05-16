import { NodeProps, StationKdTree, StationLeafNodeProps, StationNode, StationTreeSegmentProps } from "../../script/kdTree"
import { LatLng } from "../../script/location"
import { parseStation, Station, StationAPIResponse } from "../../script/station"
import { isStationLeafNode, StationTreeSegmentResponse } from "../../script/StationService"

describe("kdTree", () => {
  let data: StationTreeSegmentResponse
  const stations = new Map<number, Station>()
  const nodes = new Map<number, NodeProps>()
  const nodeMapSpy = jest.spyOn(nodes, "get")
  const stationProviderImpl = (code: number): Station => {
    return stations.get(code)!!
  }
  const treeSegmentProviderImpl = async (name: string): Promise<StationTreeSegmentProps> => {
    if (name === "root") {
      return data
    }
    // 単一頂点を返す
    let node = data.node_list.find(d => d?.segment === name) as StationLeafNodeProps
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
  const stationProvider = jest.fn(stationProviderImpl)
  const treeSegmentProvider = jest.fn(treeSegmentProviderImpl)
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
    stationProvider.mockClear()
    treeSegmentProvider.mockClear()
  })
  describe("StationNode", () => {
    test("末端", async () => {
      let nodeData = data.node_list.find(d => d.code == 1190533)
      expect(nodeData).not.toBeUndefined()
      if (!nodeData) return
      expect(isStationLeafNode(nodeData)).toBe(false)
      if (isStationLeafNode(nodeData)) return
      expect(nodeData?.left).toBeUndefined()
      expect(nodeData?.right).toBeUndefined()
      let rect = {
        north: 90,
        south: -90,
        west: -180,
        east: 180,
      }
      const tree = new StationKdTree(
        stationProvider,
        treeSegmentProvider,
      )
      let node = new StationNode(10, nodeData, tree, nodes, rect)
      expect(node.left).toBe(null)
      expect(node.right).toBe(null)
      let s = stations.get(1190533)
      expect(node.station).toBe(s)
      expect(nodeMapSpy.mock.calls.length).toBe(0)
      expect(stationProvider.mock.calls.length).toBe(1)
      expect(stationProvider.mock.calls[0][0]).toBe(1190533)
      expect(treeSegmentProvider.mock.calls.length).toBe(0)
      let nodeSpy = jest.spyOn(node, "build")
      let station = await node.get()
      expect(station).toBe(s)
      expect(nodeSpy.mock.calls.length).toBe(0)
      expect(stationProvider.mock.calls.length).toBe(1)
      expect(treeSegmentProvider.mock.calls.length).toBe(0)
    })

    test("途中", async () => {
      let nodeData = data.node_list.find(d => d.code == 9991511)
      expect(nodeData).not.toBeUndefined()
      if (!nodeData) return
      expect(isStationLeafNode(nodeData)).toBe(false)
      if (isStationLeafNode(nodeData)) return
      let rect = {
        north: 90,
        south: -90,
        west: -180,
        east: 180,
      }
      const tree = new StationKdTree(
        stationProvider,
        treeSegmentProvider,
      )
      let node = new StationNode(10, nodeData, tree, nodes, rect)
      expect(node.left?.code).toBe(9992111)
      expect(node.right?.code).toBe(1190533)
      let s = stations.get(9991511)
      expect(node.station).toBe(s)
      expect(nodeMapSpy.mock.calls.length).toBe(2)
      expect(nodeMapSpy.mock.calls[0][0]).toBe(9992111)
      expect(nodeMapSpy.mock.calls[1][0]).toBe(1190533)
      expect(stationProvider.mock.calls.length).toBe(3)
      expect(stationProvider.mock.calls[0][0]).toBe(9991511)
      expect(stationProvider.mock.calls[1][0]).toBe(9992111)
      expect(stationProvider.mock.calls[2][0]).toBe(1190533)
      expect(treeSegmentProvider.mock.calls.length).toBe(0)
      let nodeSpy = jest.spyOn(node, "build")
      let station = await node.get()
      expect(station).toBe(s)
      expect(nodeSpy.mock.calls.length).toBe(0)
      expect(stationProvider.mock.calls.length).toBe(3)
      expect(treeSegmentProvider.mock.calls.length).toBe(0)
    })

    test("末端 非同期でsegment読み出し", async () => {
      let nodeData = data.node_list.find(d => d.code == 1192911)
      expect(nodeData).not.toBeUndefined()
      if (!nodeData) return
      expect(isStationLeafNode(nodeData)).toBe(true)
      if (!isStationLeafNode(nodeData)) return
      expect(nodeData.segment).toBe("segment3")
      let rect = {
        north: 90,
        south: -90,
        west: -180,
        east: 180,
      }
      const tree = new StationKdTree(
        stationProvider,
        treeSegmentProvider,
      )
      let node = new StationNode(10, nodeData, tree, nodes, rect)
      expect(node.left).toBe(null)
      expect(node.right).toBe(null)
      let s = stations.get(1192911)
      expect(node.station).toBe(null)
      console.log(nodeMapSpy.mock.calls)

      expect(nodeMapSpy.mock.calls.length).toBe(0)
      expect(stationProvider.mock.calls.length).toBe(0)
      expect(treeSegmentProvider.mock.calls.length).toBe(0)
      let nodeSpy = jest.spyOn(node, "build")
      let station = await node.get()
      expect(station).toBe(s)
      expect(nodeSpy.mock.calls.length).toBe(1)
      expect(stationProvider.mock.calls.length).toBe(1)
      expect(stationProvider.mock.calls[0][0]).toBe(1192911)
      expect(treeSegmentProvider.mock.calls.length).toBe(1)
      expect(treeSegmentProvider.mock.calls[0][0]).toBe("segment3")
      expect(node.left).toBe(null)
      expect(node.right).toBe(null)
      expect(node.station).toBe(s)
    })

  })

  describe("探索", () => {
    const tree = new StationKdTree(
      stationProvider,
      treeSegmentProvider,
    )
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
    test("初期化", async () => {
      await tree.initialize("root")
      expect(treeSegmentProvider.mock.calls.length).toBe(1)
      expect(treeSegmentProvider.mock.calls[0][0]).toBe("root")
    })
    test("case 1: station(9942506)", async () => {
      let s = stations.get(9942506)!
      let result = await tree.updateLocation(s.position, 1, 0)
      expect(result).toBe(s)
    })
    test("case 2: 東京", async () => {
      let pos = {
        lat: 35.68139312179635,
        lng: 139.76720604605077
      }
      let s = findNearestOrderN(pos)
      let result = await tree.updateLocation(pos, 1, 0)
      expect(result).toBe(s)
    })
    test("case 3: 名古屋", async () => {
      let pos = {
        lat: 35.18238486018337,
        lng: 136.90724090952892,
      }
      let s = findNearestOrderN(pos)
      let result = await tree.updateLocation(pos, 1, 0)
      expect(result).toBe(s)
    })
    test("case 4: 大阪", async () => {
      let pos = {
        lat: 34.70136715329247,
        lng: 135.50068730795476,
      }
      let s = findNearestOrderN(pos)
      let result = await tree.updateLocation(pos, 1, 0)
      expect(result).toBe(s)
    })
  })

})

export { }
