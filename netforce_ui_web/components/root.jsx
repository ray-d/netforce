var React= require("react");
var Menu=require("./menu")
var Loading=require("./loading")
var MultiView=require("./multi_view")
var ui_params=require("../ui_params");

var Root=React.createClass({
    getInitialState() {
        return {ui_params_loaded:false};
    },

    componentDidMount() {
        ui_params.load_ui_params(null,function(err) {
            if (err) {
                alert("ERROR: "+err);
                return;
            }
            this.setState({ui_params_loaded:true});
        }.bind(this));
    },

    render() {
        if (!this.state.ui_params_loaded) return <Loading/>; 
        return <div>
            <p>blablabla</p>
            <p>HELLO</p>
            <MultiView title="Invoices" model="account.invoice" list_layout="cust_invoice_list" form_layout="cust_invoice_form" tabs={[["All",[]],["Draft",[["state","=","draft"]]],["Approved",[["state","=","approved"]]]]} group_field="contact_id"/>
        </div>
    },
});

module.exports=Root;
