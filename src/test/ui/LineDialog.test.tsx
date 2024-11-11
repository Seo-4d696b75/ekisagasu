/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom'
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LineDialog } from "../../components/dialog/LineDialog"
import { DialogType, LineDialogProps } from "../../components/navState"
import { Line, Station } from "../../station"
import { StationAPIResponse, parseStation } from "../../station/station"

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

const lineDetail: Line = {
  ...line,
  detail: {
    stations: [station],
    polylines: [],
    north: 45,
    south: 44,
    west: 135,
    east: 136,
  }
}

const lineDialogProps: LineDialogProps = {
  type: DialogType.LINE,
  props: {
    line: line,
  }
}

const lineDetailDialogProps: LineDialogProps = {
  type: DialogType.LINE,
  props: {
    line: lineDetail,
  }
}

describe("LineDialog", () => {
  const onClose = jest.fn(() => { })
  const onStationSelected = jest.fn((s: Station) => { })
  const onShowPolyline = jest.fn((l: Line) => { })
  test("表示テキストの確認", () => {
    render(<LineDialog
      info={lineDialogProps}
      onClosed={onClose}
      onStationSelected={onStationSelected}
      onShowPolyline={onShowPolyline}
    />)
    expect(screen.getByText(line.name)).toBeInTheDocument()
    expect(screen.getByText(line.nameKana)).toBeInTheDocument()
    expect(screen.getByText(/Now Loading/)).toBeInTheDocument()
    expect(screen.queryByText(station.name)).toBeNull()
  })
  test("表示テキストの確認 detail", () => {
    render(<LineDialog
      info={lineDetailDialogProps}
      onClosed={onClose}
      onStationSelected={onStationSelected}
      onShowPolyline={onShowPolyline}
    />)
    expect(screen.getByText(line.name)).toBeInTheDocument()
    expect(screen.getByText(line.nameKana)).toBeInTheDocument()
    expect(screen.getByText("登録駅一覧")).toBeInTheDocument()
    expect(screen.getByText(station.name)).toBeInTheDocument()
    expect(screen.getByText(station.nameKana)).toBeInTheDocument()
  })
  test("ボタン押下", async () => {
    render(<LineDialog
      info={lineDetailDialogProps}
      onClosed={onClose}
      onStationSelected={onStationSelected}
      onShowPolyline={onShowPolyline}
    />)
    await userEvent.click(screen.getByAltText("close dialog"))
    expect(onClose).toHaveBeenCalled()
    await userEvent.click(screen.getByAltText("show polyline"))
    expect(onShowPolyline).toHaveBeenCalled()
    expect(onShowPolyline.mock.lastCall?.[0]).toMatchObject(line)
    await userEvent.click(screen.getByText(station.name))
    expect(onStationSelected).toHaveBeenCalled()
    expect(onStationSelected.mock.lastCall?.[0]).toBe(station)
  })
})