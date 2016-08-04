var React= require("react");
var ui_params=require("../ui_params");
var utils=require("../utils");
var rpc=require("../rpc");
var dom = require('xmldom').DOMParser;
var xpath = require('xpath');
var Loading=require("./loading")
var RelatedForm=require("./related_form")
var List=require("./list")

var RelatedO2M=React.createClass({
    getInitialState() {
        return {list_key:0};
    },

    componentDidMount() {
    },

    render() {
        var f=ui_params.get_field(this.props.model,this.props.name);
        var relation=f.relation;
        var fr=ui_params.get_field(f.relation,f.relfield);
        var cond;
        if (fr.type=="many2one") {
            cond=[[f.relfield,"=",this.props.active_id]];
        } else if (fr.type=="reference") {
            cond=[[f.relfield,"=",this.props.model+","+this.props.active_id]];
        } else {
            throw "Invalid related field type: "+fr.type;
        }
        return <div>
            <div className="nf-related-header">
                <h2>{f.string}</h2>
            </div>
            {function() {
                if (this.state.show_form) {
                    return <RelatedForm model={f.relation} active_id={this.state.active_id} relfield={f.relfield} parent_model={this.props.model} parent_id={this.props.active_id} on_save={this.on_save} on_cancel={this.on_cancel}/>
                } else {
                    return <div className="btn-toolbar">
                        <button className="btn btn-sm btn-default" onClick={this.click_add}>Add</button>
                        <button className="btn btn-sm btn-default" onClick={this.click_delete}>Delete</button>
                    </div>
                }
            }.bind(this)()}
            <List key={this.state.list_key} model={relation} on_select={this.on_select} condition={cond} on_selection_changed={this.on_selection_changed}/>
        </div>
    },

    click_add: function() {
        this.setState({show_form:true,active_id:null});
    },

    on_select: function(active_id) {
        this.setState({show_form:true,active_id:active_id});
    },

    click_delete: function() {
        var ids=this.select_ids||[];
        this.call_method(ids,"delete");
    },

    call_method(ids,method) {
        if (ids.length==0) {
            this.setState({"error": "No items selected."});
            return;
        }
        var f=ui_params.get_field(this.props.model,this.props.name);
        var relation=f.relation;
        var ctx={};
        rpc.execute(relation,method,[ids],{context:ctx},function(err,res) {
            if (err) {
                this.setState({"error": err});
                return;
            }
            this.setState({list_key:this.state.list_key+1});
        }.bind(this));
    },

    on_save: function() {
        this.setState({show_form:false});
        this.setState({list_key:this.state.list_key+1});
    },

    on_cancel: function() {
        this.setState({show_form:false});
    },

    on_selection_changed(ids) {
        this.select_ids=ids;
    },
});

module.exports=RelatedO2M;
