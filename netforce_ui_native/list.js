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
  ToolbarAndroid,
  TouchableOpacity,
  Navigator,
  ListView,
  AsyncStorage,
  View
} from 'react-native';

var rpc=require("./rpc");
var xpath = require('xpath');
var dom = require('xmldom').DOMParser;
var UIParams=require("./ui_params");
var utils=require("./utils");
var Button=require("./button");
var ScrollableTabView = require('react-native-scrollable-tab-view');

var Icon = require('react-native-vector-icons/FontAwesome');
var _=require("underscore");

class List extends Component {
    constructor(props) {
        super(props);
        var layout;
        if (this.props.layout) {
            layout=UIParams.get_layout(this.props.layout);
        } else {
            layout=UIParams.find_layout({model:this.props.model,type:"list_mobile"});
            if (!layout) throw "List layout not found for model "+this.props.model;
        }
        var doc=new dom().parseFromString(layout.layout);
        this.layout_el=doc.documentElement;
        if (this.props.tabs) {
            if (_.isString(this.props.tabs)) this.tabs=JSON.parse(this.props.tabs);
            else this.tabs=this.props.tabs;
        }
        this.readonly=this.layout_el.getAttribute("readonly")?true:false;
        this.state = {
            dataSource: new ListView.DataSource({
                rowHasChanged: (row1, row2) => row1 !== row2,
            }),
        };
    }

    componentDidMount() {
        this.load_data();
    }

    load_data() {
        console.log("List.load_data");
        var cond=this.props.condition||[];
        if (this.tabs) {
            var tab_cond=this.tabs[this.state.active_tab||0][1];
            cond.push(tab_cond);
        }
        var field_nodes=xpath.select("//field", this.layout_el);
        var fields=[];
        field_nodes.forEach(function(el) {
            fields.push(el.getAttribute("name"));
        });
        console.log("fields",fields);
        this.setState({data:null});
        rpc.execute(this.props.model,"search_read",[cond,fields],{},function(err,data) {
            if (err) {
                alert("ERROR: "+err);
                return;
            }
            this.setState({
                data: data,
                dataSource: this.state.dataSource.cloneWithRows(data),
            });
        }.bind(this));
    }

    render() {
        var m=UIParams.get_model(this.props.model);
        return <View style={{flex:1}}>
            {function() {
                if (!this.props.title) return;
                return <View style={{alignItems:"center",padding:10,borderBottomWidth:0.5}}>
                    <Text style={{fontWeight:"bold"}}>{this.props.title}</Text>
                </View>
            }.bind(this)()}
            {function() {
                if (this.tabs) {
                    return <ScrollableTabView onChangeTab={this.change_tab.bind(this)} initialPage={this.state.active_tab||0}>
                        {this.tabs.map((t,i)=>{
                            return <View key={i} tabLabel={t[0]}>
                                {function() {
                                    if (this.state.data==null) {
                                        return <Text>Loading...</Text>
                                    }
                                    if (this.state.data.length==0) return <Text>There are no items to display.</Text>
                                    return <ListView dataSource={this.state.dataSource} renderRow={this.render_row.bind(this)} style={{flex:1}}/>
                                }.bind(this)()}
                            </View>
                        })}
                    </ScrollableTabView>
                } else {
                    if (this.state.data==null) {
                        return <Text>Loading...</Text>
                    }
                    if (this.state.data.length==0) return <Text>There are no items to display.</Text>
                    return <ListView dataSource={this.state.dataSource} renderRow={this.render_row.bind(this)} style={{flex:1}}/>
                }
            }.bind(this)()}
            {function() {
                if (this.readonly) return;
                return <View style={{paddingTop:5}}>
                    <Button onPress={this.press_new.bind(this)}>
                        <View style={{height:50,backgroundColor:"#37b",alignItems:"center",justifyContent:"center"}}>
                            <Text style={{color:"#fff"}}><Icon name="plus" size={16} color="#eee"/> New {m.string}</Text>
                        </View>
                    </Button>
                </View>
            }.bind(this)()}
        </View>
    }

    change_tab(tab) {
        this.setState({active_tab:tab.i},function() {
            this.load_data();
        });
    }

    render_row(obj) {
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
                var f=UIParams.get_field(this.props.model,name);
                var invisible=el.getAttribute("invisible");
                if (invisible) return;
                var val=obj[name];
                var val_str=utils.field_val_to_str(val,f);
                var col=<View key={cols.length} style={{flexDirection:"row"}}>
                    <Text style={{fontWeight:"bold",marginRight:5}}>{f.string}:</Text><Text>{val_str}</Text>
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
        return <TouchableOpacity style={{borderBottomWidth:0.5,padding:5}} onPress={this.press_item.bind(this,obj.id)}>
            {rows}
        </TouchableOpacity>
    }

    press_item(active_id) {
        var action={
            view: "form_mobile",
            model: this.props.model,
            active_id: active_id,
            context: this.props.context,
        }
        if (this.props.form_layout) action.layout=this.props.form_layout;
        this.props.navigator.push({name:"action",action:action});
    }

    press_new() {
        var action={
            view: "form_mobile",
            model: this.props.model,
            context: this.props.context,
        }
        if (this.props.form_layout) action.layout=this.props.form_layout;
        this.props.navigator.push({name:"action",action:action});
    }
}

module.exports=List;
