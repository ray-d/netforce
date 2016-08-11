var React = require("react");
var ui_params=require("../ui_params");
var rpc=require("../rpc");
var utils=require("../utils");
var views=require("../views");
var dom = require('xmldom').DOMParser;
var xpath = require('xpath');
var Loading=require("./loading")
var classNames = require('classnames');
var _=require("underscore");
var Search=require("./search")
var FieldChar=require("./field_char")
var FieldMany2One=require("./field_many2one")
var Search=require("./search");
var Modal=require("react-bootstrap").Modal;

require("pivottable");
require("pivottable/dist/export_renderers");
//require("pivottable/dist/gchart_renderers");
require("pivottable/dist/c3_renderers");
require("pivottable/dist/pivot.css");

var Pivot=React.createClass({
    propTypes: {
        title: React.PropTypes.string,
        model: React.PropTypes.string,
        report_code: React.PropTypes.string,
    },

    contextTypes: {
        action_view: React.PropTypes.object,
    },

    getInitialState() {
        var layout;
        if (this.props.layout) {
            layout=ui_params.get_layout(this.props.layout);
        } else {
            layout=ui_params.find_layout({model:this.props.model,type:"pivot"});
            if (!layout) throw "Pivot layout not found for model "+this.props.model;
        }
        var doc=new dom().parseFromString(layout.layout);
        var layout_el=doc.documentElement;
        var rows=layout_el.getAttribute("rows");
        this.rows=rows?rows.split(","):[];
        var cols=layout_el.getAttribute("cols");
        this.cols=cols?cols.split(","):[];
        var vals=layout_el.getAttribute("vals");
        this.vals=vals?vals.split(","):[];
        this.agg_name=layout_el.getAttribute("agg_name");
        var field_els=xpath.select("field", layout_el);
        this.field_names=[];
        field_els.forEach((el)=>{
            var name=el.getAttribute("name");
            this.field_names.push(name);
        });
        var search_fields=layout_el.getAttribute("search");
        this.search_fields=search_fields?search_fields.split(","):[];
        return {
            layout_el: layout_el,
            configs: [],
            limit: 1000,
        };
    },

    componentDidMount() {
        this.load_data();
        this.load_configs();
    },

    componentWillUnmount() {
    },

    load_data() {
        console.log("Pivot.load_data");
        var cond=this.props.condition||[];
        if (this.state.search_cond) {
            cond.push(this.state.search_cond);
        }
        this.setState({data:null});
        var ctx={};
        var opts={
            count: true,
            order: this.props.order,
            limit: this.state.limit,
            context: ctx,
        };
        var field_names=[];
        console.log("field_names",this.field_names);
        this.field_names.forEach((n)=>{
            if (_.isString(n)) {
                field_names.push(n);
            } else if (_.isArray(n)) {
                field_names.push(n[0]);
            } else {
                throw "Invalid field name: "+n;
            }
        });
        rpc.execute(this.props.model,"search_read_path",[cond,field_names],opts,function(err,res) {
            var data=[];
            _.each(res[0],(r)=>{
                var r2={};
                this.field_names.forEach((n)=>{
                    if (n=="id") return;
                    var field_name,field_label;
                    var f;
                    if (_.isString(n)) {
                        field_name=n;
                        f=ui_params.get_field_by_path(this.props.model,field_name);
                        field_label=f.string;
                    } else if (_.isArray(n)) {
                        field_name=n[0];
                        f=ui_params.get_field_by_path(this.props.model,field_name);
                        field_label=n[1];
                    } else {
                        throw "Invalid field name: "+n;
                    }
                    var v=r;
                    field_name.split(".").forEach((c)=>{
                        if (!v) return;
                        v=v[c];
                    });
                    var val_str=utils.fmt_field_val(v,f);
                    r2[field_label]=val_str;
                });
                data.push(r2);
            });
            console.log("==> data",data);
            this.setState({data:data,count:res[1]});
        }.bind(this));
    },

    load_configs() {
        var cond=[["code","=",this.props.report_code]];
        var field_names=["name","config"];
        this.setState({configs:[]});
        rpc.execute("report.custom","search_read",[cond,field_names],{},(err,data)=>{
            if (err) {
                alert("Error: "+err);
                return;
            }
            this.setState({configs:data});
        });
    },

    render() {
        console.log("Pivot.render");
        return <div>
            {function() {
                if (!this.props.title) return;
                return <div className="page-header nf-page-header">
                    <h1>{this.props.title}</h1>
                </div>
            }.bind(this)()}
            <div>
                {function() {
                    if (this.state.show_search) return;
                    if (this.props.no_search) return;
                    return <button className="btn btn-default btn-sm" onClick={this.show_search} style={{marginRight:10}}><i className="glyphicon glyphicon-search"></i> Search</button>
                }.bind(this)()}
                <button className="btn btn-default btn-sm" onClick={this.print} style={{marginRight:10}}><i className="glyphicon glyphicon-print"></i> Print</button>
                <div className="btn-group" style={{marginRight:10}}>
                  <button type="button" className="btn btn-sm btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                    <i className="glyphicon glyphicon-open"></i> Load Config <span className="caret"></span>
                  </button>
                  <ul className="dropdown-menu">
                    {this.state.configs.map((c)=>{
                        return <li><a href="#" onClick={this.select_config.bind(this,c)}>{c.name}</a></li>
                    })}
                  </ul>
                </div>
                <button className="btn btn-default btn-sm" onClick={this.show_save} style={{marginRight:10}}><i className="glyphicon glyphicon-save"></i> Save Config</button>
                {function() {
                    if (!this.state.load_config) return;
                    return <button className="btn btn-default btn-sm" onClick={this.delete_config} style={{marginRight:10}}><i className="glyphicon glyphicon-remove"></i> Delete Config</button>
                }.bind(this)()}
                <button className="btn btn-default btn-sm" onClick={this.show_add_field} style={{marginRight:10}}><i className="glyphicon glyphicon-plus"></i> Add Field</button>
            </div>
            {function() {
                if (!this.state.show_search) return;
                return <Search model={this.props.model} on_close={this.hide_search} on_search={this.search} search_fields={this.search_fields}/>
            }.bind(this)()}
            {function() {
                if (!this.state.load_config) return;
                return <h3>{this.state.load_config.name}</h3>
            }.bind(this)()}
            {function() {
                if (!this.state.data) return <Loading/>;
                return <div>
                    <div ref={this.render_pivot} style={{marginTop:20}}/>
                    <div style={{marginTop:20}}>
                        <span style={{margin:10}}>({this.state.count} total items)</span>
                        <span style={{margin:10}}>
                            Limit
                            <select style={{margin:5}} onChange={this.change_limit} value={this.state.limit}>
                                <option value={1000}>1000</option>
                                <option value={10000}>10000</option>
                                <option value={100000}>100000</option>
                            </select>
                            items
                        </span>
                    </div>
                </div>
            }.bind(this)()}
            <Modal show={this.state.show_save} onHide={this.hide_save}>
                <Modal.Header closeButton>
                    <Modal.Title>Save Report Config</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="form-group">
                        <label className="nf-field-label">Config Name</label>
                        <input type="text" className="form-control" value={this.state.report_name} onChange={(e)=>this.setState({report_name:e.target.value})}/>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <button className="btn btn-primary" onClick={this.save_config}>Save</button>
                    <button className="btn btn-default" onClick={this.hide_save}>Cancel</button>
                </Modal.Footer>
            </Modal>
            <Modal show={this.state.show_add_field} onHide={this.hide_add_field}>
                <Modal.Header closeButton>
                    <Modal.Title>Add Field</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="form-group">
                        <label className="nf-field-label">Field Path</label>
                        <input type="text" className="form-control" onChange={(e)=>this.setState({field_path:e.target.value})}/>
                    </div>
                    <div className="form-group">
                        <label className="nf-field-label">Field Label</label>
                        <input type="text" className="form-control" onChange={(e)=>this.setState({field_label:e.target.value})}/>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <button className="btn btn-primary" onClick={this.add_field}>Add Field</button>
                    <button className="btn btn-default" onClick={this.hide_add_field}>Cancel</button>
                </Modal.Footer>
            </Modal>
        </div>
    },

    render_pivot(el) {
        console.log("Pivot.render_pivot",el);
        if (!el) return;
        var renderers = $.extend($.pivotUtilities.renderers, $.pivotUtilities.export_renderers, $.pivotUtilities.c3_renderers);
        var config={
            renderers: renderers,
            onRefresh: (config)=>{
                var config_copy = JSON.parse(JSON.stringify(config));
                //delete some values which are functions
                delete config_copy["aggregators"];
                delete config_copy["renderers"];
                //delete some bulky default values
                delete config_copy["rendererOptions"];
                delete config_copy["localeStrings"];
                this.pivot_config=config_copy;
            },
        };
        if (this.state.load_config) {
            var load_conf=JSON.parse(this.state.load_config.config);
            Object.assign(config,load_conf);
        } else {
            var rows=[];
            _.each(this.rows,(n)=>{
                var f=ui_params.get_field_by_path(this.props.model,n);
                rows.push(f.string);
            });
            var cols=[];
            _.each(this.cols,(n)=>{
                var f=ui_params.get_field_by_path(this.props.model,n);
                cols.push(f.string);
            });
            var vals=[];
            _.each(this.vals,(n)=>{
                var f=ui_params.get_field_by_path(this.props.model,n);
                vals.push(f.string);
            });
            Object.assign(config,{
                rows: rows,
                cols: cols,
                vals: vals,
                aggregatorName: this.agg_name,
            });
        }
        console.log("pivot config",config);
        $(el).pivotUI(
            this.state.data,
            config
        );
    },

    show_search(e) {
        e.preventDefault();
        this.setState({show_search:true});
    },

    hide_search() {
        this.setState({show_search:false,search_cond:null},()=>this.load_data());
    },

    search(cond) {
        this.setState({search_cond:cond},()=>this.load_data());
    },

    print(e) {
        console.log("Pivot.print");
        e.preventDefault();
        $(".pvtRendererArea").addClass("nf-print");
        window.print();
    },

    show_save() {
        this.setState({show_save:true,report_name:this.state.load_config?this.state.load_config.name:null});
    },

    hide_save() {
        this.setState({show_save:false});
    },

    save_config(e) {
        e.preventDefault();
        if (!this.state.report_name) {
            alert("Missing report name");
            return;
        }
        var config={
            field_names: this.field_names,
            limit: this.state.limit,
        };
        Object.assign(config,this.pivot_config);
        var vals={
            name: this.state.report_name,
            code: this.props.report_code,
            config: JSON.stringify(config),
        };
        if (this.state.load_config && this.state.report_name==this.state.load_config.name) {
            rpc.execute("report.custom","write",[[this.state.load_config.id],vals],{},(err,res)=>{
                this.setState({show_save:false});
                if (err) {s
                    alert("Error: "+err);
                    return;
                }
                alert("Report config updated successfully.");
                this.load_configs();
            });
        } else {
            rpc.execute("report.custom","create",[vals],{},(err,res)=>{
                this.setState({show_save:false});
                if (err) {
                    alert("Error: "+err);
                    return;
                }
                alert("Report config created successfully.");
                this.load_configs();
            });
        }
    },

    delete_config(e) {
        e.preventDefault();
        var res=confirm("Are you sure?");
        if (!res) return;
        if (!this.state.load_config) throw "No report config loaded"; 
        rpc.execute("report.custom","delete",[[this.state.load_config.id]],{},(err,res)=>{
            if (err) {
                alert("Error: "+err);
                return;
            }
            alert("Report config deleted.");
            this.load_configs();
        });
    },

    select_config(config,e) {
        console.log("select_config",config);
        e.preventDefault();
        this.setState({load_config:config});
        var c=JSON.parse(config.config);
        if (c.field_names) this.field_names=c.field_names;
        if (c.limit) this.setState({limit:c.limit});
        this.load_data();
    },

    show_add_field(e) {
        e.preventDefault();
        this.setState({show_add_field:true});
    },

    hide_add_field() {
        this.setState({show_add_field:false});
    },

    add_field(e) {
        e.preventDefault();
        if (!this.state.field_path) {
            alert("Missing field path");
            return;
        }
        try {
            var f=ui_params.get_field_by_path(this.props.model,this.state.field_path);
        } catch (err) {
            alert("Invalid field path");
            return;
        }
        if (this.state.field_label) {
            this.field_names.push([this.state.field_path,this.state.field_label]);
        } else {
            this.field_names.push(this.state.field_path);
        }
        this.setState({show_add_field:false});
        this.load_data();
    },

    change_limit: function(e) {
        var limit=e.target.value;
        this.setState({limit:limit},()=>this.load_data());
    },
});

module.exports=Pivot;
views.register("pivot",Pivot);
