/**
 * @jest-environment jsdom
 */

import { StationTitle } from "../../components/dialog/DialogSections"
import { render, screen } from "@testing-library/react"
import { parseStation, StationAPIResponse } from "../../script/station"
import '@testing-library/jest-dom'

const response = { "code": 2700103, "left": 1131339, "right": 9931112, "id": "7455c6", "name": "北品川", "original_name": "北品川", "name_kana": "きたしながわ", "closed": false, "lat": 35.622458, "lng": 139.739191, "prefecture": 13, "lines": [27001], "attr": "eco", "postal_code": "140-0001", "address": "品川区北品川１-１-４", "next": [1130201, 100202, 9933602, 9930206, 2700104], "voronoi": { "type": "Feature", "geometry": { "type": "Polygon", "coordinates": [[[139.744812, 35.625783], [139.733042, 35.625425], [139.732797, 35.625189], [139.734709, 35.617535], [139.744954, 35.622141], [139.744812, 35.625783]]] }, "properties": {} } } as StationAPIResponse
const station = parseStation(response)

describe("StationTitle", () => {
  test("表示テキストの確認", () => {
    render(<StationTitle station={station} />)
    expect(screen.getByText("北品川")).toBeInTheDocument()
    expect(screen.getByText("きたしながわ")).toBeInTheDocument()
  })
})