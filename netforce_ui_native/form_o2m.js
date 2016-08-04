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
  Text,
  TextInput,
  Navigator,
  AsyncStorage,
  ScrollView,
  View
} from 'react-native';

var xpath = require('xpath');
var dom = require('xmldom').DOMParser;

var rpc=require("./rpc")
var Button=require("./button");
var ui_params=require("./ui_params");
var utils=require("./utils");

var Icon = require('react-native-vector-icons/FontAwesome');
var FormLayout=require("./form_layout");

class FormO2M extends Component {
    constructor(props) {
        super(props);
        if (this.props.data) {
            var data=Object.assign({},this.props.data);
        } else {
            var data={};
        }
        if (this.props.layout_el) {
            this.layout_el=this.props.layout_el;
        } else {
            var layout=ui_params.find_layout({model:this.props.model,type:"form_mobile"});
            if (layout) {
                var doc=new dom().parseFromString(layout.layout);
                this.layout_el=doc.documentElement;
            } else {
                alert("Missing layout");
            }
        }
        this.state = {
            data: data,
        };
    }

    componentDidMount() {
    }

    render() {
        if (!this.layout_el) return <View/>
        if (!this.state.data) return <Text>Loading...</Text>
        var m=ui_params.get_model(this.props.model);
        var title;
        if (this.state.data.id) {
            if (this.props.readonly) {
                title="View "+m.string;
            } else {
                title="Modify "+m.string;
            }
        } else {
            title="Add "+m.string;
        }
        return <ScrollView style={{flex:1}}>
            <View style={{alignItems:"center",padding:10,borderBottomWidth:0.5,marginBottom:10}}>
                <Text style={{fontWeight:"bold"}}>{title}</Text>
            </View>
            <FormLayout navigator={this.props.navigator} model={this.props.model} data={this.state.data} layout_el={this.layout_el} readonly={this.props.readonly}/>
            {function() {
                if (this.props.readonly) return;
                return <View style={{paddingTop:5,marginTop:20}}>
                    <Button onPress={this.press_save.bind(this)}>
                        <View style={{height:50,backgroundColor:"#37b",alignItems:"center",justifyContent:"center"}}>
                            <Text style={{color:"#fff"}}><Icon name="check" size={16} color="#eee"/> {this.props.index!=null?"Modify":"Add"}</Text>
                        </View>
                    </Button>
                </View>
            }.bind(this)()}
            {function() {
                if (this.props.readonly) return;
                if (this.props.index==null) return;
                return <View style={{paddingTop:5}}>
                    <Button onPress={this.press_remove.bind(this)}>
                        <View style={{height:50,backgroundColor:"#c33",alignItems:"center",justifyContent:"center"}}>
                            <Text style={{color:"#fff"}}>Remove</Text>
                        </View>
                    </Button>
                </View>
            }.bind(this)()}
        </ScrollView>
    }

    get_change_vals() {
        console.log("get_change_vals");
        var vals={};
        for (var name in this.state.data) {
            if (name=="id") continue;
            var v=this.state.data[name];
            var f=ui_params.get_field(this.props.model,name);
            if (v!=null) {
                if (f.type=="many2one") {
                    v=v[0];
                }
            }
            vals[name]=v;
        }
        return vals;
    }

    press_save() {
        this.props.on_save(this.props.index,this.state.data);
        this.props.navigator.pop();
    }

    press_remove() {
        this.props.on_delete(this.props.index);
        this.props.navigator.pop();
    }

    back_reload() {
        var routes=this.props.navigator.getCurrentRoutes();
        var route=routes[routes.length-2];
        if (route==null) route={name:"login"};
        route=Object.assign({},route);
        this.props.navigator.replacePrevious(route);
        this.props.navigator.pop();
    }
}

module.exports=FormO2M;
