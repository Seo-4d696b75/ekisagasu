import React from "react";
import Autosuggest from 'react-autosuggest';
import axios from "axios";
import "./StationSearchBox.css";
import Service from "../script/StationService";
import ProgressBar from "./ProgressBar";

export default class StationSearchBox extends React.Component {

  constructor(){
    super();
    this.state = {
      value: '',
      suggestions: [],
      last_request_id: null,
      loading: false,
    };
    this.input_value ='';
    this.ignore_pattern = /[ｂ-ｚ]+$/i
  }

  onChange(event, { newValue }){
    this.setState(Object.assign({}, this.state, {
      value: newValue,
    }));
    this.input_value = newValue;
  };

  onSuggestionsFetchRequested({ value }){
    if ( value.length < 2 ){
      return;
    }
    if ( this.ignore_pattern.test(value) ) return;
    if ( this.last_request_id ){
      clearTimeout(this.last_request_id);
    }
    
    this.last_request_id = setTimeout(()=>{
      console.log('fetch suggestions', value);
      this.setState(Object.assign({}, this.state, {
        loading: true,
      }));
      Promise.all([
        axios.get(`https://station-service.herokuapp.com/api/station/search?name=${value}`),
        axios.get(`https://station-service.herokuapp.com/api/line/search?name=${value}`)
      ]).then(res => {
        this.setState(Object.assign({}, this.state, {
          suggestions: [
            {
              title: '駅・停留所',
              list: res[0].data.map( d => {
                d['type'] = 'station';
                return d;
              })
            },
            {
              title: '路線',
              list: res[1].data.map(d => {
                d['type'] = 'line';
                return d;
              })
            }
          ],
          loading: false,
        }));
      }).catch(err => {
        console.log(err);
      });
    }, 500);
  };

  onSuggestionsClearRequested(){
    //console.log('onSuggestionsClearRequested');
    this.setState(Object.assign({}, this.state, {
      suggestions: [],
    }));
  };

  getSuggestionValue(suggestion){
    return suggestion.name;
  }

  getSectionSuggestions(section) {
    return section.list;
  }

  renderSectionTitle(section) {
    return (
      <strong>{section.title}</strong>
    );
  }

  renderSuggestion(suggestion){
    return (
      <div>
        {suggestion.prefecture ? (
          <span className="suggestion-prefecture">{Service.get_prefecture(suggestion.prefecture)}</span>
        ) : null}
        {suggestion.name}
      </div>
    );
  } 

  onSuggestionSelected(event, { suggestion, suggestionValue, suggestionIndex, sectionIndex, method }) {
    console.log("selected", suggestion);
    if ( this.props.onSuggestionSelected ){
      this.props.onSuggestionSelected(suggestion);
    }
  };

  render(){
    var value = this.state.value;
    if ( value !== this.input_value && this.input_value.length === 0 ){
      value = '';
    }
    const inputProps = {
      placeholder: '駅・路線を検索',
      value: value,
      onChange: this.onChange.bind(this),
    };
    return (
      <div className="suggestion-container">
        <Autosuggest
          className="suggestion-input"
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