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

var Icon = require('react-native-vector-icons/FontAwesome');

class SearchM2O extends Component {
    constructor(props) {
        super(props);
        this.state = {
            query: "",
            dataSource: new ListView.DataSource({
                rowHasChanged: (row1, row2) => row1 !== row2,
            }),
        };
    }

    componentDidMount() {
        this.load_data();
    }

    load_data() {
        console.log("SearchM2O.load_data");
        rpc.execute(this.props.model,"name_search",[this.state.query],{},function(err,data) {
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
            <View style={{marginBottom:10}}>
                <Text>Search {m.string}:</Text>
                <TextInput style={{flex:1,height:40}} onChangeText={this.onchange_query.bind(this)}/>
            </View>
            <View style={{flex:1}}>
                {function() {
                    if (this.state.data==null) {
                        return <Text>Loading...</Text>
                    }
                    if (this.state.data.length==0) return <Text>There are no items to display.</Text>
                    return <ListView dataSource={this.state.dataSource} renderRow={this.render_row.bind(this)}/>
                }.bind(this)()}
            </View>
        </View>
    }

    render_row(obj) {
        return <TouchableOpacity style={{borderBottomWidth:0.5,padding:5,height:40,justifyContent:"center"}} onPress={this.select.bind(this,obj)}>
            <Text>{obj[1]}</Text>
        </TouchableOpacity>
    }

    onchange_query(q) {
        this.setState({query:q});
        this.load_data();
    }

    select(val) {
        this.props.on_select(val);
        this.props.navigator.pop();
    }
}

module.exports=SearchM2O;
