/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom'
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { StationDialog } from "../../components/dialog/StationDialog"
import { DialogType, RadarStation, StationPosDialogProps } from "../../components/navState"
import { Line } from "../../data/line"
import { Station, StationAPIResponse, parseStation } from "../../data/station"

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

const stationPosDialogProps: StationPosDialogProps = {
  type: DialogType.STATION,
  props: {
    station: station,
    radarList: radarList,
    prefecture: "東京都",
    lines: [line],
  }
}

describe("StationDialog", () => {
  const onClose = jest.fn(() => { })
  const onLineSelected = jest.fn((line: Line) => { })
  const onStationSelected = jest.fn((s: Station) => { })
  const onShowVoronoi = jest.fn((s: Station) => { })
  test("表示テキスト", () => {
    render(<StationDialog
      info={stationPosDialogProps}
      onClosed={onClose}
      onLineSelected={onLineSelected}
      onStationSelected={onStationSelected}
      onShowVoronoi={onShowVoronoi}
    />)
    expect(screen.getByText(station.name)).toBeInTheDocument()
    expect(screen.getByText(line.name)).toBeInTheDocument()
    expect(screen.getByText("100m")).toBeInTheDocument()
  })
  test("ボタン押下", () => {
    render(<StationDialog
      info={stationPosDialogProps}
      onClosed={onClose}
      onLineSelected={onLineSelected}
      onStationSelected={onStationSelected}
      onShowVoronoi={onShowVoronoi}
    />)
    userEvent.click(screen.getByAltText("close dialog"))
    expect(onClose).toHaveBeenCalled()
    userEvent.click(screen.getByAltText("show voronoi"))
    expect(onShowVoronoi).toHaveBeenCalled()
    expect(onShowVoronoi.mock.lastCall[0]).toBe(station)
    userEvent.click(screen.getByText(line.name))
    expect(onLineSelected).toHaveBeenCalled()
    expect(onLineSelected.mock.lastCall[0]).toBe(line)
    userEvent.click(screen.getByText(new RegExp(`${station.name}\\s*${line.name}`)))
    expect(onStationSelected).toHaveBeenCalled()
    expect(onStationSelected.mock.lastCall[0]).toBe(station)
  })
})