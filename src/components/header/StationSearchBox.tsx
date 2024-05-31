import { CircularProgress } from "@material-ui/core"
import axios from "axios"
import { FC, useCallback, useMemo, useRef, useState } from "react"
import Autosuggest from 'react-autosuggest'
import { useSelector } from "react-redux"
import Service from "../../script/StationService"
import { PropsEvent } from "../../script/event"
import { logger } from "../../script/logger"
import { selectStationState } from "../../script/rootState"
import { useEventEffect, useRefCallback } from "../hooks"
import "./StationSearchBox.css"

interface SearchProps {
  onSuggestionSelected: (item: StationSuggestion) => any
  inputFocusRequested: PropsEvent<void>
}

interface ApiResponse {
  code: number
  id: string
  name: string
  name_kana: string
  extra: boolean
  prefecture?: number
}

export interface StationSuggestion extends ApiResponse {
  type: "station" | "line"
}

interface SuggestSection {
  title: string
  list: StationSuggestion[]
}

const ignorePattern = /[ｂ-ｚ]+$/i // ローマ字入力中の値は無視したい

const StationSearchBox: FC<SearchProps> = ({ onSuggestionSelected, inputFocusRequested }) => {
  const [value, setValue] = useState("")
  const [suggestions, setSuggestions] = useState<SuggestSection[]>([])
  const [loading, setLoading] = useState(false)

  const inputRef = useRef<Autosuggest>(null)
  const lastRequestIdRef = useRef<NodeJS.Timeout | null>(null)

  const { dataType } = useSelector(selectStationState)
  const isDataExtra = dataType === 'extra'

  const onSuggestionsFetchRequested = useRefCallback((request: Autosuggest.SuggestionsFetchRequestedParams) => {
    const value = request.value
    if (value.length < 1) {
      return
    }
    if (ignorePattern.test(value)) return
    const lastRequestId = lastRequestIdRef.current
    if (lastRequestId) {
      clearTimeout(lastRequestId)
    }

    lastRequestIdRef.current = setTimeout(() => {
      logger.d('fetch suggestions', value)
      setLoading(true)
      Promise.all([
        axios.get<ApiResponse[]>(`${process.env.REACT_APP_STATION_API_URL}/station/search?name=${value}&extra=${isDataExtra}`),
        axios.get<ApiResponse[]>(`${process.env.REACT_APP_STATION_API_URL}/line/search?name=${value}&extra=${isDataExtra}`)
      ]).then(res => {
        const [stations, lines] = res
        setSuggestions([
          {
            title: '駅・停留所',
            list: stations.data.map(d => ({ ...d, type: "station" })),
          },
          {
            title: '路線',
            list: lines.data.map(d => ({ ...d, type: "line" })),
          }
        ])
        setLoading(false)
      }).catch(err => {
        logger.w('Failed to fetch suggestion', err)
        setLoading(false)
      })
    }, 500)
  })

  const onSuggestionsClearRequested = useCallback(() => {
    const lastRequestId = lastRequestIdRef.current
    if (lastRequestId) {
      clearTimeout(lastRequestId)
    }
    setSuggestions([])
  }, [])

  useEventEffect(inputFocusRequested, () => {
    if (inputRef.current && inputRef.current.input) {
      inputRef.current.input.focus()
    }
  })

  const searchBox = useMemo(() => {
    const inputProps: Autosuggest.InputProps<StationSuggestion> = {
      placeholder: '駅・路線を検索',
      value: value,
      onChange: (_, params) => {
        if (params.method === "type") {
          setValue(params.newValue)
        }
      },
    }
    return (
      <Autosuggest<StationSuggestion, SuggestSection>
        ref={inputRef}
        //className="suggestion-input"
        suggestions={suggestions}
        onSuggestionsFetchRequested={onSuggestionsFetchRequested}
        onSuggestionsClearRequested={onSuggestionsClearRequested}
        multiSection={true}
        getSuggestionValue={(suggestion) => suggestion.name}
        getSectionSuggestions={(section) => section.list}
        renderSectionTitle={renderSectionTitle}
        renderSuggestion={renderSuggestion}
        onSuggestionSelected={(_, data) => onSuggestionSelected(data.suggestion)}
        inputProps={inputProps}></Autosuggest>
    )
  }, [suggestions, value, onSuggestionSelected, onSuggestionsFetchRequested, onSuggestionsClearRequested])

  const loadingProgress = useMemo(() => {
    return (
      <div className={`suggestion-loading ${loading ? "show" : ""}`}>
        <CircularProgress color="primary" size={26} thickness={5.0} variant="indeterminate" />
      </div>
    )
  }, [loading])

  return (
    <div className="suggestion-container">
      {searchBox}
      {loadingProgress}
    </div>
  )
}

const renderSectionTitle = (section: any) => {
  return (
    <strong>{section.title}</strong>
  )
}

const renderSuggestion = (suggestion: StationSuggestion, param: Autosuggest.RenderSuggestionParams) => {
  return (
    <div>
      {suggestion.prefecture ? (
        <span className="suggestion-prefecture">{Service.getPrefecture(suggestion.prefecture)}</span>
      ) : null}
      {suggestion.name}
      {suggestion.extra ? <span className="suggestion-extra">extra</span> : null}
    </div>
  )
}

export default StationSearchBox