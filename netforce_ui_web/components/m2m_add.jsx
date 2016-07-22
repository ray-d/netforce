var React= require("react");
var ui_params=require("../ui_params");
var utils=require("../utils");
var rpc=require("../rpc");
var dom = require('xmldom').DOMParser;
var xpath = require('xpath');
var Loading=require("./loading")
var FieldChar=require("./field_char");
var FieldDecimal=require("./field_decimal");
var Modal=require("react-bootstrap").Modal;
var Button=require("react-bootstrap").Button;
var List=require("./list")

var M2MAdd=React.createClass({
    getInitialState() {
        if (this.props.list_layout_el) {
            this.list_layout_el=this.props.list_layout_el;
        } else {
            var layout=ui_params.find_layout({model:this.props.model,type:"list"});
            if (!layout) throw "List layout not found for model "+f.relation;
            var doc=new dom().parseFromString(layout.layout);
            this.list_layout_el=doc.documentElement;
        }
        return {};
    },

    componentDidMount() {
        console.log("M2MAdd.componentDidMount");
        this.load_data();
    },

    load_data: function() {
        console.log("M2MAdd.load_data");
        var ctx={};
        var field_els=xpath.select("field", this.list_layout_el);
        var field_names=field_els.map(function(el) {
            var name=el.getAttribute("name");
            return name;
        });
        rpc.execute(this.props.model,"search_read",[[],field_names],{context:ctx},function(err,res) {
            if (err) throw err;
            this.setState({data:res});
        }.bind(this));
    },

    render() {
        console.log("M2MAdd.render");
        if (!this.state.data) return <Loading/>;
        var field_els=xpath.select("field", this.list_layout_el);
        return <Modal show={this.props.show} onHide={this.props.on_hide}>
            <Modal.Header closeButton>
                <Modal.Title>Add Items</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <List model={this.props.model} on_selection_changed={this.selection_changed}/>
            </Modal.Body>
            <Modal.Footer>
                <Button bsStyle="primary" onClick={this.select_items}>Select</Button>
                <Button onClick={this.props.on_hide}>Cancel</Button>
            </Modal.Footer>
        </Modal>
    },

    selection_changed(ids) {
        this.setState({select_ids:ids});
    },

    select_items() {
        var ids=this.state.select_ids||[];
        if (ids.length==0) alert("No items selected");
        if (this.props.on_select) this.props.on_select(ids);
        if (this.props.on_hide) this.props.on_hide();
    },
});

module.exports=M2MAdd;
