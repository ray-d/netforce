var React= require("react");
var ui_params=require("../ui_params");
var rpc=require("../rpc");
var dom = require('xmldom').DOMParser;
var xpath = require('xpath');
var Loading=require("./loading")
var classNames = require('classnames');
var FormLayout=require("./form_layout");

var RelatedForm=React.createClass({
    getInitialState() {
        var layout;
        if (this.props.layout) {
            layout=ui_params.get_layout(this.props.layout);
        } else {
            layout=ui_params.find_layout({model:this.props.model,type:"form"});
            if (!layout) throw "Form layout not found for model "+this.props.model;
        }
        var doc=new dom().parseFromString(layout.layout);
        var layout_el=doc.documentElement;
        return {
            active_id: this.props.active_id,
            layout_el: layout_el
        };
    },

    componentDidMount() {
        this.load_data();
    },

    load_data() {
        var field_els=xpath.select(".//field", this.state.layout_el);
        var field_names=[];
        field_els.forEach(function(el) {
            var res=xpath.select("./ancestor::field",el);
            if (res.length>0) return;
            var name=el.getAttribute("name");
            field_names.push(name);
        });
        if (this.state.active_id) {
            rpc.execute(this.props.model,"read",[[this.state.active_id],field_names],{},function(err,res) {
                var data=res[0];
                data._orig_data=Object.assign({},data);
                this.setState({data:data});
            }.bind(this));
        } else {
            var ctx={defaults:{}};
            var f=ui_params.get_field(this.props.model,this.props.relfield);
            if (f.type=="many2one") {
                ctx.defaults[this.props.relfield]=this.props.parent_id;
            } else if (f.type=="reference") {
                ctx.defaults[this.props.relfield]=this.props.parent_model+","+this.props.parent_id;
            }
            rpc.execute(this.props.model,"default_get",[field_names],{context:ctx},function(err,data) {
                this.setState({data:data});
            }.bind(this));
        }
    },

    render() {
        console.log("RelatedForm.render");
        var title;
        var m=ui_params.get_model(this.props.model);
        if (this.state.active_id) {
            title="Edit "+m.string;
        } else {
            title="New "+m.string;
        }
        return <div>
            {function() {
                if (!this.state.message) return;
                return <div className="alert alert-success">
                    <a className="close" data-dismiss="alert" href="#">&times;</a>
                    {this.state.message}
                </div>
            }.bind(this)()}
            {function() {
                if (!this.state.error) return;
                return <div className="alert alert-danger">
                    <a className="close" data-dismiss="alert" href="#">&times;</a>
                    {this.state.error}
                </div>
            }.bind(this)()}
            {function() {
                if (!this.state.data) return <Loading/>;
                return <form className="form-horizontal">
                    <FormLayout model={this.props.model} layout_el={this.state.layout_el} data={this.state.data}/>
                    <div>
                        <button className="btn btn-success" onClick={this.save}>Save</button>
                        <button className="btn btn-default" onClick={this.cancel}>Cancel</button>
                    </div>
                </form>
            }.bind(this)()}
        </div>
    },

    save(e) {
        e.preventDefault();
        var ctx={};
        var vals=this.get_change_vals(this.state.data,this.props.model);
        if (this.state.active_id) {
            rpc.execute(this.props.model,"write",[[this.state.active_id],vals],{context:ctx},function(err) {
                if (err) {
                    this.setState({
                        error: err,
                    });
                    return;
                } 
                this.props.on_save();
            }.bind(this));
        } else {
            rpc.execute(this.props.model,"create",[vals],{context:ctx},function(err,new_id) {
                if (err) {
                    this.setState({
                        error: err,
                    });
                    return;
                } 
                this.setState({
                    active_id: new_id,
                    message: "Changes saved successfully.",
                });
                this.props.on_save();
            }.bind(this));
        }
    },

    cancel(e) {
        e.preventDefault();
        this.props.on_cancel();
    },

    get_change_vals(data,model) {
        console.log("get_change_vals");
        var change={};
        for (var name in data) {
            if (name=="id") continue;
            if (name=="_orig_data") continue;
            var v=data[name];
            var orig_v;
            if (data.id) {
                if (!data._orig_data) throw "Missing _orig_data";
                orig_v=data._orig_data[name];
            } else {
                orig_v=null;
            }
            var f=ui_params.get_field(model,name);
            if (f.type=="char") {
                if (v!=orig_v) change[name]=v;
            } else if (f.type=="text") {
                if (v!=orig_v) change[name]=v;
            } else if (f.type=="integer") {
                if (v!=orig_v) change[name]=v;
            } else if (f.type=="float") {
                if (v!=orig_v) change[name]=v;
            } else if (f.type=="decimal") {
                if (v!=orig_v) change[name]=v;
            } else if (f.type=="boolean") {
                if (v!=orig_v) change[name]=v;
            } else if (f.type=="selection") {
                if (v!=orig_v) change[name]=v;
            } else if (f.type=="many2one") {
                var v1=v?v[0]:null;
                var v2=orig_v?orig_v[0]:null;
                if (v1!=v2) change[name]=v1;
            } else if (f.type=="one2many") {
                if (orig_v==null) orig_v=[];
                var ops=[];
                var new_ids={};
                v.forEach(function(rdata) {
                    if (typeof(rdata)!="object") throw "Invalid O2M data";
                    var rchange=this.get_change_vals(rdata,f.relation);
                    if (Object.keys(rchange).length>0) {
                        if (rdata.id) {
                            ops.push(["write",[rdata.id],rchange]);
                        } else {
                            ops.push(["create",rchange]);
                        }
                    }
                    if (rdata.id) new_ids[rdata.id]=true;
                }.bind(this));
                var del_ids=[];
                orig_v.forEach(function(id) {
                    if (!new_ids[id]) del_ids.push(id);
                }.bind(this));
                if (del_ids.length>0) ops.push(["delete",del_ids]);
                if (ops.length>0) change[name]=ops;
            }
        }
        return change;
    }
});

module.exports=RelatedForm;
