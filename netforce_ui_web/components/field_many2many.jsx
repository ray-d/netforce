var React= require("react");
var ui_params=require("../ui_params");
var utils=require("../utils");
var rpc=require("../rpc");
var dom = require('xmldom').DOMParser;
var xpath = require('xpath');
var Loading=require("./loading")
var FieldChar=require("./field_char");
var FieldDecimal=require("./field_decimal");
var M2MAdd=require("./m2m_add");

var FieldMany2Many=React.createClass({
    getInitialState() {
        var f=ui_params.get_field(this.props.model,this.props.name);
        if (this.props.list_layout_el) {
            this.list_layout_el=this.props.list_layout_el;
        } else {
            var layout=ui_params.find_layout({model:f.relation,type:"list"});
            if (!layout) throw "List layout not found for model "+f.relation;
            var doc=new dom().parseFromString(layout.layout);
            this.list_layout_el=doc.documentElement;
        }
        return {show_modal:false,checked_items:{}};
    },

    componentDidMount() {
        this.load_data();
    },

    load_data: function() {
        var f=ui_params.get_field(this.props.model,this.props.name);
        var ctx={};
        var ids=this.props.data[this.props.name];
        var field_els=xpath.select("field", this.list_layout_el);
        var field_names=field_els.map(function(el) {
            var name=el.getAttribute("name");
            return name;
        });
        rpc.execute(f.relation,"read",[ids,field_names],{context:ctx},function(err,res) {
            if (err) throw err;
            this.setState({data:res});
        }.bind(this));
    },

    render() {
        if (!this.state.data) return <Loading/>
        var field_els=xpath.select("field", this.list_layout_el);
        var f=ui_params.get_field(this.props.model,this.props.name);
        var relation=f.relation;
        return <div>
            <div className="btn-toolbar">
                <button className="btn btn-sm btn-default" onClick={this.click_add}>Add</button>
                <button className="btn btn-sm btn-default" onClick={this.click_remove}>Remove</button>
            </div>
            <table className="table">
                <thead>
                    <tr>
                        <th style={{width:10}}><input type="checkbox" checked={this.state.check_all} onClick={this.on_check_all}/></th>
                        {field_els.map(function(el,i) {
                            var name=el.getAttribute("name");
                            var f=ui_params.get_field(relation,name);
                            return <th key={i}>{f.string}</th>
                        }.bind(this))}
                    </tr>
                </thead>
                <tbody>
                    {this.state.data.map(function(obj,i) {
                        return <tr key={i}>
                            <td><input type="checkbox" onClick={this.on_check.bind(this,obj.id)} checked={this.state.checked_items[obj.id]}/></td>
                            {field_els.map(function(el,i) {
                                var name=el.getAttribute("name");
                                var f=ui_params.get_field(relation,name);
                                var val=obj[name];
                                return <td key={i}>
                                    {function() {
                                        if (f.type=="char") {
                                            return <FieldChar model={relation} name={name} data={obj} edit_focus={true}/>;
                                        } else if (f.type=="text") {
                                            return <FieldChar model={relation} name={name} data={obj} edit_focus={true}/>;
                                        } else if (f.type=="boolean") {
                                            return <FieldChar model={relation} name={name} data={obj} edit_focus={true}/>;
                                        } else if (f.type=="integer") {
                                            return <FieldChar model={relation} name={name} data={obj} edit_focus={true}/>;
                                        } else if (f.type=="float") {
                                            return <FieldChar model={relation} name={name} data={obj} edit_focus={true}/>;
                                        } else if (f.type=="decimal") {
                                            return <FieldChar model={relation} name={name} data={obj} edit_focus={true}/>;
                                        } else if (f.type=="date") {
                                            return <FieldChar model={relation} name={name} data={obj} edit_focus={true}/>;
                                        } else if (f.type=="datetime") {
                                            return <FieldChar model={relation} name={name} data={obj} edit_focus={true}/>;
                                        } else if (f.type=="selection") {
                                            return <FieldChar model={relation} name={name} data={obj} edit_focus={true}/>;
                                        } else if (f.type=="file") {
                                            return <FieldChar model={relation} name={name} data={obj} edit_focus={true}/>;
                                        } else if (f.type=="many2one") {
                                            return <FieldChar model={relation} name={name} data={obj} edit_focus={true}/>;
                                        } else if (f.type=="reference") {
                                            return <FieldChar model={relation} name={name} data={obj} edit_focus={true}/>;
                                        } else {
                                            throw "Invalid field type: "+f.type;
                                        }
                                    }.bind(this)()}
                                </td>
                            }.bind(this))}
                        </tr>
                    }.bind(this))}
                </tbody>
            </table>
            <M2MAdd model={relation} show={this.state.show_modal} on_hide={this.close_modal} on_select={this.add_items}/>
        </div>
    },

    click_add: function(e) {
        e.preventDefault();
        this.setState({show_modal:true});
    },

    add_items: function(add_ids) {
        console.log("FieldMany2Many.add_items",add_ids);
        var prev_ids=this.props.data[this.props.name]||[];
        this.props.data[this.props.name]=prev_ids.concat(add_ids);
        this.load_data();
    },

    click_remove: function(e) {
        e.preventDefault();
        var ids=[];
        _.each(this.state.checked_items,(val,id)=>{
            if (val) ids.push(parseInt(id));
        });
        if (ids.length==0) {
            alert("No items selected");
            return;
        }
        var prev_ids=this.props.data[this.props.name]||[];
        this.props.data[this.props.name]=_.filter(prev_ids,(id)=>!this.state.checked_items[id]);
        this.load_data();
    },

    close_modal: function() {
        this.setState({show_modal:false});
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
});

module.exports=FieldMany2Many;
