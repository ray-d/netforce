/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */
'use strict';
import React, {
  Component,
} from 'react';
import React, {
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

class AddOrg extends Component {
    constructor(props) {
        super(props);
        this.state = {login:"",password:""};
    }

    componentDidMount() {
        AsyncStorage.getItem("auth_user_id",function(err,res) {
            if (!res) return;
            var auth_user_id=parseInt(res);
            this.setState({auth_user_id});
        }.bind(this));
    }

    render() {
        return <View>
            <Text>
                Organization Name:
            </Text>
            <TextInput style={{height:40, borderColor: 'gray', borderWidth: 1}} value={this.state.org_name} onChangeText={(org_name)=>this.setState({org_name})}/>
            <View style={{paddingTop:5}}>
                <Button onPress={this.add_org.bind(this)}>
                    <View style={{height:50,backgroundColor:"#37b",alignItems:"center",justifyContent:"center"}}>
                        <Text style={{color:"#fff"}}>{this.state.processing?"Processing...":"Add Organization"}</Text>
                    </View>
                </Button>
            </View>
        </View>
    }

    add_org() {
        if (this.state.processing) return;
        try {
            if (!this.state.org_name) throw "Missing organization name"; 
        } catch (e) {
            alert("Error: "+e);
            return;
        }
        rpc.set_base_url("https://auth.netforce.com");
        var ctx={
            user_id: this.state.auth_user_id,
        }
        this.setState({processing:true});
        rpc.execute("auth.org","add_org",[this.state.org_name],{context:ctx},function(err,res) {
            this.setState({processing:false});
            if (err) {
                alert("Error: "+err);
                return;
            }
            var org_id=res.org_id;
            this.props.navigator.push({
                name: "org_list",
            });
        }.bind(this));
    }
}

module.exports=AddOrg;
