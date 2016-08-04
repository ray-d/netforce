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
var utils=require("../utils");

var Report=React.createClass({
    propTypes: {
        title: React.PropTypes.string,
        model: React.PropTypes.string,
        template: React.PropTypes.string,
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
        var title=this.props.title;
        return <div style={{marginTop:20}}>
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
                return <div>
                    <form className="form-horizontal nf-form">
                        <div className="nf-form-body">
                            <FormLayout model={this.props.model} layout_el={this.state.layout_el} data={this.state.data}/>
                        </div>
                    </form>
                    <Button string="Run Report" type="primary" on_click={this.run_report}/>
                </div>
            }.bind(this)()}
            {function() {
                if (!this.state.report_data) return;
                if (!this.props.template) throw "Missing report template";
                return utils.render_template(this.props.template,this.state.report_data);
            }.bind(this)()}
        </div>
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
                });
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

    run_report(cb) {
        if (!this.state.active_id) {
            this.save(()=>this.run_report(cb));
            return;
        }
        var method=this.props.method||"get_report_data";
        var ctx={};
        var ids=[this.state.active_id];
        rpc.execute(this.props.model,method,[ids],{context:ctx},(err,data)=>{
            cb();
            if (err) {
                alert("Error: "+err);
                return;
            }
            this.setState({report_data:data});
        });
    },
});

module.exports=Report;
views.register("report",Report);
