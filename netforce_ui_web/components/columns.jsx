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
var $=require("jquery");
var Search=require("./search")
var FieldChar=require("./field_char")
var FieldMany2One=require("./field_many2one")

var Columns=React.createClass({
    contextTypes: {
        action_view: React.PropTypes.object,
    },

    getInitialState() {
        var layout;
        if (this.props.layout) {
            layout=ui_params.get_layout(this.props.layout);
        } else {
            layout=ui_params.find_layout({model:this.props.model,type:"columns"});
            if (!layout) throw "Columns layout not found for model "+this.props.model;
        }
        var doc=new dom().parseFromString(layout.layout);
        var layout_el=doc.documentElement;
        this.column_field=layout_el.getAttribute("column_field");
        if (!this.column_field) throw "Missing column_field in columns layout";
        this.row_field=layout_el.getAttribute("row_field");
        this.group_field=layout_el.getAttribute("group_field");
        this.row_els={};
        return {
            layout_el: layout_el,
            checked_items: {},
        };
    },

    componentDidMount() {
        this.load_data();
        $("body").on("dragover",this.body_drag_over.bind(this));
        $("body").on("mouseup",this.doc_mouse_up.bind(this));
        $("body").on("mousemove",this.doc_mouse_move.bind(this));
    },

    componentWillUnmount() {
        $("body").off("dragover",this.body_drag_over.bind(this));
        $("body").off("mouseup",this.doc_mouse_up.bind(this));
        $("body").off("mousemove",this.doc_mouse_move.bind(this));
    },

    load_data() {
        console.log("Columns.load_data");
        var cond=this.props.condition||[];
        var field_els=xpath.select("field", this.state.layout_el);
        var field_names=[this.column_field];
        if (this.row_field) {
            field_names.push(this.row_field);
        }
        if (this.group_field) {
            field_names.push(this.group_field);
        }
        field_els.forEach(function(el) {
            var name=el.getAttribute("name");
            field_names.push(name);
        });
        //this.setState({data:null});
        var ctx={};
        var opts={
            count: true,
            order: this.props.order,
            limit: 1000,
            context: ctx,
        };
        rpc.execute(this.props.model,"search_read",[cond,field_names],opts,function(err,res) {
            this.setState({data:res[0],count:res[1]});
        }.bind(this));
    },

    render() {
        console.log("Columns.render");
        if (!this.state.data) return <Loading/>;
        if (this.state.data.length==0) return <p>There are no items to display.</p>;
        var row_ids={};
        this.rows=[];
        _.each(this.state.data,(obj)=>{
            var row_val=obj[this.row_field];
            var row_id;
            if (_.isArray(row_val)) row_id=row_val[0];
            else row_id=row_val;
            var f=ui_params.get_field(this.props.model,this.row_field);
            var row_label=utils.fmt_field_val(row_val,f);
            var row=row_ids[row_id];
            if (!row) {
                var row={
                    title: row_id?row_label:"N/A",
                    row_id: row_id,
                    col_ids: {},
                    cols: [],
                };
                row_ids[row_id]=row;
                if (row_id) {
                    this.rows.push(row);
                }
            }
            var col_val=obj[this.column_field];
            var col_id;
            if (_.isArray(col_val)) col_id=col_val[0];
            else col_id=col_val;
            var f=ui_params.get_field(this.props.model,this.column_field);
            var col_label=utils.fmt_field_val(col_val,f);
            var col=row.col_ids[col_id];
            if (!col) {
                col={
                    label: col_id?col_label:"N/A",
                    col_id: col_id,
                    group_ids: {},
                    groups: [],
                };
                row.col_ids[col_id]=col;
                row.cols.push(col);
            }
            var group_val=obj[this.group_field];
            var group_id;
            if (_.isArray(group_val)) group_id=group_val[0];
            else group_id=group_val;
            var f=ui_params.get_field(this.props.model,this.group_field);
            var group_label=utils.fmt_field_val(group_val,f);
            var group=col.group_ids[group_id];
            if (!group) {
                group={
                    label: group_id?group_label:"N/A",
                    group_id: group_id,
                    records: [],
                };
                col.group_ids[group_id]=group;
                col.groups.push(group);
            }
            console.log("row_id",row_id,"row_label",row_label,"col_id",col_id,"col_label",col_label,"group_id",group_id,"group_label",group_label);
            group.records.push(obj);
        });
        if (row_ids[null]) {
            this.rows.push(row_ids[null]);
        }
        console.log("rows",this.rows);
        return <div>
            {this.rows.map((row,j)=>{
                console.log("render row",j,row.title);
                return <div key={j}>
                    {function() {
                        if (!row.title) return;
                        return <div className="nf-columns-header">
                            <h2>
                                {row.title}
                                {function() {
                                    if (this.state.loading_row_id==null) return;
                                    if (this.state.loading_row_id==row.row_id) return <Loading small={true} style={{marginLeft:10}}/>
                                }.bind(this)()}
                            </h2>
                        </div>
                    }.bind(this)()}
                    <div style={{marginTop:10,overflowX:"auto",whiteSpace:"nowrap"}} className="nf-columns-row" onDragOver={this.on_drag_over_row} onDrop={this.on_drop_on_row.bind(this,row)} ref={(el)=>row.el=el}>
                        {row.cols.map((col)=>{
                            console.log("render col",col.group_id,col.label);
                            return <div key={col.col_id} style={{width:270,display:"inline-block",marginRight:"10px",verticalAlign:"top"}} draggable="true" onDragStart={this.on_drag_start_col.bind(this,col,row)} className="nf-column" ref={(el)=>col.el=el}>
                                {col.groups.map((group)=>{
                                    return <div key={group.group_id} style={{borderRadius:"3px",backgroundColor:"#eee",marginBottom:"10px"}} onDragOver={this.on_drag_over_group} onDrop={this.on_drop_on_group.bind(this,group)} className="nf-columns-group" ref={(el)=>group.el=el}>
                                        <div style={{padding:5,fontWeight:"bold",cursor:"pointer"}}>
                                            <span onClick={this.click_group.bind(this,group.group_id)}>{group.label} ({group.records.length})</span> {this.state.loading_group_id && this.state.loading_group_id==group.group_id?<Loading small={true}/>:null}
                                        </div>
                                        {function() {
                                            var res=xpath.select("head",this.state.layout_el);
                                            if (res.length==0) return;
                                            var head_el=res[0];
                                            var child_els=xpath.select("child::*",head_el);
                                            return <div style={{padding:5,cursor:"pointer"}}>
                                                {child_els.map(function(el,i) {
                                                    if (el.tagName=="button") {
                                                        var string=el.getAttribute("string");
                                                        var method=el.getAttribute("method");
                                                        var icon=el.getAttribute("icon");
                                                        return <button key={i} className="btn btn-sm btn-default" style={{marginRight:5}} onClick={this.call_group_method.bind(this,method,group.group_id)}>{icon?<span className={"glyphicon glyphicon-"+icon}></span>:null} {string}</button>
                                                    } else {
                                                        throw "Unexpected tag in head: "+el.tagName;
                                                    }
                                                }.bind(this))}
                                            </div>
                                        }.bind(this)()}
                                        <div className="nf-column-item-container" style={{overflowY:"auto"}}>
                                            {group.records.map((obj)=>{
                                                //console.log("render record",obj.id,obj);
                                                var style={borderRadius:3,margin:5,backgroundColor:"#fff",padding:5,cursor:"pointer"};
                                                var colors=this.state.layout_el.getAttribute("colors");
                                                if (colors) {
                                                    var color=this.eval_colors(colors,obj);
                                                    if (color) {
                                                        style.backgroundColor=color;
                                                    }
                                                }
                                                var child_els=xpath.select("child::*",this.state.layout_el);
                                                return <div key={obj.id} draggable="true" onDragStart={this.on_drag_start_record.bind(this,obj)} style={style} className="nf-column-item" onClick={this.on_select.bind(this,obj.id)} ref={(el)=>obj.el=el}>
                                                    {function() {
                                                        return child_els.map((el,i)=>{
                                                            if (el.tagName=="field") {
                                                                var name=el.getAttribute("name");
                                                                var invisible=el.getAttribute("invisible");
                                                                if (invisible) return;
                                                                var view=el.getAttribute("view");
                                                                if (view) {
                                                                    var view_class=views.get_view(view);
                                                                    var props={
                                                                        model: this.props.model,
                                                                        name: name,
                                                                        data: obj,
                                                                    };
                                                                    return <div key={i}>{React.createElement(view_class,props)}</div>;
                                                                } else {
                                                                    var f=ui_params.get_field(this.props.model,name);
                                                                    var val=obj[name];
                                                                    var val_str=utils.fmt_field_val(val,f);
                                                                    var props={};
                                                                    var tooltip_field=el.getAttribute("tooltip_field");
                                                                    if (tooltip_field) {
                                                                        props.dataToggle="tooltip";
                                                                        props.dataPlacement="right";
                                                                        var f=ui_params.get_field(this.props.model,tooltip_field);
                                                                        var val=obj[tooltip_field];
                                                                        props.title=utils.fmt_field_val(val,f);
                                                                    }
                                                                    return <div key={i} style={{overflow:"hidden",textOverflow:"ellipsis"}} {...props}>
                                                                        {val_str}
                                                                    </div>;
                                                                }
                                                            }
                                                        });
                                                    }.bind(this)()}
                                                </div>
                                            })}
                                        </div>
                                    </div>
                                })}
                            </div>
                        })}
                        <div className="clearfix"/>
                    </div>
                    <div style={{marginTop:0,height:15,backgroundColor:"#ccc",cursor:"row-resize"}} onMouseDown={this.start_resize.bind(this,row)}/>
                </div>
            })}
        </div>
    },

    start_resize(row) {
        console.log("start_resize",row);
        this.resize_row=row;
    },

    doc_mouse_move(e) {
        if (!this.resize_row) return;
        console.log("doc_mouse_move");
        var row_height=e.pageY-this.resize_row.el.offsetTop;
        if (row_height<0) row_height=0;
        console.log("row_height",row_height);
        $(this.resize_row.el).height(row_height);
    },

    doc_mouse_up() {
        console.log("doc_mouse_up");
        this.resize_row=null;
    },

    click_group(group_id) {
        if (!group_id) return;
        var f=ui_params.get_field(this.props.model,this.group_field);
        var action=ui_params.find_details_action(f.relation,group_id);
        this.context.action_view.execute(action);
    },

    on_drag_start_record(obj,e) {
        console.log("on_drag_start_record",obj);
        e.stopPropagation();
        this.drag_type="record";
        this.drag_el=e.target;
        this.drag_record=obj;
        console.log("drag_record",this.drag_record);
    },

    on_drag_start_col(col,row,e) {
        console.log("on_drag_start_col",col,row);
        this.drag_type="column";
        this.drag_el=e.target;
        this.drag_col=col;
        this.drag_row=row;
    },

    on_drag_over_group(e) {
        //console.log("on_drag_over_col",e);
        if (this.drag_type=="record") {
            //console.log("allow drop");
            e.preventDefault();
        } else {
            //console.log("not allow drop");
        }
    },

    body_drag_over(e) {
        console.log("body_drag_over");
        if (this.drag_type=="column") {
            var row_el=$(this.drag_el).parents(".nf-columns-row");
            var offset=row_el.offset();
            if (e.pageX<offset.left+100) {
                console.log("scroll left");
                if (!this.scrolling) {
                    row_el.stop().animate({scrollLeft:0},1000);
                    this.scrolling=true;
                }
            } else if (e.pageX>offset.left+row_el.width()-100) {
                console.log("scroll right");
                if (!this.scrolling) {
                    var max_scroll=row_el[0].scrollWidth-row_el[0].clientWidth;
                    row_el.stop().animate({scrollLeft:max_scroll},1000);
                    this.scrolling=true;
                }
            } else {
                row_el.stop();
                this.scrolling=false;
            }
        } else if (this.drag_type=="record") {
            var cont_el=$(this.drag_el).parents(".nf-column-item-container");
            var offset=cont_el.offset();
            if (e.pageY<offset.top+50) {
                console.log("scroll up");
                if (!this.scrolling) {
                    cont_el.stop().animate({scrollTop:0},1000);
                    this.scrolling=true;
                }
            } else if (e.pageY>offset.top+cont_el.height()-50) {
                console.log("scroll down");
                if (!this.scrolling) {
                    var max_scroll=cont_el[0].scrollHeight-cont_el[0].clientHeight;
                    cont_el.stop().animate({scrollTop:max_scroll},1000);
                    this.scrolling=true;
                }
            } else {
                cont_el.stop();
                this.scrolling=false;
            }
        }
    },

    on_drag_over_row(e) {
        //console.log("on_drag_over_row",e);
        if (this.drag_type=="column") {
            //console.log("allow drop");
            e.preventDefault();
        } else {
            //console.log("not allow drop");
        }
    },

    on_drop_on_group(drop_group,e) {
        console.log("on_drop_on_group",drop_group);
        if (this.drag_type!="record") return;
        e.preventDefault();
        var obj_ids=[];
        var insert_index=0;
        _.each(drop_group.records,(obj,i)=>{
            if (obj.el.offsetTop+obj.el.offsetHeight/2<=e.pageY) {
                insert_index=i+1;
            }
            if (obj.id==this.drag_record.id) {
                obj_ids.push(null);
            } else {
                obj_ids.push(obj.id);
            }
        });
        //alert("insert_index "+insert_index);
        obj_ids.splice(insert_index,0,this.drag_record.id);
        obj_ids=_.filter(obj_ids,(id)=>id!=null);
        //alert("obj_ids "+JSON.stringify(obj_ids));
        this.setState({loading_group_id:drop_group.group_id});
        var ctx={
            order_id: this.drag_record.id,
            route_id: drop_group.group_id,
        };
        rpc.execute(this.props.model,"set_sequence",[obj_ids],{context:ctx},function(err) {
            this.setState({loading_group_id:null});
            if (err) {
                alert("Error: "+err);
                return;
            }
            this.load_data();
        }.bind(this));
    },

    on_drop_on_row(drop_row,e) {
        console.log("on_drop_on_row",drop_row);
        if (this.drag_type!="column") return;
        e.preventDefault();
        var col_ids=[];
        var insert_index=0;
        _.each(drop_row.cols,(col,i)=>{
            if (col.el.offsetLeft+col.el.offsetWidth/2<=e.pageX) {
                insert_index=i+1;
            }
            if (col.col_id==this.drag_col.col_id) {
                col_ids.push(null);
            } else {
                col_ids.push(col.col_id);
            }
        });
        //alert("insert_index "+insert_index);
        col_ids.splice(insert_index,0,this.drag_col.col_id);
        col_ids=_.filter(col_ids,(id)=>id!=null);
        //alert("col_ids "+JSON.stringify(col_ids));
        //console.log("col_ids",col_ids);
        var f=ui_params.get_field(this.props.model,this.column_field);
        //alert("loading_row_id="+this.drag_row.row_id);
        this.setState({loading_row_id:this.drag_row.row_id});
        rpc.execute(f.relation,"set_sequence",[col_ids],{},function(err) {
            this.setState({loading_row_id:null});
            if (err) {
                alert("Error: "+err);
                return;
            }
            this.load_data();
        }.bind(this));
    },

    on_select(active_id) {
        console.log("Columns.on_select",active_id);
        window.xxx=this.state.layout_el;
        var action_name=this.state.layout_el.getAttribute("action");
        if (action_name) {
            var action={
                name: action_name,
                active_id: active_id,
                on_save: ()=>this.load_data(),
            };
            this.context.action_view.execute(action);
            return;
        }
        if (this.props.on_select) {
            this.props.on_select(active_id);
        }
    },

    call_group_method(method,group_id,e) {
        console.log("call_group_method",method,group_id);
        if (e) e.preventDefault();
        var f=ui_params.get_field(this.props.model,this.group_field);
        var ctx={};
        var ids=[group_id];
        this.setState({loading_group_id:group_id});
        rpc.execute(f.relation,method,[ids],{context:ctx},function(err,res) {
            this.setState({loading_group_id:null});
            if (err) {
                this.setState({"error": err});
                return;
            }
            this.load_data();
        }.bind(this));
    },

    eval_colors: function(colors,data) {
        //console.log("Columns.eval_colors",colors,data);
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
        //console.log("=>",color);
        return color;
    },
});

module.exports=Columns;
