var React = require("react");
var ui_params=require("../ui_params");
var utils=require("../utils");
var views=require("../views");

require("eonasdan-bootstrap-datetimepicker");
require("eonasdan-bootstrap-datetimepicker/build/css/bootstrap-datetimepicker.css")

var FieldTime=React.createClass({
    getInitialState() {
        var val=this.props.data[this.props.name];
        return {
            date: val,
        };
    },

    componentDidMount() {
    },

    render() {
        return <div>
            <input className="form-control nf-field-input" value={this.state.date} onChange={this.onchange_date} ref={this.render_date}/>
        </div>
    },

    render_date(el) {
        $(el).datetimepicker({
            format: "HH:mm",
        }).on("dp.change",(e)=>{
            console.log("date dp.change",e);
            var val=e.date.format("HH:mm");
            console.log("val",val);
            this.setState({date:val},()=>{
                this.props.data[this.props.name]=this.state.date;
            });
        });
        if (!el) return;
    },

    onchange_date(e) {
        console.log("onchange_date");
        var val=e.target.value;
        console.log("val",val);
        this.setState({date:val},()=>{
            this.props.data[this.props.name]=this.state.date;
        });
    },
});

module.exports=FieldTime;
views.register("field_time",FieldTime);
