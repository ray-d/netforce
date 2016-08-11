var React = require("react");
var ui_params=require("../ui_params");
var rpc=require("../rpc");
var utils=require("../utils");
var dom = require('xmldom').DOMParser;
var xpath = require('xpath');
var Loading=require("./loading")
var classNames = require('classnames');
var _=require("underscore");
var $=require("jquery");
var Search=require("./search")
var FieldChar=require("./field_char")
var FieldMany2One=require("./field_many2one")
var views=require("../views");
var List=require("./list")
var Columns=require("./columns")
var Grid=require("./grid")
var Map=require("./map")
var Form=require("./form")
var Pivot=require("./pivot")
var Button=require("./button")

var ListContainer=React.createClass({
    propTypes: {
        title: React.PropTypes.string,
        model: React.PropTypes.string,
        tabs: React.PropTypes.array,
        order: React.PropTypes.string,
        group_field: React.PropTypes.string,
        group_field_path: React.PropTypes.string, // XXX
        subgroup_field: React.PropTypes.string,
        subgroup_field_path: React.PropTypes.string, // XXX
        import_action: React.PropTypes.string,
        modes: React.PropTypes.string,
        mode: React.PropTypes.string,
        active_id: React.PropTypes.number,
        active_tab: React.PropTypes.number,
        message: React.PropTypes.string,
        list_layout: React.PropTypes.string,
        form_layout: React.PropTypes.string,
    },

    contextTypes: {
        action_view: React.PropTypes.object,
    },

    getInitialState() {
        console.log("ListContainer.getInitialState",this.props);
        var layout;
        if (this.props.layout) {
            layout=ui_params.get_layout(this.props.layout);
        } else {
            layout=ui_params.find_layout({model:this.props.model,type:"list"});
            if (!layout) throw "List layout not found for model "+this.props.model;
        }
        var doc=new dom().parseFromString(layout.layout);
        var layout_el=doc.documentElement;
        var modes;
        if (this.props.modes) {
            modes=this.props.modes.split(",");
        } else {
            modes=["list"];
        }
        var state={
            layout_el: layout_el,
            active_tab: this.props.active_tab||0,
            offset: 0,
            limit: 100,
            modes: modes,
            active_id: this.props.active_id,
            mode: this.props.mode||modes[0],
            list_key:0,
            select_ids: [],
            alert_msg: this.props.message,
            alert_type: this.props.message_type,
        };
        console.log("state",state);
        return state;
    },

    componentDidMount() {
        console.log("ListContainer.componentDidMount");
        if (this.props.group_field) this.load_groups();
    },

    get_search_cond() {
        var cond=[];
        if (this.props.tabs) {
            var tab_cond=this.props.tabs[this.state.active_tab][1];
            cond.push(tab_cond);
        }
        if (this.state.search_cond) {
            cond.push(this.state.search_cond);
        }
        if (this.state.group_cond) {
            cond.push(this.state.group_cond);
        }
        if (this.state.subgroup_cond) {
            cond.push(this.state.subgroup_cond);
        }
        return cond;
    },

    load_groups() {
        console.log("ListContainer.load_groups");
        var cond=[];
        if (this.props.tabs) {
            console.log("active_tab",this.state.active_tab);
            var tab_cond=this.props.tabs[this.state.active_tab][1];
            cond.push(tab_cond);
        }
        if (this.state.search_cond) {
            cond.push(this.state.search_cond);
        }
        var cond_nogroup=cond.slice(0);
        if (this.props.group_field_path) {
            var group_fields=[this.props.group_field_path]; // XXX
            rpc.execute(this.props.model,"read_group",[],{group_fields:group_fields,condition:cond_nogroup},(err,res)=>{
                if (err) throw err;
                this.setState({group_data:res});
            });
        }
        if (this.props.subgroup_field_path) {
            var subgroup_fields=[this.props.subgroup_field_path];
            if (this.state.group_cond) {
                cond.push(this.state.group_cond);
            }
            rpc.execute(this.props.model,"read_group",[],{group_fields:subgroup_fields,condition:cond},(err,res)=>{
                if (err) throw err;
                this.setState({subgroup_data:res});
            });
        }
    },

    render() {
        console.log("ListContainer.render");
        console.log("mode",this.state.mode);
        var search_cond=this.get_search_cond();
        console.log("search_cond",search_cond);
        var m=ui_params.get_model(this.props.model);
        if (this.state.mode=="form") {
            return <Form model={this.props.model} active_id={this.state.active_id} bread_title={this.props.title} on_bread={this.on_bread} condition={search_cond} layout={this.props.form_layout}/>
        }
        return <div>
            <div className="page-header nf-page-header">
                <h1>{this.props.title}</h1>
            </div>
            {function() {
                if (!this.state.alert_msg) return;
                return <div className={"alert alert-"+(this.state.alert_type||"info")}>
                    <a className="close" data-dismiss="alert" href="#">&times;</a>
                    {this.state.alert_msg}
                </div>
            }.bind(this)()}
            <div className="btn-toolbar" style={{marginBottom:10}}>
                <button className="btn btn-default" style={{marginRight:10}} onClick={this.on_new}><span className="glyphicon glyphicon-plus"></span> New {m.string}</button>
                <button className="btn btn-default" style={{marginRight:10}} onClick={this.on_import}><span className="glyphicon glyphicon-download"></span> Import</button>
                {function() {
                    var res=xpath.select("top",this.state.layout_el);
                    if (res.length==0) return;
                    var top_el=res[0];
                    var child_els=xpath.select("child::*",top_el);
                    return child_els.map((el,i)=>{
                        if (el.tagName=="button") {
                            return <Button key={i} string={el.getAttribute("string")} icon={el.getAttribute("icon")} on_click={this.btn_click_top.bind(this,el)}/>
                        } else {
                            throw "Unexpected tag in top: "+el.tagName;
                        }
                    });
                }.bind(this)()}
                {function() {
                    if (this.state.modes.length<2) return;
                    return <div className="btn-group pull-right" role="group">
                        {this.state.modes.map((m)=>{
                            if (m=="list") {
                                return <button key={m} type="button" className={classNames("btn","btn-default",{"active":this.state.mode=="list"})} style={{width:100}} onClick={this.set_mode.bind(this,"list")}><i className="fa fa-list"/> List</button>
                            } else if (m=="grid") {
                                return <button key={m} type="button" className={classNames("btn","btn-default",{"active":this.state.mode=="grid"})} style={{width:100}} onClick={this.set_mode.bind(this,"grid")}><i className="fa fa-th"/> Grid</button>
                            } else if (m=="columns") {
                                return <button key={m} type="button" className={classNames("btn","btn-default",{"active":this.state.mode=="columns"})} style={{width:100}} onClick={this.set_mode.bind(this,"columns")}><i className="fa fa-columns"/> Columns</button>
                            } else if (m=="map") {
                                return <button key={m} type="button" className={classNames("btn","btn-default",{"active":this.state.mode=="map"})} style={{width:100}} onClick={this.set_mode.bind(this,"map")}><i className="fa fa-map-o"/> Map</button>
                            } else if (m=="pivot") {
                                return <button key={m} type="button" className={classNames("btn","btn-default",{"active":this.state.mode=="pivot"})} style={{width:100}} onClick={this.set_mode.bind(this,"pivot")}><i className="fa fa-table"/> Pivot</button>
                            } else {
                                throw "Invalid mode: "+m;
                            }
                        })}
                    </div>
                }.bind(this)()}
            </div>
            {function() {
                if (!this.props.summary_view) return;
                var view_class=views.get_view(this.props.summary_view);
                var props={
                    model: this.props.model,
                    data: this.state.data,
                };
                var el=React.createElement(view_class,props);
                return el;
            }.bind(this)()}
            {function() {
                if (!this.props.tabs) return;
                return <ul className="nav nav-tabs">
                    {this.props.tabs.map(function(o,i) {
                        return <li key={i} className={i==this.state.active_tab?"active":null}><a href="#" onClick={this.click_tab.bind(this,i)}>{o[0]}</a></li>
                    }.bind(this))}
                </ul>
            }.bind(this)()}
            {function() {
                if (!this.state.group_data) return;
                console.log("group_data",this.state.group_data);
                return <ul className="nav nav-pills" style={{margin:"10px 0"}}>
                    {this.state.group_data.map((r,i)=>{
                        var v=r[this.props.group_field_path]; // XXX
                        var f=ui_params.get_field(this.props.model,this.props.group_field);
                        var search_val;
                        if (f.type=="many2one"||f.type=="reference") {
                            search_val=v?v[0]:null;
                        } else {
                            search_val=v;
                        }
                        var val_str;
                        if (v!=null) {
                            val_str=utils.fmt_field_val(v,f);
                        } else {
                            val_str="N/A";
                        }
                        return <li key={i} className={this.state.group_cond && search_val==this.state.group_cond[2]?"active":null}><a href="#" onClick={this.click_group_pill.bind(this,search_val)}>{val_str} ({r._count})</a></li>
                    })}
                </ul>
            }.bind(this)()}
            {function() {
                if (!this.state.subgroup_data) return;
                console.log("subgroup_data",this.state.subgroup_data);
                return <ul className="nav nav-pills" style={{margin:"10px 0"}}>
                    {this.state.subgroup_data.map((r,i)=>{
                        var v=r[this.props.subgroup_field_path];
                        var f=ui_params.get_field(this.props.model,this.props.subgroup_field);
                        var search_val;
                        if (f.type=="many2one"||f.type=="reference") {
                            search_val=v?v[0]:null;
                        } else {
                            search_val=v;
                        }
                        var val_str;
                        if (v!=null) {
                            val_str=utils.fmt_field_val(v,f);
                        } else {
                            val_str="N/A";
                        }
                        return <li key={i} className={this.state.subgroup_cond && search_val==this.state.subgroup_cond[2]?"active":null}><a href="#" onClick={this.click_subgroup_pill.bind(this,search_val)}>{val_str} ({r._count})</a></li>
                    })}
                </ul>
            }.bind(this)()}
            {function() {
                if (!this.state.show_search) return;
                return <Search model={this.props.model} on_close={this.hide_search} on_search={this.search}/>
            }.bind(this)()}
            <div style={{marginTop:10}}>
                <Button string="Delete" method="delete" type="danger" size="sm" on_click={this.btn_click_delete}/>
                {function() {
                    var res=xpath.select("head",this.state.layout_el);
                    if (res.length==0) return;
                    var head_el=res[0];
                    var child_els=xpath.select("child::*",head_el);
                    return child_els.map((el,i)=>{
                        if (el.tagName=="button") {
                            return <Button key={i} string={el.getAttribute("string")} type={el.getAttribute("type")} icon={el.getAttribute("icon")} size="sm" on_click={this.btn_click_head.bind(this,el)}/>
                        } else {
                            throw "Unexpected tag in head: "+el.tagName;
                        }
                    });
                }.bind(this)()}
                {function() {
                    if (this.state.show_search) return;
                    return <button className="btn btn-default btn-sm pull-right" onClick={this.show_search}><i className="glyphicon glyphicon-search"></i> Search</button>
                }.bind(this)()}
            </div>
            {function() {
                return <div>
                    {function() {
                        if (this.state.mode=="list") {
                            return <List key={this.state.list_key} model={this.props.model} on_select={this.on_select} condition={search_cond} on_selection_changed={this.on_selection_changed} order={this.props.order} layout={this.props.list_layout}/>
                        } else if (this.state.mode=="grid") {
                            return <Grid key={this.state.list_key} model={this.props.model} condition={search_cond} order={this.props.order} on_select={this.on_select}/>
                        } else if (this.state.mode=="columns") {
                            return <Columns key={this.state.list_key} model={this.props.model} condition={search_cond} order={this.props.order} on_select={this.on_select}/>
                        } else if (this.state.mode=="map") {
                            return <Map key={this.state.list_key} model={this.props.model} condition={search_cond} order={this.props.order} on_select={this.on_select}/>
                        } else if (this.state.mode=="pivot") {
                            return <Pivot key={this.state.list_key} model={this.props.model} condition={search_cond} order={this.props.order} no_search={true}/>
                        }
                    }.bind(this)()}
                </div>
            }.bind(this)()}
        </div>
    },

    on_new() {
        this.setState({mode:"form",active_id:null});
    },

    on_select(active_id) {
        this.setState({mode:"form",active_id:active_id});
        var action=this.context.action_view.get_action();
        action.mode="form";
        action.active_id=active_id;
        this.context.action_view.update_history(action);
    },

    on_selection_changed(ids) {
        this.setState({select_ids:ids});
    },

    on_bread() {
        this.setState({mode:this.state.modes[0]});
        var action=this.context.action_view.get_action();
        delete action.mode;
        delete action.active_id;
        this.context.action_view.update_history(action);
    },

    show_search(e) {
        e.preventDefault();
        this.setState({show_search:true});
    },

    hide_search() {
        this.setState({show_search:false,search_cond:null},()=>this.load_groups());
    },

    search(cond) {
        this.setState({search_cond:cond,list_key:this.state.list_key+1},()=>this.load_groups());
    },

    click_tab(tab_no,e) {
        console.log("click_tab",tab_no);
        e.preventDefault();
        this.setState({
            active_tab: tab_no,
            show_search: false,
            search_cond: null,
            group_cond: null,
            list_key: this.state.list_key+1,
        },function() {
            this.load_groups();
        }.bind(this));
        var action=this.context.action_view.get_action();
        action.active_tab=tab_no;
        this.context.action_view.update_history(action);
    },

    click_group_pill(val,e) {
        console.log("click_group_pill",val);
        e.preventDefault();
        var new_group_cond;
        if (this.state.group_cond && this.state.group_cond[2]==val) {
            new_group_cond=null;
        } else {
            new_group_cond=[this.props.group_field_path,"=",val]; // XXX
        }
        this.setState({
            group_cond: new_group_cond,
            subgroup_cond: null,
            list_key: this.state.list_key+1,
        },function() {
            this.load_groups();
        }.bind(this));
    },

    click_subgroup_pill(val,e) {
        console.log("click_subgroup_pill",val);
        e.preventDefault();
        var new_subgroup_cond;
        if (this.state.subgroup_cond && this.state.subgroup_cond[2]==val) {
            new_subgroup_cond=null;
        } else {
            new_subgroup_cond=[this.props.subgroup_field_path,"=",val];
        }
        this.setState({
            subgroup_cond: new_subgroup_cond,
            list_key: this.state.list_key+1,
        },function() {
            this.load_groups();
        }.bind(this));
    },

    set_mode(mode,e) {
        e.preventDefault();
        this.setState({mode:mode});
        var action=this.context.action_view.get_action();
        action.mode=mode;
        this.context.action_view.update_history(action);
    },

    on_import(e) {
        e.preventDefault();
        if (this.props.on_import) {
            this.props.on_import();
            return;
        } else if (this.props.import_action) {
            this.context.action_view.execute(this.props.import_action);
            return;
        }
    },

    btn_click_top(el,cb) {
        var method=el.getAttribute("method");
        var action=el.getAttribute("action");
        if (method) {
            this.call_method(method,null,cb);
        }
        if (action) {
            this.context.action_view.execute(action);
            cb();
        }
    },

    btn_click_delete(cb) {
        if (this.state.select_ids.length==0) {
            alert("No items selected");
            cb();
            return;
        }
        var res=confirm("Are you sure you want to delete "+this.state.select_ids.length+" items?");
        if (!res) {
            cb();
            return;
        }
        this.call_method("delete",this.state.select_ids,cb);
    },

    btn_click_head(el,cb) {
        console.log("btn_click_head");
        if (this.state.select_ids.length==0) {
            alert("No items selected");
            cb();
            return;
        }
        var method=el.getAttribute("method");
        var action=el.getAttribute("action");
        if (method) {
            this.call_method(method,this.state.select_ids,cb);
        } else if (action) {
            if (action[0]=="{")  {
                console.log("action",action);
                action=JSON.parse(action);
            }
            var ctx={ids:this.state.select_ids};
            this.context.action_view.execute(action,ctx);
            cb();
        }
    },

    call_method(method,ids,cb) {
        console.log("Button.call_method",method,ids);
        var ctx={};
        var args=[];
        if (ids!=null) {
            args.push(ids);
        }
        rpc.execute(this.props.model,method,args,{context:ctx},function(err,res) {
            if (cb) cb();
            if (err) {
                this.setState({alert_msg:err,alert_type:"danger"});
                return;
            }
            this.setState({alert_msg:res&&res.message,alert_type:res&&res.message_type||"info",list_key:this.state.list_key+1});
            var action=res?res.action:null;
            if (action) {
                this.context.action_view.execute(action);
            }
        }.bind(this));
    },
});

module.exports=ListContainer;
views.register("list_container",ListContainer);
