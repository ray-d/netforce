var _=require("underscore");
var rpc=require("./rpc");
var ui_params=require("./ui_params");
var babel=require("babel-standalone");
var React = require("react");

var get_file_name=function(val) {
    var re=/^(.*),(.*?)(\..*)?$/;
    var m=re.exec(val);
    if (!m) return val;
    if (m) {
        var s=m[1];
        if (m[3]) s+=m[3];
    } else {
        s=val;
    }
    return s;
}

module.exports.get_file_name=get_file_name;

module.exports.fmt_field_val=function(val,field) {
    if (field.type=="char") {
        return val||"";
    } else if (field.type=="text") {
        return val||"";
    } else if (field.type=="float") {
        return val==null?"":""+val;
    } else if (field.type=="decimal") {
        return val==null?"":""+val;
    } else if (field.type=="integer") {
        return val==null?"":""+val;
    } else if (field.type=="boolean") {
        return val==null?"":""+val;
    } else if (field.type=="date") {
        return val||"";
    } else if (field.type=="datetime") {
        return val||"";
    } else if (field.type=="selection") {
        if (val!=null) {
            var opt=field.selection.find(function(o) {return o[0]==val});
            str=opt?opt[1]:"";
        } else {
            str="";
        }
        return str;
    } else if (field.type=="file") {
        if (!val) return "";
        var url=rpc.get_file_uri(val);
        var file_str=get_file_name(val);
        if (val.match(/\.png$|\.jpg$|\.jpeg$|\.gif$/i)) {
            return '<img src="'+url+'" style="max-width:80px;max-height:80px"/>';
        } else {
            return '<a href="'+url+'">'+file_str+'</a>';
        }
    } else if (field.type=="many2one") {
        return val?val[1]:"";
    } else if (field.type=="reference") {
        return val?val[1]:"";
    } else if (field.type=="one2many") {
        return JSON.stringify(val);
    } else if (field.type=="many2many") {
        return JSON.stringify(val);
    } else if (field.type=="json") {
        return JSON.stringify(val);
    } else {
        throw "Invalid field type: "+field.type;
    }
}

module.exports.eval_json=function(str,ctx) {
    console.log("eval_json",str,ctx);
    try {
        if (!_.isString(str)) return str;
        var v=new Function("with (this) { return "+str+"; }").call(ctx); // XXX
    } catch (err) {
        throw "Failed to evaluate JSON expression: "+err.message;
    }
    console.log("=> ",v);
    return v;
}

var get_cookies = function() {
    var cookies={};
    var oCrumbles = document.cookie.split(';');
    for(var i=0; i<oCrumbles.length;i++)
    {
        var oPair= oCrumbles[i].split('=');
        var sKey = decodeURIComponent(oPair[0].trim().toLowerCase());
        var sValue = oPair.length>1?oPair[1]:'';
        cookies[sKey]=decodeURIComponent(sValue);
    }
    return cookies;
}
module.exports.get_cookies=get_cookies;

module.exports.get_cookie = function(name) {
    var cookies=get_cookies();
    return cookies[name];
}

function set_cookie(sName,sValue) {
    var oDate = new Date();
    oDate.setYear(oDate.getFullYear()+1);
    var sCookie = encodeURIComponent(sName) + '=' + encodeURIComponent(sValue) + ';expires=' + oDate.toGMTString() + ';path=/';
    document.cookie= sCookie;
}

module.exports.set_cookie = set_cookie;

module.exports.clear_cookie = function(sName) {
    set_cookie(sName,'');
}

module.exports.download_url=function(url) {
    console.log("download_url",url);
    window.location.href=url;
}

module.exports.render_template=function(template_name,data) {
    console.log("render_template",template_name,data);
    var tmpl_jsx=ui_params.get_template(template_name);
    var opts={
        plugins: ["transform-react-jsx"],
    };
    var tmpl_js=babel.transform(tmpl_jsx,opts).code;
    var ctx=Object.assign({React:React},data);
    console.log("tmpl_js",tmpl_js);
    var el=new Function("with (this) { return "+tmpl_js+"; }").call(ctx);
    return el;
}
