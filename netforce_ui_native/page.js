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
  ListView,
  Image,
  ScrollView,
  View
} from 'react-native';

var rpc=require("./rpc");
var utils=require("./utils");
var ImagePickerManager = require('NativeModules').ImagePickerManager;
var Button=require("./button");

class Page extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        this.load_data();
    }

    load_data() {
        var fields=["date","actual_hours","bill_hours","description","state"];
        rpc.execute("nf.time","read_path",[[this.props.active_id],fields],{},function(err,data) {
            if (err) {
                alert("Failed to read data: "+err);
                return;
            }
            this.setState({
                data: data[0],
            });
        }.bind(this));
    }

  render() {
    console.log("TimeDetails.render");
    return <View style={{flex:1}}>
        <ScrollView style={{flex:1}}>
            {function() {
                if (this.state.data==null) return <Text>Loading...</Text>
                return <View>
                    <View style={{flexDirection:"row"}}>
                        <View style={{flex:1}}>
                            <Text style={styles.fieldLabel}>Date:</Text>
                            <Text>{this.state.data.date}</Text>
                        </View>
                        <View style={{flex:1}}>
                            <Text style={styles.fieldLabel}>Status</Text>
                            <Text>{this.state.data.state}</Text>
                        </View>
                    </View>
                    <View style={{flexDirection:"row"}}>
                        <View style={{flex:1}}>
                            <Text style={styles.fieldLabel}>Actual Hours:</Text>
                            <Text>{this.state.data.actual_hours}</Text>
                        </View>
                        <View style={{flex:1}}>
                            <Text style={styles.fieldLabel}>Bill Hours:</Text>
                            <Text>{this.state.data.bill_hours}</Text>
                        </View>
                    </View>
                    <View style={{flexDirection:"row"}}>
                        <View style={{flex:1}}>
                            <Text style={styles.fieldLabel}>Description:</Text>
                            <Text>{this.state.data.description}</Text>
                        </View>
                    </View>
                    <View style={{paddingTop:5}}>
                        <Button>
                            <View style={{height:50,backgroundColor:"#aaa",alignItems:"center",justifyContent:"center"}}>
                                <Text style={{color:"#fff"}}>Save</Text>
                            </View>
                        </Button>
                    </View>
                </View>
            }.bind(this)()}
        </ScrollView>
    </View>
  }

  click_link(action) {
      this.props.navigator.push(action);
  }
}

const styles = StyleSheet.create({
  fieldLabel: {
      color: "#333",
      fontWeight: "bold",
  },
});

module.exports=Page;
