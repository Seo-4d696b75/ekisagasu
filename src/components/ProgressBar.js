import React from "react";
import "./ProgressBar.css";

export default class ProgressBar extends React.Component {


  render() {
    var styles = {
      display: this.props.visible === undefined || this.props.visible ? 'block' : 'none',
    };
    return (
      <div className="square" style={styles}>
        <div className="Progress-circle" ></div>
        <div className="Progress-circle-inside"></div>
      </div>
    )
  }

}