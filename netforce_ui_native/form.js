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

var rpc=require("./rpc");
var Button=require("./button");
var ui_params=require("./ui_params");
var utils=require("./utils");
var _=require("underscore");

var Icon = require('react-native-vector-icons/FontAwesome');
var FormLayout=require("./form_layout");

class Form extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        var layout;
        if (this.props.layout) {
            layout=ui_params.get_layout(this.props.layout);
        } else {
            layout=ui_params.find_layout({model:this.props.model,type:"form_mobile"});
            if (!layout) throw "Form layout not found for model "+this.props.model;
        }
        var doc=new dom().parseFromString(layout.layout);
        this.layout_el=doc.documentElement;
        this.readonly=this.layout_el.getAttribute("readonly")?true:false;
        this.load_data();
    }

    load_data() {
        console.log("Form.load_data");
        var cond=this.props.condition||[];
        var field_nodes=xpath.select("field", this.layout_el);
        var fields=[];
        field_nodes.forEach(function(el) {
            fields.push(el.getAttribute("name"));
        });
        console.log("fields",fields);
        //alert("fields "+JSON.stringify(fields))
        var ctx={};
        if (this.props.context) {
            if (typeof(this.props.context)=="string") {
                ctx=JSON.parse(this.props.context);
            } else if (typeof(this.props.context)=="object") {
                ctx=this.props.context;
            }
        }
        if (this.props.active_id) {
            rpc.execute(this.props.model,"read",[[this.props.active_id],fields],{context:ctx},function(err,res) {
                if (err) {
                    alert("ERROR: "+err);
                    return;
                }
                var data=res[0];
                data._orig_data=Object.assign({},data);
                this.setState({
                    data: data,
                });
            }.bind(this));
        } else {
            rpc.execute(this.props.model,"default_get",[fields],{context:ctx},function(err,res) {
                if (err) {
                    alert("ERROR: "+err);
                    return;
                }
                var data=res;
                data._orig_data=Object.assign({},data);
                this.setState({
                    data: data,
                });
            }.bind(this));
        }
    }

    render() {
        if (!this.state.data) return <Text>Loading...</Text>
        var m=ui_params.get_model(this.props.model);
        var title;
        if (this.props.active_id) {
            if (this.readonly) {
                title="View "+m.string;
            } else {
                title="Edit "+m.string;
            }
        } else {
            title="New "+m.string;
        }
        return <ScrollView style={{flex:1}}>
            <View style={{alignItems:"center",padding:10,borderBottomWidth:0.5,marginBottom:10}}>
                <Text style={{fontWeight:"bold"}}>{title}</Text>
            </View>
            <FormLayout navigator={this.props.navigator} model={this.props.model} data={this.state.data} layout_el={this.layout_el} readonly={this.readonly} reload={this.reload.bind(this)} context={this.props.context}/>
            {function() {
                if (this.readonly) return;
                return <View style={{paddingTop:5,marginTop:20}}>
                    <Button onPress={this.press_save.bind(this)}>
                        <View style={{height:50,backgroundColor:"#37b",alignItems:"center",justifyContent:"center"}}>
                            <Text style={{color:"#fff"}}><Icon name="check" size={16} color="#eee"/> Save</Text>
                        </View>
                    </Button>
                </View>
            }.bind(this)()}
            {function() {
                if (this.readonly) return;
                if (!this.props.active_id) return;
                return <View style={{paddingTop:5}}>
                    <Button onPress={this.press_delete.bind(this)}>
                        <View style={{height:50,backgroundColor:"#c33",alignItems:"center",justifyContent:"center"}}>
                            <Text style={{color:"#fff"}}>Delete</Text>
                        </View>
                    </Button>
                </View>
            }.bind(this)()}
        </ScrollView>
    }

    get_change_vals(data,model) {
        console.log("get_change_vals");
        var change={};
        for (var name in data) {
            if (name=="id") continue;
            if (name=="_orig_data") continue;
            var v=data[name];
            var orig_v;
            if (data.id) {
                if (!data._orig_data) throw "Missing _orig_data";
                orig_v=data._orig_data[name];
            } else {
                orig_v=null;
            }
            var f=ui_params.get_field(model,name);
            if (f.type=="char") {
                if (v!=orig_v) change[name]=v;
            } else if (f.type=="text") {
                if (v!=orig_v) change[name]=v;
            } else if (f.type=="integer") {
                if (v!=orig_v) change[name]=v;
            } else if (f.type=="float") {
                if (v!=orig_v) change[name]=v;
            } else if (f.type=="decimal") {
                if (v!=orig_v) change[name]=v;
            } else if (f.type=="selection") {
                if (v!=orig_v) change[name]=v;
            } else if (f.type=="date") {
                if (v!=orig_v) change[name]=v;
            } else if (f.type=="datetime") {
                if (v!=orig_v) change[name]=v;
            } else if (f.type=="file") {
                if (v!=orig_v) change[name]=v;
            } else if (f.type=="many2one") {
                var v1=v?v[0]:null;
                var v2=orig_v?orig_v[0]:null;
                if (v1!=v2) change[name]=v1;
            } else if (f.type=="one2many") {
                if (orig_v==null) orig_v=[];
                var ops=[];
                var new_ids={};
                v.forEach(function(rdata) {
                    if (typeof(rdata)!="object") throw "Invalid O2M data";
                    var rchange=this.get_change_vals(rdata,f.relation);
                    if (Object.keys(rchange).length>0) {
                        if (rdata.id) {
                            ops.push(["write",[rdata.id],rchange]);
                        } else {
                            ops.push(["create",rchange]);
                        }
                    }
                    if (rdata.id) new_ids[rdata.id]=true;
                }.bind(this));
                var del_ids=[];
                orig_v.forEach(function(id) {
                    if (!new_ids[id]) del_ids.push(id);
                }.bind(this));
                if (del_ids.length>0) ops.push(["delete",del_ids]);
                if (ops.length>0) change[name]=ops;
            }
        }
        return change;
    }

    press_save() {
        var vals=this.get_change_vals(this.state.data,this.props.model);
        //alert("vals "+JSON.stringify(vals));
        if (Object.keys(vals).length==0) {
            alert("There are no changes to save.");
            return;
        }
        var ctx={};
        if (this.props.context) {
            if (typeof(this.props.context)=="string") {
                ctx=JSON.parse(this.props.context);
            } else if (typeof(this.props.context)=="object") {
                ctx=this.props.context;
            }
        }
        if (this.props.active_id) {
            rpc.execute(this.props.model,"write",[[this.props.active_id],vals],{context:ctx},function(err,new_id) {
                if (err) {
                    alert("Error: "+err);
                    return;
                }
                this.back_reload();
            }.bind(this));
        } else {
            rpc.execute(this.props.model,"create",[vals],{context:ctx},function(err,new_id) {
                if (err) {
                    alert("Error: "+err);
                    return;
                }
                this.back_reload();
            }.bind(this));
        }
    }

    press_delete() {
        // TODO: add confirm
        var ctx={};
        rpc.execute(this.props.model,"delete",[[this.props.active_id]],{context:ctx},function(err) {
            if (err) {
                alert("Error: "+err);
                return;
            }
            this.back_reload();
        }.bind(this));
    }

    reload() {
        this.load_data();
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

module.exports=Form;
