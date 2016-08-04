'use strict';
import React, {
  Component,
} from 'react';
import {
  AppRegistry,
  Platform,
  TouchableOpacity,
  TouchableNativeFeedback,
} from 'react-native';

class Button extends Component {
  render() {
	  if (Platform.OS=="ios") {
            return <TouchableOpacity onPress={this.props.onPress}>
                {this.props.children}
            </TouchableOpacity>
	  } else {
            return <TouchableNativeFeedback onPress={this.props.onPress}>
                {this.props.children}
            </TouchableNativeFeedback>
	  }
  }
}

module.exports=Button;
