var React= require("react");
var ui_params=require("../ui_params");
var rpc=require("../rpc");
var dom = require('xmldom').DOMParser;
var xpath = require('xpath');
var Loading=require("./loading")
var classNames = require('classnames');
var FormLayout=require("./form_layout");
var RelatedO2M=require("./related_o2m");
var views=require("../views");
var Button=require("./button")

var Form=React.createClass({
    propTypes: {
        title: React.PropTypes.string,
        model: React.PropTypes.string,
        active_id: React.PropTypes.number,
    },

    contextTypes: {
        action_view: React.PropTypes.object,
    },

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
        this.setState({data:null});
        var field_els=xpath.select(".//field", this.state.layout_el);
        var field_names=[];
        field_els.forEach(function(el) {
            var res=xpath.select("./ancestor::field",el);
            if (res.length>0) return;
            var res=xpath.select("./ancestor::related",el);
            if (res.length>0) return;
            var name=el.getAttribute("name");
            field_names.push(name);
        });
        var ctx={};
        if (this.state.active_id) {
            rpc.execute(this.props.model,"read",[[this.state.active_id],field_names],{context:ctx},function(err,res) {
                if (err) throw err;
                var data=res[0];
                data._orig_data=Object.assign({},data);
                this.setState({data:data});
                var cond=[];
                rpc.execute(this.props.model,"search",[cond],{limit:100,context:ctx},function(err,res) {
                    if (err) throw err;
                    this.setState({
                        record_ids: res,
                        num_records: res.length,
                        record_index: res.indexOf(this.state.active_id),
                    });
                }.bind(this));
            }.bind(this));
        } else {
            rpc.execute(this.props.model,"default_get",[field_names],{context:ctx},function(err,data) {
                this.setState({data:data});
            }.bind(this));
        }
    },

    render() {
        console.log("Form.render");
        var m=ui_params.get_model(this.props.model);
        var title;
        if (this.props.title) {
            title=this.props.title;
        } else {
            if (this.state.active_id) {
                title="Edit "+m.string;
            } else {
                title="New "+m.string;
            }
        }
        return <div style={{marginTop:20}}>
            {function() {
                if (!this.props.bread_title) return;
                return <ol className="breadcrumb">
                    <li><a href="#" onClick={this.on_bread}>{this.props.bread_title}</a></li>
                    {function() {
                        if (!this.state.num_records) return;
                        return <div className="pull-right">
                            {function() {
                                if (this.state.record_index<=0) return;
                                return <a href="#" style={{margin:3}} onClick={this.click_start}>&laquo; Start</a>
                            }.bind(this)()}
                            {function() {
                                if (this.state.record_index<=0) return;
                                return <a href="#" style={{margin:3}} onClick={this.click_prev}>&lsaquo; Prev</a>
                            }.bind(this)()}
                            <span style={{margin:5}}>{this.state.record_index+1} / {this.state.num_records}</span>
                            {function() {
                                if (this.state.record_index>=this.state.num_records-1) return;
                                return <a href="#" style={{margin:3}} onClick={this.click_next}>Next &rsaquo;</a>
                            }.bind(this)()}
                            {function() {
                                if (this.state.record_index>=this.state.num_records-1) return;
                                return <a href="#" style={{margin:3}} onClick={this.click_end}>End &raquo;</a>
                            }.bind(this)()}
                        </div>
                    }.bind(this)()}
                </ol>
            }.bind(this)()}
            <div className="page-header nf-page-header">
                <h1>{title}</h1>
            </div>
            {function() {
                if (!this.state.alert_msg) return;
                return <div className={"alert alert-"+this.state.alert_type}>
                    <a className="close" data-dismiss="alert" href="#">&times;</a>
                    {this.state.alert_msg}
                </div>
            }.bind(this)()}
            {function() {
                if (!this.state.data) return <Loading/>;
                return <form className="form-horizontal nf-form">
                    <div className="nf-form-body">
                        <FormLayout model={this.props.model} layout_el={this.state.layout_el} data={this.state.data}/>
                    </div>
                    <div className="nf-form-foot">
                        <Button string="Save" type="primary" size="lg" on_click={this.save}/>
                        {function() {
                            var res=xpath.select("foot",this.state.layout_el);
                            if (res.length==0) return;
                            var foot_el=res[0];
                            var child_els=xpath.select("child::*", foot_el);
                            return child_els.map(function(el,i) {
                                    if (el.tagName=="button") {
                                        var string=el.getAttribute("string");
                                        var method=el.getAttribute("method");
                                        return <Button string={el.getAttribute("string")} type={el.getAttribute("type")} size="lg" icon={el.getAttribute("icon")} on_click={this.btn_click.bind(this,el)}/>
                                    }
                                }.bind(this));
                        }.bind(this)()}
                    </div>
                </form>
            }.bind(this)()}
            {function() {
                if (!this.state.active_id) return;
                var res=xpath.select("related",this.state.layout_el);
                if (res.length==0) return;
                var related_el=res[0];
                var child_els=xpath.select("child::*", related_el);
                return <div>
                    {child_els.map(function(el,i) {
                        if (el.tagName=="field") {
                            var name=el.getAttribute("name");
                            return <RelatedO2M key={i} model={this.props.model} active_id={this.state.active_id} name={name}/>
                        } else if (el.tagName=="view") {
                            var name=el.getAttribute("name");
                            var view_class=views.get_view(name);
                            var props={
                                model: this.props.model,
                                active_id: this.state.active_id,
                            };
                            var el=React.createElement(view_class,props);
                            return el;
                        }
                    }.bind(this))}
                </div>
            }.bind(this)()}
        </div>
    },

    on_bread(e) {
        e.preventDefault();
        if (this.props.on_bread) {
            this.props.on_bread();
        }
    },

    click_prev(e) {
        e.preventDefault();
        if (this.state.record_index<=0) return;
        var active_id=this.state.record_ids[this.state.record_index-1];
        this.setState({active_id:active_id});
        this.load_data();
        var action=this.context.action_view.get_action();
        action.active_id=active_id;
        this.context.action_view.update_history(action);
    },

    click_next(e) {
        e.preventDefault();
        if (this.state.record_index>=this.state.num_records-1) return;
        var active_id=this.state.record_ids[this.state.record_index+1];
        this.setState({active_id:active_id});
        this.load_data();
        var action=this.context.action_view.get_action();
        action.active_id=active_id;
        this.context.action_view.update_history(action);
    },

    click_start(e) {
        e.preventDefault();
        var active_id=this.state.record_ids[0];
        this.setState({active_id:active_id});
        this.load_data();
        var action=this.context.action_view.get_action();
        action.active_id=active_id;
        this.context.action_view.update_history(action);
    },

    click_end(e) {
        e.preventDefault();
        var active_id=this.state.record_ids[this.state.record_ids.length-1];
        this.setState({active_id:active_id});
        this.load_data();
        var action=this.context.action_view.get_action();
        action.active_id=active_id;
        this.context.action_view.update_history(action);
    },

    save(cb) {
        var ctx={};
        var vals=this.get_change_vals(this.state.data,this.props.model);
        if (this.state.active_id) {
            rpc.execute(this.props.model,"write",[[this.state.active_id],vals],{context:ctx},function(err) {
                if (err) {
                    this.setState({alert_msg:err,alert_type:"danger"});
                    return;
                } 
                this.setState({alert_msg: "Changes saved successfully.",alert_type:"success"});
                this.load_data();
                if (cb) cb();
            }.bind(this));
        } else {
            rpc.execute(this.props.model,"create",[vals],{context:ctx},function(err,new_id) {
                if (err) {
                    this.setState({alert_msg:err,alert_type:"danger"});
                    return;
                } 
                this.setState({
                    active_id: new_id,
                    alert_msg: "Changes saved successfully.",
                    alert_type: "success",
                });
                this.load_data();
                if (cb) cb();
            }.bind(this));
        }
    },

    get_change_vals(data,model) {
        console.log("Form.get_change_vals",data,model);
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
            } else if (f.type=="boolean") {
                if (v!=orig_v) change[name]=v;
            } else if (f.type=="integer") {
                if (v!=orig_v) change[name]=v;
            } else if (f.type=="float") {
                if (v!=orig_v) change[name]=v;
            } else if (f.type=="decimal") {
                if (v!=orig_v) change[name]=v;
            } else if (f.type=="selection") {
                if (v!=orig_v) change[name]=v;
            } else if (f.type=="date") {
                if (v!=orig_v) change[name]=v;
            } else if (f.type=="datetime") {
                if (v!=orig_v) change[name]=v;
            } else if (f.type=="file") {
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
            } else if (f.type=="many2many") {
                var ids=v;
                change[name]=[["set",ids||[]]] // TODO: only change
            } else {
                throw "Invalid field type: "+f.type;
            }
        }
        console.log("change",change);
        return change;
    },

    btn_click(el,cb) {
        var method=el.getAttribute("method");
        var action=el.getAttribute("action");
        if (method) {
            this.call_method(method,cb);
        } else if (action) {
            this.context.action_view.execute(action);
            cb();
        }
    },

    call_method(method,cb) {
        if (!this.state.active_id) {
            this.save(()=>this.call_method(method,cb));
            return;
        }
        var ctx={};
        var ids=[this.state.active_id];
        rpc.execute(this.props.model,method,[ids],{context:ctx},function(err,res) {
            if (err) {
                alert("Error: "+err);
                return;
            }
            this.load_data();
            cb();
        }.bind(this));
    },
});

module.exports=Form;
views.register("form",Form);
