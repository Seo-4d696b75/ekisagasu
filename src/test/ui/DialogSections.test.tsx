/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom'
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { StationDetails, StationRadar, StationTitle } from "../../components/dialog/DialogSections"
import { CurrentPosDialogProps, DialogType, RadarStation, SelectPosDialogProps, StationPosDialogProps } from "../../components/navState"
import { Line } from "../../station/line"
import { Station, StationAPIResponse, parseStation } from "../../station/station"

const response = { "code": 2700103, "left": 1131339, "right": 9931112, "id": "7455c6", "name": "北品川", "original_name": "北品川", "name_kana": "きたしながわ", "closed": false, "lat": 35.622458, "lng": 139.739191, "prefecture": 13, "lines": [27001], "attr": "eco", "postal_code": "140-0001", "address": "品川区北品川１-１-４", "next": [1130201, 100202, 9933602, 9930206, 2700104], "voronoi": { "type": "Feature", "geometry": { "type": "Polygon", "coordinates": [[[139.744812, 35.625783], [139.733042, 35.625425], [139.732797, 35.625189], [139.734709, 35.617535], [139.744954, 35.622141], [139.744812, 35.625783]]] }, "properties": {} } } as StationAPIResponse
const station = parseStation(response)
const line: Line = {
  "code": 27001,
  "id": "8f85fa",
  "name": "京急本線",
  "nameKana": "けいきゅうほんせん",
  "stationSize": 50,
  "color": "#00BFFF",
  "extra": false,
}

describe("StationTitle", () => {
  test("表示テキストの確認", () => {
    render(<StationTitle station={station} />)
    expect(screen.getByText("北品川")).toBeInTheDocument()
    expect(screen.getByText("きたしながわ")).toBeInTheDocument()
  })
})

const radarList: RadarStation[] = [1, 2, 3].map(idx => {
  let s = {
    ...station,
    name: `${station.name}-${idx}`,
  }
  return {
    station: s,
    dist: 100 * idx,
    lines: line.name,
  }
})

const lines: Line[] = [
  {
    ...line,
    name: `${line.name}-1`,
  },
  {
    ...line,
    name: `${line.name}-2`,
  }
]

const stationPosDialogProps: StationPosDialogProps = {
  type: DialogType.STATION,
  props: {
    station: station,
    radarList: radarList,
    prefecture: "東京都",
    lines: lines,
  }
}

const selectPos = {
  lat: station.position.lat + 0.001,
  lng: station.position.lng + 0.001,
}

const selectPosDialogProps: SelectPosDialogProps = {
  type: DialogType.SELECT_POSITION,
  props: {
    station: station,
    radarList: radarList,
    prefecture: "東京都",
    lines: lines,
    position: selectPos,
    dist: 123.456,
  }
}

const currentPos = {
  lat: station.position.lat - 0.001,
  lng: station.position.lng - 0.001,
}

const currentPosDialogProps: CurrentPosDialogProps = {
  type: DialogType.CURRENT_POSITION,
  props: {
    station: station,
    radarList: radarList,
    prefecture: "東京都",
    lines: lines,
    position: currentPos,
    dist: 1234.56,
  }
}

const onLineSelected = jest.fn((line: Line) => { })

describe("StationDetail", () => {
  test("表示テキストの確認", () => {
    render(<StationDetails
      info={stationPosDialogProps}
      onLineSelected={onLineSelected} />)
    stationPosDialogProps.props.lines.forEach(line => {
      expect(screen.getByText(line.name)).toBeInTheDocument()
    })
    expect(screen.getByText("東京都")).toBeInTheDocument()
    expect(screen.getByText(`E${station.position.lng} N${station.position.lat}`)).toBeInTheDocument()
  })
  test("選択された地点の近傍駅", () => {
    render(<StationDetails
      info={selectPosDialogProps}
      onLineSelected={onLineSelected} />)
    expect(screen.getByText("選択した地点")).toBeInTheDocument()
    expect(screen.getByText("123m")).toBeInTheDocument()
    expect(screen.getByText(`E${selectPos.lng.toFixed(6)} N${selectPos.lat.toFixed(6)}`)).toBeInTheDocument()
  })
  test("現在地点の近傍駅", () => {
    render(<StationDetails
      info={currentPosDialogProps}
      onLineSelected={onLineSelected} />)
    expect(screen.getByText("現在位置")).toBeInTheDocument()
    expect(screen.getByText("1.2km")).toBeInTheDocument()
    expect(screen.getByText(`E${currentPos.lng.toFixed(6)} N${currentPos.lat.toFixed(6)}`)).toBeInTheDocument()
  })
  test("路線の選択", () => {
    render(<StationDetails
      info={stationPosDialogProps}
      onLineSelected={onLineSelected} />)
    onLineSelected.mockClear()
    stationPosDialogProps.props.lines.forEach(line => {
      userEvent.click(screen.getByText(line.name))
      expect(onLineSelected).toHaveBeenCalled()
      expect(onLineSelected.mock.lastCall[0]).toBe(line)
    })
  })
})

const onStationSelected = jest.fn((s: Station) => { })
const onClose = jest.fn(() => { })

describe("StationRadar", () => {
  test("表示テキストの確認", () => {
    render(<StationRadar
      info={stationPosDialogProps}
      show={true}
      onStationSelected={onStationSelected}
      onClose={onClose} />)
    expect(screen.getByText(`x${radarList.length}`)).toBeInTheDocument()
    radarList.forEach(e => {
      expect(screen.getByText(new RegExp(e.station.name))).toBeInTheDocument()
      expect(screen.getByText(`${e.dist}m`)).toBeInTheDocument()
    })
  })
  test("ボタン押下", () => {
    render(<StationRadar
      info={stationPosDialogProps}
      show={true}
      onStationSelected={onStationSelected}
      onClose={onClose} />)
    radarList.forEach(e => {
      userEvent.click(screen.getByText(new RegExp(e.station.name)))
      expect(onStationSelected.mock.lastCall[0]).toBe(e.station)
    })
    userEvent.click(screen.getByAltText("close radar"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})