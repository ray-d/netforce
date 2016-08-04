var React= require("react");
var ui_params=require("../ui_params");
var utils=require("../utils");
var rpc=require("../rpc");
var dom = require('xmldom').DOMParser;
var xpath = require('xpath');
var Loading=require("./loading")
var FieldChar=require("./field_char");
var FieldDecimal=require("./field_decimal");

var FieldOne2Many=React.createClass({
    getInitialState() {
        var f=ui_params.get_field(this.props.model,this.props.name);
        if (this.props.list_layout_el) {
            this.list_layout_el=this.props.list_layout_el;
        } else {
            layout=ui_params.find_layout({model:f.relation,type:"list"});
            if (!layout) throw "List layout not found for model "+f.relation;
            var doc=new dom().parseFromString(layout.layout);
            this.list_layout_el=doc.documentElement;
        }
        return {};
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
            <table className="table">
                <thead>
                    <tr>
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
        </div>
    },
});

module.exports=FieldOne2Many;
