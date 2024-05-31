/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom'
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CurrentPosDialog } from "../../components/dialog/CurrentPosDialog"
import { CurrentPosDialogProps, DialogType, RadarStation } from "../../components/navState"
import { Line } from "../../model/line"
import { Station, StationAPIResponse, parseStation } from "../../model/station"

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
const radarList: RadarStation[] = [{
  station: station,
  dist: 100,
  lines: line.name,
}]

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
    lines: [line],
    position: currentPos,
    dist: 1234.56,
  }
}

describe("CurrentPosDialog", () => {
  const onLineSelected = jest.fn((line: Line) => { })
  const onStationSelected = jest.fn((s: Station) => { })
  test("表示テキスト", () => {
    render(<CurrentPosDialog
      info={currentPosDialogProps}
      onStationSelected={onStationSelected}
      onLineSelected={onLineSelected}
    />)
    expect(screen.getByText(station.name)).toBeInTheDocument()
    expect(screen.getByText(line.name)).toBeInTheDocument()
    expect(screen.getByText("現在位置")).toBeInTheDocument()
    expect(screen.getByText("1.2km")).toBeInTheDocument()
  })
  test("ボタン押下-コールバック", () => {
    render(<CurrentPosDialog
      info={currentPosDialogProps}
      onStationSelected={onStationSelected}
      onLineSelected={onLineSelected}
    />)
    userEvent.click(screen.getByText(line.name))
    expect(onLineSelected).toHaveBeenCalled()
    expect(onLineSelected.mock.lastCall[0]).toBe(line)
    userEvent.click(screen.getByText(new RegExp(`${station.name}\\s*${line.name}`)))
    expect(onStationSelected).toHaveBeenCalled()
    expect(onStationSelected.mock.lastCall[0]).toBe(station)
  })
  test("ボタン-showDetail", () => {
    render(<CurrentPosDialog
      info={currentPosDialogProps}
      onStationSelected={onStationSelected}
      onLineSelected={onLineSelected}
    />)
    // showDetail: true
    expect(screen.queryByAltText("close detail")).toBeInTheDocument()
    expect(screen.queryByAltText("show detail")).toBeNull()
    expect(screen.queryByAltText("show radar")).toBeInTheDocument()
    userEvent.click(screen.getByAltText("close detail"))
    // showDetail: false
    expect(screen.queryByAltText("close dialog")).toBeNull()
    expect(screen.queryByAltText("show detail")).toBeInTheDocument()
    expect(screen.queryByAltText("show radar")).toBeNull()
    userEvent.click(screen.getByAltText("show detail"))
    // showDetail: true
    expect(screen.queryByAltText("close detail")).toBeInTheDocument()
    expect(screen.queryByAltText("show detail")).toBeNull()
    expect(screen.queryByAltText("show radar")).toBeInTheDocument()
  })
})