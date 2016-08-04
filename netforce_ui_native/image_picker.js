'use strict';
import React, {
  Component,
} from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  Navigator,
  NativeModules,
  ListView,
  View
} from 'react-native';

var utils=require("./utils");
var Button=require("./button");
var rpc=require("netforce_ui_native/rpc")
var ImagePickerManager = NativeModules.ImagePickerManager;

class ImagePicker extends Component {
    constructor(props) {
        super(props);
        this.state = {uploading:false};
    }

    componentWillMount() {
        this.take_pic();
    }

    render() {
        if (this.state.uploading) return <Text>Uploading...</Text> 
        return <Text>Selecting picture...</Text>
    }

    take_pic(props) {
        if (!this.props.model) throw "Missing model";
        if (!this.props.image_field) throw "Missing image field";
        if (!this.props.related_field) throw "Missing related field";
        if (!this.props.related_value) throw "Missing related value";
        var options = {
          title: "", // specify null or empty string to remove the title
          cancelButtonTitle: 'Cancel',
          takePhotoButtonTitle: 'Take Photo...', // specify null or empty string to remove this button
          chooseFromLibraryButtonTitle: 'Choose from Library...', // specify null or empty string to remove this button
          //customButtons: {
            //'Choose Photo from Facebook': 'fb', // [Button Text] : [String returned upon selection]
          //},
          //cameraType: 'back', // 'front' or 'back'
          //mediaType: 'photo', // 'photo' or 'video'
          //videoQuality: 'high', // 'low', 'medium', or 'high'
          maxWidth: 1024, // photos only
          maxHeight: 1024, // photos only
          aspectX: 2, // aspectX:aspectY, the cropping image's ratio of width to height
          aspectY: 1, // aspectX:aspectY, the cropping image's ratio of width to height
          quality: 0.2, // photos only
          angle: 0, // photos only
          allowsEditing: false, // Built in functionality to resize/reposition the image
          noData: true, // photos only - disables the base64 `data` field from being generated (greatly improves performance on large photos)
          /*storageOptions: { // if this key is provided, the image will get saved in the documents/pictures directory (rather than a temporary directory)
            skipBackup: true, // image will NOT be backed up to icloud
            path: 'images' // will save image at /Documents/images rather than the root
          }*/
        };
        ImagePickerManager.showImagePicker(options, (response) => {
            console.log('Response = ', response);
            if (response.didCancel) {
                console.log('User cancelled image picker');
            } else if (response.error) {
                alert('ImagePickerManager Error: '+response.error);
            } else if (response.customButton) {
                alert('User tapped custom button: '+response.customButton);
            }
            else {
                // You can display the image using either data:
                //const source = {uri: 'data:image/jpeg;base64,' + response.data, isStatic: true};

                // uri (on iOS)
                //const source = {uri: response.uri.replace('file://', ''), isStatic: true};
                // uri (on android)
                var file = {uri: response.uri, name: "image.jpg", type: "image/jpg"};
                this.setState({uploading:true});
                rpc.upload_file(file,function(err,data) {
                    this.setState({uploading:false});
                    var vals={};
                    vals[this.props.image_field]=data;
                    vals[this.props.related_field]=this.props.related_value;
                    rpc.execute(this.props.model,"create",[vals],{},function(err) {
                        if (err) {
                            alert("ERROR: "+err.message);
                            return;
                        }
                        var routes=this.props.navigator.getCurrentRoutes();
                        var route=routes[routes.length-2];
                        route=Object.assign({},route);
                        this.props.navigator.replacePrevious(route);
                        this.props.navigator.pop();
                    }.bind(this));
                }.bind(this));
            }
        });
    }
}

module.exports=ImagePicker;
