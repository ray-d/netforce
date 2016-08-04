'use strict';
import React, {
  Component,
} from 'react';
import {
  AppRegistry,
  StyleSheet,
  TextInput,
  View
} from 'react-native';

var UIParams=require("./ui_params");
var utils=require("./utils");

class FieldChar extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        var val=this.props.data[this.props.name];
        this.setState({value:val});
    }

    load_data() {
    }

    render() {
        var val_str=this.state.value;
        return <TextInput value={val_str} onChangeText={this.onchange.bind(this)} style={{height:40, borderColor: 'gray', borderWidth: 1}}/>
    }

    onchange(val) {
        this.setState({value:val});
        this.props.data[this.props.name]=val;
    }
}

module.exports=FieldChar;
