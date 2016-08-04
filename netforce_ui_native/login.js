'use strict';
import React, {
  Component,
} from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  TextInput,
  Picker,
  AsyncStorage,
  View
} from 'react-native';

var rpc=require("./rpc");
var Button=require("./button");
var ui_params=require("./ui_params");

class Login extends Component {
    constructor(props) {
        console.log("Login.constructor");
        super(props);
        this.state = {};
    }

    componentDidMount() {
        console.log("Login.componentDidMount");
        AsyncStorage.getItem("email",function(err,email) {
            if (!email) {
                return;
            }
            console.log("email",email);
            this.setState({email});
        }.bind(this));
    }

    render() {
        console.log("Login.render");
        if (this.state.loading) return <Text>Loading...</Text>
        return <View>
            <Text>
                Email:
            </Text>
            <TextInput style={{height:40, borderColor: 'gray', borderWidth: 1}} value={this.state.email} onChangeText={(email)=>this.setState({email})}/>
            <Text>
                Password:
            </Text>
            <TextInput style={{height:40, borderColor: 'gray', borderWidth: 1}} secureTextEntry={true} value={this.state.password} onChangeText={(password)=>this.setState({password})}/>
            <View style={{paddingTop:5}}>
                <Button onPress={this.login.bind(this)}>
                    <View style={{height:50,backgroundColor:"#37b",alignItems:"center",justifyContent:"center"}}>
                        <Text style={{color:"#fff"}}>Login</Text>
                    </View>
                </Button>
            </View>
            <View style={{paddingTop:5}}>
                <Button onPress={this.click_link.bind(this,{name:"sign_up"})}>
                    <View style={{height:50,backgroundColor:"#ccc",alignItems:"center",justifyContent:"center"}}>
                        <Text style={{color:"#fff"}}>Sign Up</Text>
                    </View>
                </Button>
            </View>
        </View>
    }

    login() {
        try {
            if (!this.state.email) throw "Missing email"; 
            if (!this.state.password) throw "Missing password"; 
        } catch (e) {
            alert("Error: "+e);
            return;
        }
        AsyncStorage.setItem("email",this.state.email);
        rpc.set_base_url("https://auth.netforce.com");
        rpc.execute("auth.user","login",[this.state.email,this.state.password],{},function(err,res) {
          if (err) {
              alert("Error: "+err);
              return;
          }
          var user_id=res.user_id;
          AsyncStorage.setItem("auth_user_id",""+user_id);
          this.props.navigator.push({name:"org_list"});
        }.bind(this));
    }

    click_link(action) {
        this.props.navigator.push(action);
    }
}

module.exports=Login;
