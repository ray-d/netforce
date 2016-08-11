var React = require("react");
var ui_params=require("../ui_params");
var utils=require("../utils");

require("eonasdan-bootstrap-datetimepicker");
require("eonasdan-bootstrap-datetimepicker/build/css/bootstrap-datetimepicker.css")

var FieldDateRange=React.createClass({
    getInitialState() {
        var val=this.props.data[this.props.name];
        return {
            date_from: val?val[0]:null,
            date_to: val?val[1]:null,
        };
    },

    componentDidMount() {
    },

    render() {
        return <div>
            <input className="form-control nf-field-input" value={this.state.date_from} onChange={this.onchange_date_from} style={{width:70,display:"inline-block"}} ref={this.render_date_from}/>
            -
            <input className="form-control nf-field-input" value={this.state.date_to} onChange={this.onchange_date_to} style={{width:70,display:"inline-block"}} ref={this.render_date_to}/>
        </div>
    },

    render_date_from(el) {
        $(el).datetimepicker({
            format: "YYYY-MM-DD",
        }).on("dp.change",(e)=>{
            console.log("date_from dp.change",e);
            var val=e.date.format("YYYY-MM-DD");
            console.log("val",val);
            this.setState({date_from:val},()=>{
                this.props.data[this.props.name]=[this.state.date_from,this.state.date_to];
            });
        });
        if (!el) return;
    },

    render_date_to(el) {
        $(el).datetimepicker({
            format: "YYYY-MM-DD",
        }).on("dp.change",(e)=>{
            console.log("date_to dp.change",e);
            var val=e.date.format("YYYY-MM-DD");
            console.log("val",val);
            this.setState({date_to:val},()=>{
                this.props.data[this.props.name]=[this.state.date_from,this.state.date_to];
            });
        });
        if (!el) return;
    },

    onchange_date_from(e) {
        console.log("onchange_date_from");
        var val=e.target.value;
        console.log("val",val);
        this.setState({date_from:val},()=>{
            this.props.data[this.props.name]=[this.state.date_from,this.state.date_to];
        });
    },

    onchange_date_to(e) {
        console.log("onchange_date_to");
        var val=e.target.value;
        console.log("val",val);
        this.setState({date_to:val},()=>{
            this.props.data[this.props.name]=[this.state.date_from,this.state.date_to];
        });
    },
});

module.exports=FieldDateRange;
