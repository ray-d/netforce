'use strict';
import React, {
  Component,
} from 'react';
import {
  AppRegistry,
  View,
  Text,
  Image,
  Platform,
  AsyncStorage,
  TouchableOpacity,
} from 'react-native';

var Icon = require('react-native-vector-icons/FontAwesome');

class Navbar extends Component {
    render() {
        if (Platform.OS=="ios") {
            var status_height=20;
        } else {
            var status_height=0;
        }
        return <View style={{backgroundColor:"#258",height:50,marginTop:status_height,flexDirection:"row",justifyContent:"space-between"}}>
            <View style={{position:"absolute",left:0,right:0,bottom:0,top:0,alignItems:"center",flexDirection:"row",justifyContent:"center"}}>
                <View style={{flexDirection:"row",alignItems:"center",position:"relative",left:-10}}>
                    <Image source={require('./nf_logo_64.png')} style={{width:24}} resizeMode="contain"/>
                    <Text style={{fontSize:17,letterSpacing:0.5,color:"#eee",textAlign:"center",fontWeight:"500"}}>{this.props.title}</Text>
                </View>
            </View>
            <View style={{alignItems:"center",flexDirection:"row"}}>
                {function() {
                    if (!this.props.navigator || this.props.navigator.getCurrentRoutes().length < 2) return;
                    return <TouchableOpacity onPress={this.go_back.bind(this)} style={{}}>
                        <View style={{}}>
                            <Text style={{color:"#eee",fontSize:17,letterSpacing:0.5,marginLeft:8}}><Icon name="arrow-left" size={16} color="#eee" /> Back</Text>
                        </View>
                    </TouchableOpacity>
                }.bind(this)()}
            </View>
      </View>
    }

    go_back() {
        var routes=this.props.navigator.getCurrentRoutes();
        var route=routes[routes.length-2];
        if (route==null) {
            route={name:"menu"}; // XXX
        }
        route=Object.assign({},route);
        this.props.navigator.replacePrevious(route);
        this.props.navigator.pop();
    }
}

module.exports=Navbar;
