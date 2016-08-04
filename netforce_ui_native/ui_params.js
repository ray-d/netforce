'use strict';
import React, {
  AsyncStorage,
} from 'react-native';

var rpc=require("./rpc");

var _ui_params=null;

module.exports.set_ui_params=function(params) {
    _ui_params=params;
}

var load_ui_params_from_server=function(modules,cb) {
    console.log("load_ui_params_from_server");
    var ctx={mobile_only:true,modules:modules};
    rpc.execute("ui.params","load_ui_params",[],{context:ctx},(err,data)=>{
        if (err) {
            cb(err);
            return;
        }
        _ui_params=data;
        console.log("got UI params");
        AsyncStorage.setItem("ui_params",JSON.stringify(data));
        cb(null);
    });
}

module.exports.load_ui_params_from_server=load_ui_params_from_server;

module.exports.load_ui_params=function(modules,cb) {
    console.log("load_ui_params");
    AsyncStorage.getItem("ui_params",function(err,data) {
        if (err) {
            alert("Error: "+err);
            return;
        }
        if (!data) {
            console.log("ui_params not in local storage");
            load_ui_params_from_server(modules,cb);
            return;
        }
        _ui_params=JSON.parse(data);
        rpc.execute("ui.params","get_version",[],{},(err,data)=>{
            if (err) {
                alert("Error: "+err);
                return;
            }
            if (_ui_params.version_code==data.version_code) {
                console.log("ui_params in local storage, version match");
                cb();
                return;
            }
            console.log("ui_params in local storage, wrong version");
            load_ui_params_from_server(modules,cb);
        });
    });
}

module.exports.get_action=function(name) {
    console.log("get_action",name);
    if (!_ui_params) throw "UI params not loaded";
    if (!name) throw "Missing action name";
    var action=_ui_params.actions[name];
    if (!action) throw "Action not found: "+name;
    return action;
}

module.exports.get_layout=function(name) {
    console.log("get_layout",name);
    if (!_ui_params) throw "UI params not loaded";
    if (!name) throw "Missing layout name";
    var layout=_ui_params.layouts[name];
    if (!layout) throw "Layout not found: "+name;
    return layout;
}

module.exports.find_layout=function(conds) {
    console.log("find_layout",conds);
    if (!_ui_params) throw "UI params not loaded";
    var layouts=_ui_params.layouts;
    var found=null;
    for (var n in layouts) {
        var l=layouts[n];
        if (conds.model && l.model!=conds.model) continue;
        if (conds.type && l.type!=conds.type) continue;
        found=l;
    }
    return found;
}

module.exports.get_model=function(model) {
    console.log("get_model",model);
    if (!_ui_params) throw "UI params not loaded";
    if (!model) throw "Missing model name";
    var m=_ui_params.models[model];
    if (!m) throw "Model not found: "+model;
    return m;
}

module.exports.get_field=function(model,field_name) {
    console.log("get_field",model,field_name);
    if (!_ui_params) throw "UI params not loaded";
    if (!model) throw "Missing model name";
    if (!field_name) throw "Missing field name";
    var m=_ui_params.models[model];
    if (!m) throw "Model not found: "+model;
    var f=m.fields[field_name];
    if (!f) throw "Field not found: "+field_name;
    return f;
}
