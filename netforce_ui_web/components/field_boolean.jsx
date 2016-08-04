var React = require("react");
var ui_params=require("../ui_params");
var utils=require("../utils");

var FieldBoolean=React.createClass({
    getInitialState() {
        var f=ui_params.get_field(this.props.model,this.props.name);
        var readonly=this.props.readonly?true:false;
        if (f.readonly) readonly=true;
        if (this.props.edit_focus) readonly=true;
        var val=this.props.data[this.props.name];
        return {
            readonly: readonly,
            value: val,
        };
    },

    componentDidMount() {
    },

    render() {
        console.log("FieldBoolean.render");
        var val=this.props.data[this.props.name];
        if (this.state.readonly) {
            return <span>{val?"Y":"N"}</span>
        } else {
            return <input type="checkbox" checked={val?true:false} onClick={this.onchange}/>
        }
    },

    onchange(e) {
        console.log("FieldBoolean.onchange");
        var val=e.target.checked;
        console.log("val",val);
        this.setState({value:val});
        this.props.data[this.props.name]=val;
    },
});

module.exports=FieldBoolean;
