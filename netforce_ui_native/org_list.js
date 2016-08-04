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
  TouchableOpacity,
  AsyncStorage,
  View
} from 'react-native';

var rpc=require("./rpc");
var Button=require("./button");
var Icon = require('react-native-vector-icons/FontAwesome');
var ui_params=require("./ui_params");

class OrgList extends Component {
    constructor(props) {
        console.log("OrgList.constructor");
        super(props);
        this.state = {};
    }

    componentDidMount() {
        console.log("OrgList.componentDidMount");
        this.load_data();
    }

    load_data() {
        rpc.set_base_url("https://auth.netforce.com");
        AsyncStorage.getItem("auth_user_id",function(err,res) {
            if (!res) return;
            var auth_user_id=parseInt(res);
            var cond=[["users.id","=",auth_user_id]];
            var fields=["name","hostname","port","protocol","database","schema"];
            rpc.execute("auth.org","search_read",[cond,fields],{},(err,data)=>{
                if (err) {
                    alert("Error: "+err);
                    return;
                }
                this.setState({data:data});
            });
        }.bind(this));
    }

    render() {
        console.log("OrgList.render");
        if (!this.state.data) return <Text>Loading...</Text>;
        if (this.state.load_params) return <Text>Connecting to organization...</Text>
        return <View style={{flex:1}}>
            <View style={{flex:1}}>
                {function() {
                    if (this.state.data.length==0) return <Text style={{margin:10}}>Your user does not belong to any organizations yet.</Text>
                    return <View>
                        {this.state.data.map(function(obj,i) {
                            return <View key={i} style={{height:50,justifyContent:"center",flexDirection:"row",borderBottomWidth:0.5,padding:5}}>
                                <View style={{flex:1,justifyContent:"center"}}>
                                    <Button onPress={this.login.bind(this,obj)}>
                                        <View>
                                            <Text>{obj.name}</Text>
                                        </View>
                                    </Button>
                                </View>
                                <View style={{width:20,justifyContent:"center"}}>
                                    <TouchableOpacity onPress={this.view_org.bind(this,obj.id)}>
                                        <Icon name="cog" size={16} color="#333"/>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        }.bind(this))}
                    </View>
                }.bind(this)()}
            </View>
            <View style={{paddingTop:5}}>
                <Button onPress={this.add_org.bind(this)}>
                    <View style={{height:50,backgroundColor:"#37b",alignItems:"center",justifyContent:"center"}}>
                        <Text style={{color:"#fff"}}>
                            <Icon name="plus" size={16} color="#eee"/>
                            Add Organization
                        </Text>
                    </View>
                </Button>
            </View>
        </View>
    }

    add_org() {
        this.props.navigator.push({name:"add_org"});
    }

    login(org_data) {
        var url="";
        if (!org_data.protocol) throw "Missing protocol";
        if (org_data.protocol=="http") url+="http://"
        else if (org_data.protocol=="https") url+="https://"
        if (!org_data.hostname) throw "Missing hostname";
        url+=org_data.hostname
        //url+=":"+org_data.port; // XXX: check why port not working
        rpc.set_base_url(url);
        if (!org_data.database) throw "Missing database";
        rpc.set_database(org_data.database)
        rpc.set_schema(org_data.schema)
        this.setState({load_params:true});
        ui_params.load_ui_params(null,(err)=>{
            this.setState({load_params:false});
            if (err) {
                alert("Error: "+err);
                return;
            }
            this.props.navigator.push({name:"action",action:"main_menu_mobile"});
        });
    }

    view_org(id) {
        this.props.navigator.push({name:"view_org",org_id:id});
    }

    logout() {
        AsyncStorage.removeItem("auth_user_id");
        this.props.navigator.replace({name:"login"});
    }
}

module.exports=OrgList;
