var React = require("react");
var ui_params=require("../ui_params");
var utils=require("../utils");

var FieldDecimal=React.createClass({
    getInitialState() {
        var f=ui_params.get_field(this.props.model,this.props.name);
        var val=this.props.data[this.props.name];
        var val_str=utils.fmt_field_val(val,f);
        return {
            val_str: val_str,
        };
    },

    componentDidMount() {
    },

    render() {
        return <div>
            <input className="form-control" type="text" value={this.state.val_str} onChange={this.onchange}/>
        </div>
    },

    onchange(e) {
        var val_str=e.target.value;
        if (val_str=="" || !isNaN(val_str)) {
            if (val_str=="") val=null;
            else val=parseFloat(val_str);
            this.setState({val_str:val_str});
            this.props.data[this.props.name]=val;
        }
    },
});

module.exports=FieldDecimal;
