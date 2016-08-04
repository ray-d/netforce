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

class SignUp extends Component {
    constructor(props) {
        super(props);
        this.state = {login:"",password:""};
    }

    render() {
        return <View>
            <Text>
                Email:
            </Text>
            <TextInput style={{height:40, borderColor: 'gray', borderWidth: 1}} value={this.state.email} onChangeText={(email)=>this.setState({email})}/>
            <Text>
                First Name:
            </Text>
            <TextInput style={{height:40, borderColor: 'gray', borderWidth: 1}} value={this.state.first_name} onChangeText={(first_name)=>this.setState({first_name})}/>
            <Text>
                Last Name:
            </Text>
            <TextInput style={{height:40, borderColor: 'gray', borderWidth: 1}} value={this.state.last_name} onChangeText={(last_name)=>this.setState({last_name})}/>
            <Text>
                Password:
            </Text>
            <TextInput style={{height:40, borderColor: 'gray', borderWidth: 1}} secureTextEntry={true} value={this.state.password} onChangeText={(password)=>this.setState({password})}/>
            <Text>
                Confirm Password:
            </Text>
            <TextInput style={{height:40, borderColor: 'gray', borderWidth: 1}} secureTextEntry={true} value={this.state.confirm_password} onChangeText={(confirm_password)=>this.setState({confirm_password})}/>
            <View style={{paddingTop:5}}>
                <Button onPress={this.sign_up.bind(this)}>
                    <View style={{height:50,backgroundColor:"#37b",alignItems:"center",justifyContent:"center"}}>
                        <Text style={{color:"#fff"}}>Sign Up</Text>
                    </View>
                </Button>
            </View>
        </View>
    }

    sign_up() {
      try {
        if (!this.state.email) throw "Missing email"; 
        if (!this.state.first_name) throw "Missing first name"; 
        if (!this.state.password) throw "Missing password"; 
        if (this.state.confirm_password!=this.state.password) throw "Passwords not the same"; 
      } catch (e) {
          alert("Error: "+e);
          return;
      }
      var vals={
          email: this.state.email,
          first_name: this.state.first_name,
          last_name: this.state.last_name,
          password: this.state.password,
      }
      rpc.set_base_url("https://auth.netforce.com");
      rpc.execute("auth.user","sign_up",[vals],{},function(err,res) {
          if (err) {
              alert("Error: "+err);
              return;
          }
          AsyncStorage.setItem("auth_user_id",""+res.user_id);
          AsyncStorage.setItem("first_name",this.state.first_name);
          this.props.navigator.push({
              name: "org_list",
          });
      }.bind(this));
    }
}

module.exports=SignUp;
