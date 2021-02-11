import React from "react";
import Autosuggest from 'react-autosuggest';
import axios from "axios";
import "./StationSearchBox.css";
import Service from "../script/StationService";
import ProgressBar from "./ProgressBar";

interface SearchProps {
  onSuggestionSelected: (item: StationSuggestion) => any
}

interface SearchState {
  value: string
  suggestions: Array<SuggestSection>
  loading: boolean
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

export default class StationSearchBox extends React.Component<SearchProps, SearchState> {

  constructor(props: SearchProps){
    super(props);
    this.state = {
      value: '',
      suggestions: [],
      loading: false,
    };
  }

  
  input_value ='';
  ignore_pattern = /[ｂ-ｚ]+$/i
  input_ref = React.createRef<Autosuggest>()
  last_request_id: NodeJS.Timeout | null = null


  onChange(event: React.FormEvent<any>, params: Autosuggest.ChangeEvent){
    this.setState({
      ...this.state,
      value: params.newValue
    })
  }


  onSuggestionsFetchRequested(request: Autosuggest.SuggestionsFetchRequestedParams){
    var value = request.value
    if ( value.length < 2 ){
      return;
    }
    if ( this.ignore_pattern.test(value) ) return;
    if ( this.last_request_id ){
      clearTimeout(this.last_request_id);
    }
    
    this.last_request_id = setTimeout(()=>{
      console.log('fetch suggestions', value);
      this.setState({
        ...this.state,
        loading: true
      })
      Promise.all([
        axios.get(`https://station-service.herokuapp.com/api/station/search?name=${value}`),
        axios.get(`https://station-service.herokuapp.com/api/line/search?name=${value}`)
      ]).then(res => {
        var stations = res[0].data as Array<any>
        var lines = res[1].data as Array<any>
        this.setState({
          ...this.state,
          suggestions: [
            {
              title: '駅・停留所',
              list: stations.map( d => {
                d['type'] = 'station';
                return d as StationSuggestion;
              })
            },
            {
              title: '路線',
              list: lines.map(d  => {
                d['type'] = 'line';
                return d as StationSuggestion;
              })
            }
          ],
          loading: false,
        });
      }).catch(err => {
        console.log(err);
      });
    }, 500)
  }

  onSuggestionsClearRequested(){
    //console.log('onSuggestionsClearRequested');
    this.setState({
      ...this.state,
      suggestions: []
    });
  };

  getSuggestionValue(suggestion: StationSuggestion): string{
    return suggestion.name;
  }

  getSectionSuggestions(section: SuggestSection): Array<StationSuggestion>{
    return section.list;
  }

  renderSectionTitle(section: any) {
    return (
      <strong>{section.title}</strong>
    );
  }

  renderSuggestion(suggestion: StationSuggestion, param: Autosuggest.RenderSuggestionParams){
    return (
      <div>
        {suggestion.prefecture ? (
          <span className="suggestion-prefecture">{Service.get_prefecture(suggestion.prefecture)}</span>
        ) : null}
        {suggestion.name}
      </div>
    );
  } 

  onSuggestionSelected(event: React.FormEvent<any>, data: Autosuggest.SuggestionSelectedEventData<StationSuggestion>) {
    var suggestion = data.suggestion
    console.log("selected", suggestion);
    if ( this.props.onSuggestionSelected ){
      this.props.onSuggestionSelected(suggestion);
    }
  };

  focus(){
    console.log("focus")
    if ( this.input_ref.current && this.input_ref.current.input ){
      this.input_ref.current.input.focus()
    }
  }

  render(){
    var value = this.state.value;
    if ( value !== this.input_value && this.input_value.length === 0 ){
      value = '';
    }
    const inputProps: Autosuggest.InputProps<StationSuggestion> = {
      placeholder: '駅・路線を検索',
      value: value,
      onChange: this.onChange.bind(this),
    };
    return (
      <div className="suggestion-container">
        <Autosuggest<StationSuggestion,SuggestSection>
          ref={this.input_ref}
          //className="suggestion-input"
          suggestions={this.state.suggestions}
          onSuggestionsFetchRequested={this.onSuggestionsFetchRequested.bind(this)}
          onSuggestionsClearRequested={this.onSuggestionsClearRequested.bind(this)}
          multiSection={true}
          getSuggestionValue={this.getSuggestionValue}
          getSectionSuggestions={this.getSectionSuggestions}
          renderSectionTitle={this.renderSectionTitle}
          renderSuggestion={this.renderSuggestion}
          onSuggestionSelected={this.onSuggestionSelected.bind(this)}
          inputProps={inputProps}></Autosuggest>
        <div className="suggestion-loading">
          <ProgressBar visible={this.state.loading}></ProgressBar>
        </div>
      </div>
    )
  }

}