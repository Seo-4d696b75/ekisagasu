import { CircularProgress } from "@material-ui/core"
import axios from "axios"
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Autosuggest from 'react-autosuggest'
import { handleIf, PropsEvent } from "../script/event"
import Service from "../script/StationService"
import "./StationSearchBox.css"

interface SearchProps {
  onSuggestionSelected: (item: StationSuggestion) => any
  inputFocusRequested: PropsEvent<void>
}

interface StationResponse {
  code: number
  id: string
  name: string
  name_kana: string
  prefecture?: number
}

export interface StationSuggestion extends StationResponse {
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

  const onSuggestionsFetchRequested = useCallback((request: Autosuggest.SuggestionsFetchRequestedParams) => {
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
      console.log('fetch suggestions', value)
      setLoading(true)
      Promise.all([
        axios.get<StationResponse[]>(`https://station-service.herokuapp.com/api/station/search?name=${value}`),
        axios.get<StationResponse[]>(`https://station-service.herokuapp.com/api/line/search?name=${value}`)
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
        console.log(err)
        setLoading(false)
      })
    }, 500)
  }, [])

  const onSuggestionsClearRequested = useCallback(() => {
    const lastRequestId = lastRequestIdRef.current
    if (lastRequestId) {
      clearTimeout(lastRequestId)
    }
    setSuggestions([])
  }, [])

  useEffect(() => {
    handleIf(inputFocusRequested, () => {
      //console.log("focus")
      if (inputRef.current && inputRef.current.input) {
        inputRef.current.input.focus()
      }
    })
  }, [inputFocusRequested])

  const searchBox = useMemo(() => {
    console.log("render: search box")
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
        getSuggestionValue={(suggenstion) => suggenstion.name}
        getSectionSuggestions={(section) => section.list}
        renderSectionTitle={renderSectionTitle}
        renderSuggestion={renderSuggestion}
        onSuggestionSelected={(_, data) => onSuggestionSelected(data.suggestion)}
        inputProps={inputProps}></Autosuggest>
    )
  }, [suggestions, value, onSuggestionSelected, onSuggestionsFetchRequested, onSuggestionsClearRequested])

  const loadingProgress = useMemo(() => {
    //console.log("render: loading")
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
        <span className="suggestion-prefecture">{Service.get_prefecture(suggestion.prefecture)}</span>
      ) : null}
      {suggestion.name}
    </div>
  )
}

export default StationSearchBox