var React= require("react");
var ui_params=require("../ui_params");
var rpc=require("../rpc");
var dom = require('xmldom').DOMParser;
var xpath = require('xpath');
var Loading=require("./loading")
var classNames = require('classnames');

var Group=React.createClass({
    mixins: [ui_params],

    getInitialState() {
        return {};
    },

    componentDidMount() {
    },

    render() {
        var FormLayout=require("./form_layout");
        console.log("Group.render");
        return <div>
            <FormLayout model={this.props.model} layout_el={this.props.layout_el} data={this.props.data}/>
        </div>
    },
});

module.exports=Group;
