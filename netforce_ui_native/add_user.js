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
  TouchableNativeFeedback,
  Navigator,
  AsyncStorage,
  View
} from 'react-native';

var Button=require("netforce_ui_native/button");
var rpc=require("netforce_ui_native/rpc");

class AddUser extends Component {
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
        rpc.execute("auth.org","read_path",[this.props.active_id,fields],{},(err,data)=>{
            this.setState({data});
        });
    }

    render() {
        if (!this.state.data) return <Text>Loading...</Text>;
        return <View>
            <Text>
                Add user to {this.state.data.name}
            </Text>
            <Text>
                Email:
            </Text>
            <TextInput style={{height:40, borderColor: 'gray', borderWidth: 1}} value={this.state.email} onChangeText={(email)=>this.setState({email})}/>
            <View style={{paddingTop:5}}>
                <Button onPress={this.add_user.bind(this)}>
                    <View style={{height:50,backgroundColor:"#37b",alignItems:"center",justifyContent:"center"}}>
                        <Text style={{color:"#fff"}}>Add User</Text>
                    </View>
                </Button>
            </View>
        </View>
    }

    add_user() {
        try {
            if (!this.state.email) throw "Missing email"; 
        } catch (e) {
            alert("Error: "+e);
            return;
        }
        rpc.set_base_url("https://auth.netforce.com");
        rpc.execute("auth.org","add_user",[[this.state.active_id],this.state.email],{},function(err,res) {
            if (err) {
                alert("Error: "+err);
                return;
            }
            this.props.navigator.push({
                name: "view_org",
                active_id: this.state.active_id,
            });
        }.bind(this));
    }
}

module.exports=AddUser;
