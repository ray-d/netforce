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
  Text,
  Image,
  TouchableOpacity,
  ListView,
  View
} from 'react-native';

var rpc=require("./rpc");
var xpath = require('xpath');
var dom = require('xmldom').DOMParser;
var ui_params=require("./ui_params");
var utils=require("./utils");
var Button=require("./button");
var Icon = require('react-native-vector-icons/FontAwesome');

class FieldOne2Many extends Component {
    constructor(props) {
        super(props);
        if (this.props.list_layout_el) {
            this.layout_el=this.props.list_layout_el;
        } else {
            var f=ui_params.get_field(this.props.model,this.props.name);
            var layout=ui_params.find_layout({model:f.relation,type:"list_mobile"});
            if (!layout) throw "List layout not found for model "+f.relation;
            var doc=new dom().parseFromString(layout.layout);
            this.layout_el=doc.documentElement;
        }
        this.state = {};
    }

    componentDidMount() {
        this.load_data();
    }

    load_data() {
        console.log("FieldOne2Many.load_data");
        var field_nodes=xpath.select("field", this.layout_el);
        var fields=[];
        field_nodes.forEach(function(el) {
            fields.push(el.getAttribute("name"));
        });
        var ids=this.props.data[this.props.name];
        var f=ui_params.get_field(this.props.model,this.props.name);
        //alert("fields "+JSON.stringify(fields));
        rpc.execute(f.relation,"read",[ids,fields],{},function(err,data) {
            if (err) {
                alert("ERROR: "+err);
                return;
            }
            data.forEach(function(obj) {
                obj._orig_data=Object.assign({},obj);
            }.bind(this));
            this.setState({
                data: data,
            });
            this.props.data[this.props.name]=data;
        }.bind(this));
    }

    render() {
        if (!this.state.data) return <Text>Loading...</Text>;
        var f=ui_params.get_field(this.props.model,this.props.name);
        var mr=ui_params.get_model(f.relation);
        return <View style={{borderTopWidth:0.5,borderBottomWidth:0.5}}>
            {function() {
                if (this.state.data.length==0) return <Text>There are no items to display.</Text>
                return <View>
                    {this.state.data.map(this.render_row.bind(this))}
                </View>
            }.bind(this)()}
            {function() {
                if (this.props.readonly) return;
                return <View style={{paddingTop:0}}>
                    <Button onPress={this.press_add.bind(this)}>
                        <View style={{height:50,backgroundColor:"#aaa",alignItems:"center",justifyContent:"center"}}>
                            <Text style={{color:"#fff"}}><Icon name="plus" size={16} color="#eee"/> Add {mr.string}</Text>
                        </View>
                    </Button>
                </View>
            }.bind(this)()}
        </View>
    }

    render_row(obj,index) {
        var f=ui_params.get_field(this.props.model,this.props.name);
        var relation=f.relation;
        var child_els=xpath.select("child::*", this.layout_el);
        var cols=[];
        var rows=[];
        {child_els.forEach(function(el,i) {
            if (el.tagName=="newline") {
                rows.push(<View style={{flexDirection:"row", justifyContent: "space-between"}} key={rows.length}>{cols}</View>);
                cols=[];
                return;
            } else if (el.tagName=="field") {
                var name=el.getAttribute("name");
                var f=ui_params.get_field(relation,name);
                var invisible=el.getAttribute("invisible");
                if (invisible) return;
                var val=obj[name];
                var col=<View key={cols.length} style={{flexDirection:"row"}}>
                    {function() {
                        if (el.getAttribute("image")) {
                            var uri=rpc.get_file_uri(val);
                            return <Image style={{width:100,height:100,resizeMode:"contain"}} source={{uri:uri}}/>
                        } else {
                            var val_str=utils.field_val_to_str(val,f);
                            return <View><Text style={{fontWeight:"bold",marginRight:5}}>{f.string}:</Text><Text>{val_str}</Text></View>
                        }
                    }.bind(this)()}
                </View>;
                cols.push(col);
            } else if (el.tagName=="text") {
                var tmpl=el.childNodes[0].nodeValue;
                var str=tmpl.replace(/\{(.*?)\}/g,function(a,b) {
                    var val_str=""+obj[b];
                    return val_str;
                }.bind(this));
                var col=<Text key={cols.length}>{str}</Text>;
                cols.push(col);
            } else {
                throw "Invalid tag name: "+el.tagName;
            }
        }.bind(this))}
        rows.push(<View style={{flexDirection:"row", justifyContent: "space-between"}} key={rows.length}>{cols}</View>);
        return <TouchableOpacity style={{borderBottomWidth:0.5,padding:5}} onPress={this.press_item.bind(this,index)} key={index}>
            {rows}
        </TouchableOpacity>
    }

    press_item(index) {
        var f=ui_params.get_field(this.props.model,this.props.name);
        var item_data=this.state.data[index];
        if (this.props.link) { // XXX
            var action={
                view: "form_mobile",
                model: f.relation,
                active_id: item_data.id,
                context: this.props.context,
            }
            var route={
                name: "action",
                action: action,
            }
        } else {
            var route={
                name: "form_o2m",
                model: f.relation,
                layout_el: this.props.form_layout_el,
                on_save:this.on_save.bind(this),
                on_delete:this.on_delete.bind(this),
                data:item_data,
                index:index,
                readonly:this.props.readonly,
                context: this.props.context,
            };
        }
        this.props.navigator.push(route);
    }

    press_add() {
        var f=ui_params.get_field(this.props.model,this.props.name);
        this.props.navigator.push({name:"form_o2m",model:f.relation,layout_el:this.props.form_layout_el,on_save:this.on_save.bind(this)});
    }

    on_save(index,item_data) {
        var data=this.state.data;
        if (index!=null) {
            data[index]=item_data;
        } else {
            data.push(item_data);
        }
        this.setState({data:data});
    }

    on_delete(index) {
        var data=this.state.data;
        data.splice(index,1);
        this.setState({data:data});
    }

    onchange(val) {
        this.setState({value:val});
        this.props.data[this.props.name]=val;
    }
}

module.exports=FieldOne2Many;
