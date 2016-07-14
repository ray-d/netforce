var React= require("react");
var ui_params=require("../ui_params");
var utils=require("../utils");

var FieldSelect=React.createClass({
    getInitialState() {
        var f=ui_params.get_field(this.props.model,this.props.name);
        var val=this.props.data[this.props.name];
        var readonly=this.props.readonly?true:false;
        if (this.props.edit_focus) readonly=true;
        return {
            readonly: readonly,
            val: val,
        };
    },

    componentDidMount() {
    },

    render() {
        var f=ui_params.get_field(this.props.model,this.props.name);
        var val=this.props.data[this.props.name];
        var val_str=utils.fmt_field_val(val,f);
        if (this.state.readonly) {
            return <span onClick={this.click_readonly}>{val_str}</span>;
        } else {
            return <select className="form-control nf-field-input" ref={this.input_mounted} onBlur={this.on_blur} type="text" value={val} onChange={this.onchange}>
                <option value=""></option>
                {f.selection.map(function(o) {
                    return <option value={o[0]}>{o[1]}</option>
                }.bind(this))}
            </select>
        }
    },

    onchange(e) {
        console.log("field_select.on_change");
        var val=e.target.value;
        this.setState({val:val});
        console.log(this.props.name,"<=",val);
        this.props.data[this.props.name]=val;
    },

    click_readonly() {
        if (this.props.edit_focus) {
            this.setState({readonly:false});
        }
    },

    input_mounted(el) {
        if (this.props.edit_focus) {
            if (el) el.focus();
        }
    },

    on_blur() {
        if (this.props.edit_focus) {
            this.setState({readonly:true});
        }
    },
});

module.exports=FieldSelect;
