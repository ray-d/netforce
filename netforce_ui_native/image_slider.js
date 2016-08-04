'use strict';
import React, {
  Component,
  StyleSheet,
  Text,
  TextInput,
  Navigator,
  NativeModules,
  ListView,
  View
} from 'react-native';

var utils=require("./utils");
var Button=require("./button");
var rpc=require("netforce_ui_native/rpc")

class ImageSlider extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    componentWillMount() {
    }

    render() {
    }
}

module.exports=ImageSlider;
