import React, { FC, useEffect, useRef, useState } from "react"
import Autosuggest from 'react-autosuggest'
import axios from "axios"
import "./StationSearchBox.css"
import Service from "../script/StationService"
import { CircularProgress } from "@material-ui/core"
import { PropsEvent } from "../script/Event"

interface SearchProps {
  onSuggestionSelected: (item: StationSuggestion) => any
  inputFocusRequested: PropsEvent<void>
}

export interface StationSuggestion {
  type: "station" | "line"
  code: number
  id: string
  name: string
  name_kana: string
  prefecture?: number
}

interface SuggestSection {
  title: string
  list: Array<StationSuggestion>
}

const StationSearchBox: FC<SearchProps> = ({ onSuggestionSelected, inputFocusRequested }) => {
  const [value, setValue] = useState("")
  const [suggestions, setSuggestions] = useState<SuggestSection[]>([])
  const [loading, setLoading] = useState(false)

  const ignore_pattern = /[ｂ-ｚ]+$/i
  const input_ref = useRef<Autosuggest>(null)
  const last_request_id_ref = useRef<NodeJS.Timeout | null>(null)

  const onSuggestionsFetchRequested = (request: Autosuggest.SuggestionsFetchRequestedParams) => {
    const value = request.value
    if (value.length < 1) {
      return
    }
    if (ignore_pattern.test(value)) return
    const last_request_id = last_request_id_ref.current
    if (last_request_id) {
      clearTimeout(last_request_id)
    }

    last_request_id_ref.current = setTimeout(() => {
      console.log('fetch suggestions', value)
      setLoading(true)
      Promise.all([
        axios.get(`https://station-service.herokuapp.com/api/station/search?name=${value}`),
        axios.get(`https://station-service.herokuapp.com/api/line/search?name=${value}`)
      ]).then(res => {
        let stations = res[0].data as Array<any>
        let lines = res[1].data as Array<any>
        setSuggestions([
          {
            title: '駅・停留所',
            list: stations.map(d => {
              d['type'] = 'station'
              return d as StationSuggestion
            })
          },
          {
            title: '路線',
            list: lines.map(d => {
              d['type'] = 'line'
              return d as StationSuggestion
            })
          }
        ])
        setLoading(false)
      }).catch(err => {
        console.log(err)
        setLoading(false)
      })
    }, 500)
  }

  const onSuggestionsClearRequested = () => {
    const last_request_id = last_request_id_ref.current
    if (last_request_id) {
      clearTimeout(last_request_id)
    }
    setSuggestions([])
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

  useEffect(() => {
    inputFocusRequested.observe("search-box", () => {
      console.log("focus")
      if (input_ref.current && input_ref.current.input) {
        input_ref.current.input.focus()
      }
    })
  })

  const inputProps: Autosuggest.InputProps<StationSuggestion> = {
    placeholder: '駅・路線を検索',
    value: value,
    onChange: (_, params) => {
      setValue(params.newValue)
    },
  }

  return (
    <div className="suggestion-container">
      <Autosuggest<StationSuggestion, SuggestSection>
        ref={input_ref}
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
      <div className={`suggestion-loading ${loading ? "show" : ""}`}>
        <CircularProgress color="primary" size={26} thickness={5.0} variant="indeterminate" />
      </div>
    </div>
  )
}

export default StationSearchBox