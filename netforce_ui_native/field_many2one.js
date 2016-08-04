'use strict';
import React, {
  Component,
} from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Picker,
  Modal,
  Platform,
  Dimensions,
  View
} from 'react-native';

var UIParams=require("./ui_params");
var utils=require("./utils");
var rpc=require("./rpc");
var Icon = require('react-native-vector-icons/FontAwesome');
var _=require("underscore");

var SCREEN_WIDTH = Dimensions.get('window').width;

class FieldMany2One extends Component {
    constructor(props) {
        super(props);
        if (this.props.relation) {
            this.relation=this.props.relation;
        } else {
            var f=UIParams.get_field(this.props.model,this.props.name);
            this.relation=f.relation;
        }
        this.state = {show_picker:false};
    }

    componentDidMount() {
        var val=this.props.data[this.props.name];
        this.setState({value:val});
        if (this.props.select) this.load_items();
    }

    load_items() {
        var ctx={};
        rpc.execute(this.relation,"name_search",[""],{context:ctx},(err,data)=>{
            if (err) {
                alert("Error: "+err);
                return;
            }
            this.setState({items:data});
        });
    }

    render() {
        var val=this.state.value;
        var val_str=val?val[1]:null;
        var val_id=val?val[0]:null;
        if (this.props.select) {
            if (!this.state.items) return <Text>Loading...</Text>
            var items=[[null,""]].concat(this.state.items);
            if (Platform.OS=="android") {
                return <Picker selectedValue={this.state.value} onValueChange={this.select_item.bind(this)} style={{height:40}}>
                    {items.map(function(o,i) {
                        return <Picker.Item label={o?o[1]:""} value={o?o[0]:null} key={i}/>
                    }.bind(this))}
                </Picker>
            } else {
                var val_id=this.state.value?this.state.value[0]:null;
                var val_str=this.state.value?this.state.value[1]:null;
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
                                    <Picker selectedValue={val_id} onValueChange={this.select_item.bind(this)}>
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
        } else {
            return <View style={{flexDirection:"row",borderBottomWidth:0.5,marginBottom:5,height:40}}>
                <TouchableOpacity style={{flex:1}} onPress={this.search.bind(this)}>
                    <Text style={{flex:1}}>{val_str}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{padding:5}} onPress={this.clear.bind(this)}><Icon name="remove" size={16} color="#333"/></TouchableOpacity>
            </View>
        }
    }

    search() {
        var f=UIParams.get_field(this.props.model,this.props.name);
        this.props.navigator.push({name:"search_m2o",model:f.relation,on_select:this.on_select.bind(this)});
    }

    clear() {
        this.setState({value:null});
    }

    on_select(val) {
        this.setState({value:val});
        this.props.data[this.props.name]=val;
    }

    select_item(val_id,pos) {
        console.log("select_item",val_id);
        var val;
        if (val_id) {
            val=_.find(this.state.items,function(obj) {return obj[0]==val_id});
            if (!val) throw "Item not found";
        } else {
            val=null;
        }
        console.log("val",val);
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

module.exports=FieldMany2One;
