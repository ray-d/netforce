'use strict';
import React, {
  Component,
} from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  TextInput,
  NativeModules,
  TouchableOpacity,
  Platform,
  DatePickerIOS,
  Animated,
  Modal,
  View
} from 'react-native';

var UIParams=require("./ui_params");
var utils=require("./utils");
var moment=require("moment");

class FieldDate extends Component {
    constructor(props) {
        super(props);
        this.state = {show_picker:false};
    }

    componentDidMount() {
        var val=this.props.data[this.props.name];
        this.setState({value:val});
    }

    load_data() {
    }

    render() {
        var val_str=this.state.value;
        var options=["1","2","3"];
        return <View>
            <TouchableOpacity onPress={this.on_press.bind(this)} style={{borderBottomWidth:0.5,height:40}}>
                <Text>{val_str}</Text>
            </TouchableOpacity>
            {function() {
	            if (Platform.OS!="ios") return;
                var d;
                if (this.state.value) d=new Date(this.state.value);
                else d=new Date();
                return <Modal transparent={true} visible={this.state.show_picker}>
                    <View style={{flex:1,justifyContent:"flex-end",alignItems:"center",height:220}}>
                        <View style={{backgroundColor:"#fff"}}>
                            <View style={{flexDirection:"row",justifyContent:"flex-end",height:40,alignItems:"center"}}>
                                <TouchableOpacity onPress={this.hide_picker.bind(this)} style={{marginRight:20}}>
                                    <Text style={{color:"#007aff"}}>Done</Text>
                                </TouchableOpacity>
                            </View>
                            <DatePickerIOS date={d} mode="date" onDateChange={this.date_changed.bind(this)}/>
                        </View>
                    </View>
                </Modal>
            }.bind(this)()}
        </View>
    }

    hide_picker() {
        this.setState({show_picker:false});
    }

    date_changed(date) {
        var val=moment(date).format("YYYY-MM-DD");
        this.setState({value:val});
        this.props.data[this.props.name]=val;
    }

    on_press() {
	    if (Platform.OS=="ios") {
            this.setState({show_picker:true});
        } else {
            NativeModules.DateAndroid.showDatepickerWithInitialDateInMilliseconds(""+moment(this.state.value).unix()*1000,function() {}, function(y,m,d) {
                var val=moment([y,m,d]).format("YYYY-MM-DD");
                this.setState({value:val});
                this.props.data[this.props.name]=val;
            }.bind(this));
        }
    }
}

module.exports=FieldDate;
