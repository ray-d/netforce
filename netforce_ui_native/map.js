'use strict';
import React, {
  Component,
} from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  Navigator,
  ListView,
  View
} from 'react-native';

var utils=require("./utils");
import MapView from 'react-native-maps';
var Button=require("./button");
var rpc=require("netforce_ui_native/rpc")

class Map extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        this.load_data();
        navigator.geolocation.getCurrentPosition((pos)=>{
            this.setState({position:pos});
        });
        this.watch_id=navigator.geolocation.watchPosition((pos)=>{
            this.setState({position:pos});
        });
    }

    componentWillUnmount() {
        navigator.geolocation.clearWatch(this.watch_id);
    }

    load_data() {
        if (!this.props.model) throw "Missing model in map view";
        if (!this.props.active_id) throw "Missing active_id in map view";
        if (!this.props.coords_field) throw "Missing coords field in map view";
        if (!this.props.title_field) throw "Missing title field in map view";
        if (!this.props.description_field) throw "Missing description field in map view";
        var fields=[this.props.coords_field,this.props.title_field,this.props.description_field];
        rpc.execute(this.props.model,"read",[[this.props.active_id],fields],{},function(err,data) {
            if (err) {
                alert("Error: "+err);
                return;
            }
            this.setState({
                data: data[0],
            });
        }.bind(this));
    }

    render() {
        return <View style={{flex:1}}>
            {function() {
                if (this.state.data==null) return <Text>Loading...</Text>
                var coords=this.state.data[this.props.coords_field];
                if (coords) {
                    var lat=parseFloat(coords.split(",")[0]);
                    var lng=parseFloat(coords.split(",")[1]);
                } else {
                    var lat=13.7563; // XXX
                    var lng=100.5018;
                }
                var title=this.state.data[this.props.title_field];
                var description=this.state.data[this.props.description_field];
                return <View style={{flex:1}}>
                    <MapView 
                        initialRegion={{
                          latitude: lat,
                          longitude: lng,
                          latitudeDelta: 0.0922,
                          longitudeDelta: 0.0421,
                        }}
                      style={{flex:1}}>
                      {function() {
                            if (!this.state.position) return;
                            var coords=this.state.position.coords;
                            return <MapView.Marker coordinate={{latitude:coords.latitude,longitude:coords.longitude}} title="My Location" pinColor="#0cc"/>
                      }.bind(this)()}
                      <MapView.Marker draggable coordinate={{latitude:lat,longitude:lng}} title={title} description={description} onDragEnd={(e) => this.setState({ new_coords: e.nativeEvent.coordinate})}/>
                    </MapView>
                    {function() {
                        if (!this.state.new_coords) return;
                        return <Button onPress={this.save.bind(this)}>
                            <View style={{height:50,backgroundColor:"#37b",alignItems:"center",justifyContent:"center"}}>
                                <Text style={{color:"#fff"}}>Save Changes</Text>
                            </View>
                        </Button>
                    }.bind(this)()}
                </View>
            }.bind(this)()}
        </View>
    }

    save() {
        var vals={};
        vals[this.props.coords_field]= ""+this.state.new_coords.latitude+","+this.state.new_coords.longitude;
        rpc.execute(this.props.model,"write",[[this.props.active_id],vals],{},function(err) {
            if (err) {
                alert("Error: "+err);
                return;
            }
            this.setState({new_coords:null});
        }.bind(this));
    }
}

module.exports=Map;
