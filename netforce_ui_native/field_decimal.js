/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */
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

class FieldDecimal extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        var val=this.props.data[this.props.name];
        var val_str=val!=null?""+val:"";
        this.setState({val_str:val_str});
    }

    load_data() {
    }

    render() {
        return <TextInput value={this.state.val_str} onChangeText={this.onchange.bind(this)} style={{height:40}} keyboardType="numeric"/>
    }

    onchange(val_str) {
        this.setState({val_str:val_str});
        var val=parseFloat(val_str);
        this.props.data[this.props.name]=val;
    }
}

module.exports=FieldDecimal;
