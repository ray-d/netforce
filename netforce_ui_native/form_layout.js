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

var FieldChar=require("./field_char");
var FieldText=require("./field_text");
var FieldFloat=require("./field_float");
var FieldDecimal=require("./field_decimal");
var FieldInteger=require("./field_integer");
var FieldDate=require("./field_date");
var FieldDateTime=require("./field_datetime");
var FieldSelect=require("./field_select");
var FieldFile=require("./field_file");
var FieldImage=require("./field_image");
var FieldMany2One=require("./field_many2one");
var FieldOne2Many=require("./field_one2many");

class FormLayout extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        console.log("FormLayout.render",this.props.context);
        var m=ui_params.get_model(this.props.model);
        var child_els=xpath.select("child::*", this.props.layout_el);
        var cols=[];
        var rows=[];
        {child_els.forEach(function(el,i) {
            if (el.tagName=="newline") {
                rows.push(<View style={{flexDirection:"row", justifyContent: "space-between"}} key={rows.length}>{cols}</View>);
                cols=[];
                return;
            } else if (el.tagName=="field") {
                var name=el.getAttribute("name");
                var f=ui_params.get_field(this.props.model,name);
                var invisible=el.getAttribute("invisible");
                if (invisible) return;
                var field_component;
                if (this.props.readonly && f.type!="one2many") {
                    var val=this.props.data[name];
                    var val_str=utils.field_val_to_str(val,f);
                    field_component=<Text>{val_str}</Text>
                } else {
                    if (f.type=="char") {
                        field_component=<FieldChar model={this.props.model} name={name} data={this.props.data}/>
                    } else if (f.type=="text") {
                        field_component=<FieldText model={this.props.model} name={name} data={this.props.data}/>
                    } else if (f.type=="float") {
                        field_component=<FieldFloat model={this.props.model} name={name} data={this.props.data}/>
                    } else if (f.type=="decimal") {
                        field_component=<FieldDecimal model={this.props.model} name={name} data={this.props.data}/>
                    } else if (f.type=="integer") {
                        field_component=<FieldInteger model={this.props.model} name={name} data={this.props.data}/>
                    } else if (f.type=="date") {
                        field_component=<FieldDate model={this.props.model} name={name} data={this.props.data}/>
                    } else if (f.type=="datetime") {
                        field_component=<FieldDateTime model={this.props.model} name={name} data={this.props.data}/>
                    } else if (f.type=="selection") {
                        field_component=<FieldSelect model={this.props.model} name={name} data={this.props.data}/>
                    } else if (f.type=="file") {
                        field_component=<FieldImage model={this.props.model} name={name} data={this.props.data}/>
                    } else if (f.type=="many2one") {
                        field_component=<FieldMany2One navigator={this.props.navigator} model={this.props.model} name={name} data={this.props.data} select={el.getAttribute("select")}/>
                    } else if (f.type=="one2many") {
                        var res=xpath.select("list",el);
                        var list_layout_el=res.length>0?res[0]:null;
                        var res=xpath.select("form",el);
                        var form_layout_el=res.length>0?res[0]:null;
                        var link=el.getAttribute("link");
                        field_component=<FieldOne2Many navigator={this.props.navigator} model={this.props.model} name={name} data={this.props.data} list_layout_el={list_layout_el} form_layout_el={form_layout_el} readonly={this.props.readonly} link={link} context={this.props.context}/>
                    } else {
                        throw "Invalid field type: "+f.type;
                    }
                }
                var col=<View key={cols.length} style={{flexDirection:"column",flex:1}}>
                    <Text style={{fontWeight:"bold",marginRight:5}}>{f.string}</Text>
                    {field_component}
                </View>;
                cols.push(col);
            } else if (el.tagName=="button") {
                var hide=false;
                var state=el.getAttribute("state");
                if (state) {
                    var states=state.split(",");
                    if (!_.contains(states,this.props.data.state)) hide=true;
                }
                if (!this.props.data.id) hide=true;
                if (!hide) {
                    var col=<View key={cols.length} style={{paddingTop:5,flex:1}}>
                        <Button onPress={this.press_button.bind(this,el)}>
                            <View style={{height:50,backgroundColor:"#aaa",alignItems:"center",justifyContent:"center",flexDirection:"row"}}>
                                {function() {
                                    var icon=el.getAttribute("icon");
                                    if (!icon) return;
                                    return <Icon name={icon} size={16} color="#eee" style={{marginRight:5}}/>
                                }.bind(this)()}
                                <Text style={{color:"#fff"}}>
                                    {el.getAttribute("string")}
                                </Text>
                            </View>
                        </Button>
                    </View>
                    cols.push(col);
                }
            } else {
                throw "Invalid tag name: "+el.tagName;
            }
        }.bind(this))}
        rows.push(<View style={{flexDirection:"row", justifyContent: "space-between"}} key={rows.length}>{cols}</View>);
        return <View>{rows}</View>
    }

    press_button(el) {
        var method=el.getAttribute("method");
        if (method) {
            var ctx=this.props.context||{};
            rpc.execute(this.props.model,method,[[this.props.data.id]],{context:ctx},function(err,res) {
                if (err) {
                    alert("Error: "+err);
                    return;
                }
                if (this.props.reload) this.props.reload();
                var next=res?res.next:null;
                if (next) {
                    this.props.navigator.push(next);
                }
            }.bind(this));
        }
    }

}

module.exports=FormLayout;
