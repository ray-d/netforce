'use strict';
import React, {
  Component,
} from 'react';
import {
  AppRegistry,
  StyleSheet,
  TextInput,
  Picker,
  TouchableOpacity,
  Modal,
  Text,
  Platform,
  Dimensions,
  View
} from 'react-native';

var UIParams=require("./ui_params");
var utils=require("./utils");
var _=require("underscore");

var SCREEN_WIDTH = Dimensions.get('window').width;

class FieldSelect extends Component {
    constructor(props) {
        super(props);
        if (this.props.selection) {
            this.selection=this.props.selection;
        } else {
            var f=UIParams.get_field(this.props.model,this.props.name);
            this.selection=f.selection;
        }
        this.state = {show_picker:false};
    }

    componentDidMount() {
        var val=this.props.data[this.props.name];
        this.setState({value:val});
    }

    load_data() {
    }

    render() {
        var items=[null].concat(this.selection);
        if (Platform.OS=="android") {
            return <Picker selectedValue={this.state.value} onValueChange={this.onchange.bind(this)} style={{height:40}}>
                {items.map(function(o,i) {
                    return <Picker.Item label={o?o[1]:""} value={o?o[0]:null} key={i}/>
                }.bind(this))}
            </Picker>
        } else {
            var val_str;
            if (this.state.value) {
                val_str=_.find(this.selection,(o)=>o[0]==this.state.value)[1];
            } else {
                val_str="";
            }
            return <View>
                <TouchableOpacity onPress={this.on_press.bind(this)} style={{borderBottomWidth:0.5,height:40}}>
                    <Text>{val_str}</Text>
                </TouchableOpacity>
                {function() {
                    if (Platform.OS!="ios") return;
                    return <Modal transparent={true} visible={this.state.show_picker}>
                        <View style={{flex:1,justifyContent:"flex-end",alignItems:"center"}}>
                            <View style={{backgroundColor:"#fff",width:SCREEN_WIDTH,height:220}}>
                                <View style={{flexDirection:"row",justifyContent:"flex-end",height:40,alignItems:"center"}}>
                                    <TouchableOpacity onPress={this.hide_picker.bind(this)} style={{marginRight:20}}>
                                        <Text style={{color:"#007aff"}}>Done</Text>
                                    </TouchableOpacity>
                                </View>
                                <Picker selectedValue={this.state.value} onValueChange={this.onchange.bind(this)}>
                                    {items.map(function(o,i) {
                                        return <Picker.Item label={o?o[1]:""} value={o?o[0]:null} key={i}/>
                                    }.bind(this))}
                                </Picker>
                            </View>
                        </View>
                    </Modal>
                }.bind(this)()}
            </View>
        }
    }

    onchange(val) {
        this.setState({value:val});
        this.props.data[this.props.name]=val;
    }

    on_press() {
	    if (Platform.OS=="ios") {
            this.setState({show_picker:true});
        }
    }

    hide_picker() {
        this.setState({show_picker:false});
    }
}

module.exports=FieldSelect;
