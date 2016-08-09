var React= require("react");
var ui_params=require("../ui_params");
var utils=require("../utils");
var views=require("../views");
var _=require("underscore");
import brace from 'brace';
import AceEditor from 'react-ace';
import 'brace/mode/javascript';
import 'brace/mode/html';
import 'brace/mode/jsx';
import 'brace/theme/github';


var FieldCode=React.createClass({
    getInitialState() {
        var val=this.props.data[this.props.name];
        var readonly=this.props.readonly?true:false;
        if (this.props.model) {
            var f=ui_params.get_field(this.props.model,this.props.name);
            if (f.readonly) readonly=true;
        }
        if (this.props.edit_focus) readonly=true;
        this.editor_name=_.uniqueId("nf-code-editor-");
        return {
            readonly: readonly,
            val_str: val,
        };
    },

    componentDidMount() {
    },

    render() {
        return <AceEditor mode={this.props.mode} theme="github" name={this.editor_name} value={this.state.val_str} onChange={this.onchange} width={this.props.width} height={this.props.height}/>
    },

    onchange(new_val) {
        this.setState({val_str:new_val});
        this.props.data[this.props.name]=new_val;
    },

    click_readonly(e) {
        e.preventDefault();
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

module.exports=FieldCode;
views.register("field_code",FieldCode);
