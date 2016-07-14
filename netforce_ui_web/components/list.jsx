var React= require("react");
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

var List=React.createClass({
    getInitialState() {
        console.log("List.getInitialState");
        var layout;
        if (this.props.layout) {
            layout=ui_params.get_layout(this.props.layout);
        } else {
            layout=ui_params.find_layout({model:this.props.model,type:"list"});
            if (!layout) throw "List layout not found for model "+this.props.model;
        }
        var doc=new dom().parseFromString(layout.layout);
        var layout_el=doc.documentElement;
        return {
            layout_el: layout_el,
            checked_items: {},
            offset: 0,
            limit: 100,
        };
    },

    componentDidMount() {
        console.log("List.componentDidMount");
        this.load_data();
    },

    load_data() {
        console.log("List.load_data");
        var cond=this.props.condition||[];
        console.log("cond",cond);
        var field_els=xpath.select("field", this.state.layout_el);
        var field_names=[];
        field_els.forEach(function(el) {
            var name=el.getAttribute("name");
            field_names.push(name);
        });
        this.setState({data:null});
        var ctx={};
        var opts={
            count: true,
            order: this.props.order,
            offset: this.state.offset,
            limit: this.state.limit,
            context: ctx,
        };
        rpc.execute(this.props.model,"search_read",[cond,field_names],opts,function(err,res) {
            this.setState({data:res[0],count:res[1]});
        }.bind(this));
    },

    render() {
        console.log("List.render");
        if (!this.state.data) return <Loading/>;
        if (this.state.data.length==0) return <p>There are no items to display.</p>
        var child_els=xpath.select("child::*",this.state.layout_el);
        var m=ui_params.get_model(this.props.model);
        return <div>
            <table className="table table-striped table-hover">
                <thead>
                    <tr>
                        <th style={{width:10}}><input type="checkbox" checked={this.state.check_all} onClick={this.on_check_all}/></th>
                        {child_els.map(function(el,i) {
                            if (el.getAttribute("invisible")) return;
                            if (el.tagName=="field") {
                                var name=el.getAttribute("name");
                                var f=ui_params.get_field(this.props.model,name);
                                return <th key={i}>{f.string}</th>
                            } else if (el.tagName=="actions") {
                                return <th key={i}></th>
                            }
                        }.bind(this))}
                    </tr>
                </thead>
                <tbody>
                    {this.state.data.map(function(obj) {
                        var style={};
                        var colors=this.state.layout_el.getAttribute("colors");
                        if (colors) {
                            var color=this.eval_colors(colors,obj);
                            if (color) {
                                style.backgroundColor=color;
                            }
                        }
                        return <tr key={obj.id} style={style}>
                            <td><input type="checkbox" onClick={this.on_check.bind(this,obj.id)} checked={this.state.checked_items[obj.id]}/></td>
                            {child_els.map(function(el,i) {
                                if (el.getAttribute("invisible")) return;
                                if (el.tagName=="field") {
                                    var name=el.getAttribute("name");
                                    var f=ui_params.get_field(this.props.model,name);
                                    var val=obj[name];
                                    var val_str=utils.fmt_field_val(val,f); // XXX: replace this by view?
                                    var edit=el.getAttribute("edit");
                                    var view=el.getAttribute("view");
                                    return <td key={i} onClick={!edit?this.on_select.bind(this,obj.id):null}>
                                        {function() {
                                            if (view) {
                                                var view_class=views.get_view(view);
                                                var props={
                                                    model: this.props.model,
                                                    name: name,
                                                    data: obj,
                                                };
                                                return React.createElement(view_class,props);
                                            } else if (edit) {
                                                if (f.type=="char") {
                                                    return <FieldChar model={this.props.model} name={name} data={obj} auto_save="1" width={parseInt(el.getAttribute("width"))}/>;
                                                } else if (f.type=="text") {
                                                    return <FieldChar model={this.props.model} name={name} data={obj} auto_save="1"/>;
                                                } else if (f.type=="boolean") {
                                                    return <FieldChar model={this.props.model} name={name} data={obj} auto_save="1"/>;
                                                } else if (f.type=="integer") {
                                                    return <FieldChar model={this.props.model} name={name} data={obj} auto_save="1" width={parseInt(el.getAttribute("width"))}/>;
                                                } else if (f.type=="float") {
                                                    return <FieldChar model={this.props.model} name={name} data={obj} auto_save="1"/>;
                                                } else if (f.type=="decimal") {
                                                    return <FieldChar model={this.props.model} name={name} data={obj} auto_save="1"/>;
                                                } else if (f.type=="date") {
                                                    return <FieldChar model={this.props.model} name={name} data={obj} auto_save="1"/>;
                                                } else if (f.type=="datetime") {
                                                    return <FieldChar model={this.props.model} name={name} data={obj} auto_save="1"/>;
                                                } else if (f.type=="selection") {
                                                    return <FieldChar model={this.props.model} name={name} data={obj} auto_save="1"/>;
                                                } else if (f.type=="file") {
                                                    return <FieldChar model={this.props.model} name={name} data={obj} auto_save="1"/>;
                                                } else if (f.type=="many2one") {
                                                    return <FieldMany2One model={this.props.model} name={name} data={obj} auto_save="1" nolink={el.getAttribute("nolink")} width={parseInt(el.getAttribute("width"))} condition={el.getAttribute("condition")}/>;
                                                } else if (f.type=="reference") {
                                                    return <FieldChar model={this.props.model} name={name} data={obj} auto_save="1"/>;
                                                } else {
                                                    throw "Invalid field type "+f.type;
                                                }
                                            } else {
                                                return <span dangerouslySetInnerHTML={{__html:val_str}}/>
                                            }
                                        }.bind(this)()}
                                    </td>
                                } else if (el.tagName=="actions") {
                                    var action_els=xpath.select("child::*",el);
                                    return <td key={i}>
                                        <div className="btn-group" style={{whiteSpace:"nowrap"}}>
                                            {action_els.map((el,i)=>{
                                                var method=el.getAttribute("method");
                                                return <button key={i} className="btn btn-default" style={{float:"none",display:"inline-block"}} onClick={this.call_method.bind(this,[obj.id],method)}>
                                                    {function() {
                                                        var icon=el.getAttribute("icon");
                                                        if (!icon) return;
                                                        return <span className={"glyphicon glyphicon-"+icon}></span>
                                                    }.bind(this)()}
                                                    {el.getAttribute("string")}
                                                </button>
                                            })}
                                        </div>
                                    </td>
                                }
                            }.bind(this))}
                        </tr>
                    }.bind(this))}
                </tbody>
            </table>
            {function() {
                var num_pages=Math.ceil(this.state.count/this.state.limit);
                var page_no=Math.floor(this.state.offset/this.state.limit);
                var pages=[page_no];
                for (var i=0; i<4; i++) {
                    if (pages.length>=5) break;
                    if (page_no<=num_pages-2-i) pages.push(page_no+1+i);
                    if (pages.length>=5) break;
                    if (page_no>=1+i) pages.unshift(page_no-1-i);
                }
                console.log("pages",pages);
                return <div>
                    <ul className="pagination" style={{float:"right"}}>
                        {function() {
                            if (page_no<=0) return;
                            return <li><a className="page-link" href="#" onClick={this.change_page.bind(this,0)}>&laquo; Start</a></li>
                        }.bind(this)()}
                        {function() {
                            if (page_no<=0) return;
                            return <li><a className="page-link" href="#" onClick={this.change_page.bind(this,page_no-1)}>&lsaquo; Prev</a></li>
                        }.bind(this)()}
                        {_.range(5).map(function(i) {
                            if (i>pages.length-1) return; 
                            return <li key={i} className={pages[i]==page_no?"active":null}><a className="page-link" href="#" onClick={this.change_page.bind(this,pages[i])}>{pages[i]+1}</a></li>
                        }.bind(this))}
                        {function() {
                            if (page_no>=num_pages-1) return;
                            return <li><a className="page-link" href="#" onClick={this.change_page.bind(this,page_no+1)}>Next &rsaquo;</a></li>
                        }.bind(this)()}
                        {function() {
                            if (page_no>=num_pages-1) return;
                            return <li><a className="page-link" href="#" onClick={this.change_page.bind(this,num_pages-1)}>End &raquo;</a></li>
                        }.bind(this)()}
                    </ul>
                    <div style={{float:"left",margin:"20px 0"}}>
                        <span style={{margin:10}}>
                            Page
                            <select style={{margin:5}} onChange={this.change_page} value={page_no} onChange={this.change_page}>
                                {_.range(num_pages).map(function(i) {
                                    return <option value={i} key={i}>{i+1}</option>
                                }.bind(this))}
                            </select>
                            of {num_pages}
                        </span>
                        <span style={{margin:10}}>({this.state.count} total items)</span>
                        <span style={{margin:10}}>
                            Showing
                            <select style={{margin:5}} onChange={this.change_limit} value={this.state.limit}>
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={200}>200</option>
                                <option value={1000}>1000</option>
                            </select>
                            items per page
                        </span>
                    </div>
                    <div className="clearfix"/>
                </div>
            }.bind(this)()}
        </div>
    },

    on_select(active_id) {
        if (this.props.on_select) {
            this.props.on_select(active_id);
        }
    },

    on_check(active_id) {
        var checked=this.state.checked_items;
        if (checked[active_id]) {
            delete checked[active_id];
        } else {
            checked[active_id]=true;
        }
        this.setState({checked_items:checked});
        this.selection_changed();
    },

    selection_changed() {
        console.log("List.selection_changed");
        var ids=[];
        _.each(this.state.checked_items,(val,id)=>{
            if (val) ids.push(parseInt(id));
        });
        console.log("ids",ids);
        if (this.props.on_selection_changed) this.props.on_selection_changed(ids);
    },

    on_check_all() {
        var checked=this.state.checked_items;
        if (this.state.check_all) {
            this.state.data.forEach(function(obj) {
                checked[obj.id]=false;
            });
            this.setState({checked_items:checked,check_all:false});
        } else {
            this.state.data.forEach(function(obj) {
                checked[obj.id]=true;
            });
            this.setState({checked_items:checked,check_all:true});
        }
        this.selection_changed();
    },

    call_method_selected(method,e) {
        console.log("call_method_selected",method);
        e.preventDefault();
        var ids=[];
        this.state.data.forEach(function(obj) {
            if (this.state.checked_items[obj.id]) ids.push(obj.id);
        }.bind(this));
        if (ids.length==0) {
            this.setState({"error": "No items selected."});
            return;
        }
        this.call_method(ids,method);
    },

    call_method(ids,method,e) {
        if (e) e.preventDefault();
        var ctx={};
        rpc.execute(this.props.model,method,[ids],{context:ctx},function(err,res) {
            if (err) {
                this.setState({"error": err});
                return;
            }
            this.load_data();
        }.bind(this));
    },

    change_limit: function(e) {
        var limit=e.target.value;
        this.setState({limit:limit},function() {
            this.load_data();
        }.bind(this));
    },

    change_page: function(page_no,e) {
        if (!_.isNumber(page_no)) { // XXX
            e=page_no;
            var page_no=e.target.value;
        }
        e.preventDefault();
        var offset=page_no*this.state.limit;
        this.setState({offset:offset},function() {
            this.load_data();
        }.bind(this));
    },

    eval_colors: function(colors,data) {
        var expr=JSON.parse(colors);
        var color=null;
        for (var attr in expr) {
            var conds=expr[attr];
            var attr_val=true;
            for (var i in conds) {
                var clause=conds[i];
                var n=clause[0];
                var op=clause[1];
                var cons=clause[2];
                var v=data[n];
                var clause_v;
                if (op=="=") {
                    clause_v=v==cons;
                } else if (op=="!=") {
                    clause_v=v!=cons;
                } else if (op=="in") {
                    clause_v=_.contains(cons,v);
                } else if (op=="<") {
                    clause_v=v<cons;
                } else if (op==">") {
                    clause_v=v>cons;
                } else {
                    throw "Invalid operator: "+op;
                }
                if (!clause_v) {
                    attr_val=false;
                    break;
                }
            }
            if (attr_val) color=attr;
        }
        return color;
    }
});

module.exports=List;
