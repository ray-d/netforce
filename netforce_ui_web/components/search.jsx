var React= require("react");
var ui_params=require("../ui_params");
var utils=require("../utils");
var _=require("underscore")
var dom = require('xmldom').DOMParser;
var xpath = require('xpath');
var FieldChar=require("./field_char");
var FieldDecimal=require("./field_decimal");
var FieldSelect=require("./field_select");
var FieldMany2One=require("./field_many2one");
var FieldDateRange=require("./field_date_range");

var Search=React.createClass({
    mixins: [ui_params],

    getInitialState() {
        if (this.props.search_fields) {
            var layout=this.make_search_view(this.props.search_fields);
        } else {
            var layout=this.make_default_search_view(this.props.model);
        }
        var doc=new dom().parseFromString(layout);
        var layout_el=doc.documentElement;
        return {layout_el:layout_el,data:{}};
    },

    componentDidMount() {
    },

    render() {
        var field_els=xpath.select("field",this.state.layout_el);
        var cols=[];
        var rows=[];
        field_els.forEach((el,i) => {
            var name=el.getAttribute("name");
            var f=ui_params.get_field_by_path(this.props.model,name);
            if (f.type=="char") {
                var field_component=<FieldChar model={this.props.model} name={name} data={this.state.data}/>;
            } else if (f.type=="text") {
                var field_component=<FieldChar model={this.props.model} name={name} data={this.state.data}/>;
            } else if (f.type=="boolean") {
                var field_component=<FieldChar model={this.props.model} name={name} data={this.state.data}/>;
            } else if (f.type=="integer") {
                var field_component=<FieldChar model={this.props.model} name={name} data={this.state.data}/>;
            } else if (f.type=="float") {
                var field_component=<FieldChar model={this.props.model} name={name} data={this.state.data}/>;
            } else if (f.type=="decimal") {
                var field_component=<FieldChar model={this.props.model} name={name} data={this.state.data}/>;
            } else if (f.type=="date") {
                var field_component=<FieldDateRange model={this.props.model} name={name} data={this.state.data}/>;
            } else if (f.type=="datetime") {
                var field_component=<FieldDateRange model={this.props.model} name={name} data={this.state.data}/>;
            } else if (f.type=="selection") {
                var field_component=<FieldSelect model={this.props.model} name={name} data={this.state.data}/>;
            } else if (f.type=="file") {
                var field_component=<FieldChar model={this.props.model} name={name} data={this.state.data}/>;
            } else if (f.type=="many2one") {
                var field_component=<FieldMany2One model={this.props.model} name={name} data={this.state.data}/>;
            } else if (f.type=="reference") {
                var field_component=<FieldChar model={this.props.model} name={name} data={this.state.data}/>;
            } else {
                throw "Invalid field type: "+f.type;
            }
            var col=<div key={cols.length} className="col-sm-2">
                <div className="form-group">
                    <label className="control-label nf-field-label">{f.string}</label>
                    {field_component}
                </div>
            </div>
            cols.push(col);
        });
        rows.push(<div key={rows.length} className="row">{cols}</div>);
        return <div className="panel panel-default nf-search" style={{margin:"10px 0"}}>
            <div className="panel-body">
                {rows}
                <button className="btn btn-primary" onClick={this.search}>Search</button>
                <button className="btn btn-default" style={{marginLeft:5}} onClick={this.close}>Close</button>
            </div>
        </div>
    },

    close(e) {
        e.preventDefault();
        if (this.props.on_close) this.props.on_close();
    },

    search(e) {
        e.preventDefault();
        var cond=this.get_search_cond();
        if (this.props.on_search) this.props.on_search(cond);
    },

    get_search_cond() {
        console.log("get_search_cond");
        var cond=[];
        for (var name in this.state.data) {
            var v=this.state.data[name];
            if (v==null) return;
            var f=ui_params.get_field_by_path(this.props.model,name);
            var clause=[];
            if (f.type=="char") {
                clause=[name,"ilike",v];
            } else if (f.type=="text") {
                clause=[name,"ilike",v];
            } else if (f.type=="integer") {
                clause=[name,"=",v]; // XXX
            } else if (f.type=="float") {
                clause=[name,"=",v]; // XXX
            } else if (f.type=="decimal") {
                clause=[name,"=",v]; // XXX
            } else if (f.type=="date") {
                clause=[];
                if (v[0]) clause.push([name,">=",v[0]]);
                if (v[1]) clause.push([name,"<=",v[1]]);
            } else if (f.type=="datetime") {
                clause=[];
                if (v[0]) clause.push([name,">=",v[0]+" 00:00:00"]);
                if (v[1]) clause.push([name,"<=",v[1]+" 23:59:59"]);
            } else if (f.type=="selection") {
                clause=[name,"=",v];
            } else if (f.type=="many2one") {
                clause=[name,"=",v[0]]
            } else if (f.type=="reference") {
                clause=[name,"=",v[0]]
            } else {
                throw "Invalid search field type: "+f.type;
            }
            cond.push(clause);
        }
        console.log("cond",cond);
        return cond;
    },

    make_default_search_view() {
        var req_fields=[];
        var other_fields=[];
        var m=ui_params.get_model(this.props.model);
        _.each(m.fields,function(f,n) {
            if (f.search) {
                if (f.required) {
                    req_fields.push(n);
                } else {
                    other_fields.push(n);
                }
            }
        });
        req_fields=_.sortBy(req_fields,function(n) {return ui_params.get_field(this.props.model,n).string}.bind(this));
        other_fields=_.sortBy(other_fields,function(n) {return ui_params.get_field(this.props.model,n).string}.bind(this));
        var fields=[];
        _.each(req_fields,function(n) {
            fields.push({name:n});
        });
        _.each(other_fields,function(n) {
            fields.push({name:n});
        });
        var layout="<search>";
        _.each(fields,function(f) {
            layout+='<field name="'+f.name+'"/>';
        });
        layout+="</search>";
        return layout;
    },

    make_search_view(fields) {
        var layout="<search>";
        _.each(fields,function(n) {
            layout+='<field name="'+n+'"/>';
        });
        layout+="</search>";
        return layout;
    },
});

module.exports=Search;
