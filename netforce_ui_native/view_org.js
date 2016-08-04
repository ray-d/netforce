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
  AsyncStorage,
  View
} from 'react-native';

var Icon = require('react-native-vector-icons/FontAwesome');

var Button=require("netforce_ui_native/button");
var rpc=require("netforce_ui_native/rpc");

class ViewOrg extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        this.load_data();
    }

    load_data() {
        rpc.set_base_url("https://auth.netforce.com");
        var fields=["name","users.email","users.first_name","users.last_name"];
        rpc.execute("auth.org","read_path",[[this.props.org_id],fields],{},(err,res)=>{
            if (err) {
                alert("Error: "+err);
                return;
            }
            this.setState({data:res[0]});
        });
    }

    render() {
        if (!this.state.data) return <Text>Loading...</Text> 
        return <View>
            <Text>Organization Name:</Text>
            <Text>{this.state.data.name}</Text>
            <Text>Users:</Text>
            {this.state.data.users.map((obj)=>{
                return <View key={obj.id} style={{flexDirection:"row",borderBottomWidth:0.5,padding:5}}>
                    <View style={{flex:1}}>
                        <Text>{obj.first_name} {obj.last_name}</Text>
                        <Text>{obj.email}</Text>
                    </View>
                    <View style={{width:20}}>
                        <TouchableOpacity onPress={this.remove_user.bind(this,obj.id)}>
                            <Icon name="remove" size={16} color="#333"/>
                        </TouchableOpacity>
                    </View>
                </View>
            })}
            <View style={{paddingTop:5}}>
                <Button onPress={this.add_user.bind(this)}>
                    <View style={{height:50,backgroundColor:"#37b",alignItems:"center",justifyContent:"center"}}>
                        <Text style={{color:"#fff"}}>
                            <Icon name="plus" size={16} color="#eee"/>
                            Add User
                        </Text>
                    </View>
                </Button>
            </View>
        </View>
    }

    add_user() {
    }

    remove_user(user_id) {
        rpc.set_base_url("https://auth.netforce.com");
        rpc.execute("auth.org","remove_user",[[this.props.org_id],user_id],{},function(err,res) {
            if (err) {
                alert("Error: "+err);
                return;
            }
            this.load_data();
        }.bind(this));
    }
}

module.exports=ViewOrg;
