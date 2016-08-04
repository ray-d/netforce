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
  AsyncStorage,
  View
} from 'react-native';

var DOMParser = require('xmldom').DOMParser;

var rpc=require("./rpc");
var utils=require("./utils");
var Button=require("./button");
var ui_params=require("./ui_params");

class Menu extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
    }

    render() {
        console.log("Menu.render");
        var layout=ui_params.get_layout(this.props.layout);
        var doc=new DOMParser().parseFromString(layout.layout);
        var root_el=doc.documentElement;
        var items=[];
        for (var i=0; i<root_el.childNodes.length; i++) {
            var el=root_el.childNodes.item(i);
            if (el.nodeType!=1) continue;
            var item={
                string: el.getAttribute("string"),
                action: el.getAttribute("action"),
            };
            items.push(item);
        }
        return <View>
            <View style={{alignItems:"center",padding:10,borderBottomWidth:0.5}}>
                <Text style={{fontWeight:"bold"}}>{root_el.getAttribute("title")}</Text>
            </View>
            <View>
                {items.map(function(item,i) {
                    return <Button onPress={this.press_item.bind(this,item)} key={i}>
                        <View style={{height:50,alignItems:"center",justifyContent:"center",backgroundColor:"#aaa",marginTop:10}}>
                            <Text style={{color:"#fff"}}>{item.string}</Text>
                        </View>
                    </Button>
                }.bind(this))}
            </View>
        </View>
    }

    press_item(item) {
        console.log("press_item",item);
        if (item.action=="_logout") {
            AsyncStorage.removeItem("user_id",function(err) {
                if (err) {
                    alert("Failed to logout");
                    return;
                }
                this.props.navigator.resetTo({name:"login"});
            }.bind(this));
            return;
        }
        this.props.navigator.push({name:"action",action:item.action});
    }
}

module.exports=Menu;
