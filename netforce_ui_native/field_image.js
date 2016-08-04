'use strict';
import React, {
  Component,
} from 'react';
import {
  AppRegistry,
  StyleSheet,
  TextInput,
  NativeModules,
  Image,
  Text,
  View
} from 'react-native';

var utils=require("./utils");
var rpc=require("./rpc");
var Icon = require('react-native-vector-icons/FontAwesome');
var Button=require("./button");
var ImagePickerManager = NativeModules.ImagePickerManager;

class FieldImage extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        var val=this.props.data[this.props.name];
        this.setState({value:val});
    }

    load_data() {
    }

    render() {
        var val=this.state.value;
        return <View style={{alignItems:"center"}}>
            {function() {
                if (this.state.uploading) return <Text>Uploading...</Text>;
                if (val) {
                    var uri=rpc.get_file_uri(val);
                    return <Image style={{width:200,height:200,resizeMode:"contain"}} source={{uri:uri}}/>
                }
            }.bind(this)()}
            <View style={{width:50,margin:10}}>
                <Button onPress={this.take_picture.bind(this)}>
                    <View style={{height:50,backgroundColor:"#aaa",alignItems:"center",justifyContent:"center"}}>
                        <Icon name="camera" size={16} color="#eee"/>
                    </View>
                </Button>
            </View>
        </View>
    }

    take_picture(props) {
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
                rpc.upload_file(file,function(err,filename) {
                    this.setState({uploading:false,value:filename});
                    this.props.data[this.props.name]=filename;
                }.bind(this));
            }
        });
    }
}

module.exports=FieldImage;
