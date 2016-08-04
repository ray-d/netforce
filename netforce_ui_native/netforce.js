'use strict';
import React, {
  Component,
} from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  TextInput,
  TouchableNativeFeedback,
  TouchableHighlight,
  Navigator,
  StatusBar,
  Platform,
  BackAndroid,
  AsyncStorage,
  View
} from 'react-native';

var NavBar=require("./navbar");
var Login=require("./login");
var SignUp=require("./sign_up");
var OrgList=require("./org_list");
var AddOrg=require("./add_org");
var ViewOrg=require("./view_org");
var AddUser=require("./add_user");
var Menu=require("./menu");
var List=require("./list");
var Form=require("./form");
var Page=require("./page");
var SearchM2O=require("./search_m2o");
var FormO2M=require("./form_o2m");
var UIParams=require("./ui_params");

var _nav;

class Netforce extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        AsyncStorage.getItem("auth_user_id",function(err,res) {
            if (!res) return;
            var auth_user_id=parseInt(res);
            _nav.push({name:"org_list"});
        }.bind(this));
    }

    render() {
        console.log("Netforce.render");
        return <Navigator renderScene={this.render_scene.bind(this)}/>
    }

    render_scene(route,navigator) {
        console.log("Netforce.render_scene",route);
        _nav=navigator;
        return <View style={{ flex: 1, }}>
            <NavBar navigator={navigator} title="Netforce"/>
            {function() {
                if (!route) route={name:"login"};
                if (route.name=="login") {
                    return <Login navigator={navigator}/>
                } else if (route.name=="sign_up") {
                    return <SignUp navigator={navigator}/>
                } else if (route.name=="org_list") {
                    return <OrgList navigator={navigator}/>
                } else if (route.name=="add_org") {
                    return <AddOrg navigator={navigator}/>
                } else if (route.name=="view_org") {
                    return <ViewOrg navigator={navigator} org_id={route.org_id}/>
                } else if (route.name=="add_user") {
                    return <AddUser navigator={navigator} org_id={route.org_id}/>
                } else if (route.name=="action") {
                    var action;
                    if (typeof(route.action)=="object") {
                        action=route.action;
                    } else if (typeof(route.action)=="string") {
                        action=UIParams.get_action(route.action);
                    } else {
                        throw "Invalid action";
                    }
                    if (action.view=="menu_mobile") {
                        return <Menu navigator={navigator} layout={action.layout}/>
                    } else if (action.view=="list_mobile") {
                        return <List navigator={navigator} model={action.model} title={action.title} layout={action.layout} form_layout={action.form_layout} context={action.context} tabs={action.tabs}/>
                    } else if (action.view=="form_mobile") {
                        return <Form navigator={navigator} model={action.model} layout={action.layout} active_id={action.active_id} context={action.context}/>
                    } else if (action.view=="page_mobile") {
                        return <Page navigator={navigator} model={action.model} layout={action.layout} active_id={action.active_id}/>
                    } else {
                        alert("Invalid view type: "+action.view);
                    }
                } else if (route.name=="search_m2o") {
                    return <SearchM2O navigator={navigator} model={route.model} on_select={route.on_select}/>
                } else if (route.name=="form_o2m") {
                    return <FormO2M navigator={navigator} model={route.model} layout_el={route.layout_el} on_save={route.on_save} on_delete={route.on_delete} data={route.data} index={route.index}/>
                } else {
                    alert("Invalid route: "+route.name);
                }
            }.bind(this)()}
        </View>
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
  button: {
      borderWidth: 1,
      borderStyle: "solid",
      padding: 10,
  },
  fieldLabel: {
      color: "#333",
  },
});

if (Platform.OS=="android") {
    BackAndroid.addEventListener('hardwareBackPress', function() {
        if (_nav && _nav.getCurrentRoutes().length > 1) {
            _nav.pop();
            return true;
        }
        return false;
    });
}

module.exports=Netforce;
