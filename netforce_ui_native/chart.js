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
  ScrollView,
  View
} from 'react-native';

var Charts = require('react-native-mpchart');

var DOMParser = require('xmldom').DOMParser;

var rpc=require("./rpc");
var utils=require("./utils");
var Button=require("./button");
var UIParams=require("./ui_params");

class Chart extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
    }

    render() {
        console.log("Chart.render");
        var data1={
            dataSets: [{
                values: [10, 3],
                colors: ["#00FF00","#FF0000"],
            }],
        };
        var data2={
              dataSets:[{
                values: [1,2,3,4,5,6,7],
                colors: ['#00FF00'],
                drawValues: false,
              },{
                values: [4,3,4,2,1,3,1],
                colors: ['#FF0000'],
                drawValues: false,
              }],
              xValues: ["A","B","C","D","E","F","E"],
              highlightEnabled: false,
        };
        return <View style={{flex:1}}>
            {function() {
                if (!this.props.title) return;
                return <View style={{alignItems:"center",padding:10,borderBottomWidth:0.5}}>
                    <Text style={{fontWeight:"bold"}}>{this.props.title}</Text>
                </View>
            }.bind(this)()}
            <Text style={{fontWeight:"bold",textAlign:"center",margin:10}}>On-Time / Late Delivery Ratio</Text>
            <Charts.PieChart style={{flex:1}} data={data1}/>
            <Text style={{fontWeight:"bold",textAlign:"center",margin:10}}>Deliveries Per Day</Text>
            <Charts.BarChart style={{flex:1}} data={data2} xAxis={{position:"bottom"}}/>
        </View>
    }
}

module.exports=Chart;
