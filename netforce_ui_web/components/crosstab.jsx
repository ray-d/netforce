var React = require("react");
var views=require("../views");
var dom = require('xmldom').DOMParser;
var xpath = require('xpath');
var ui_params=require("../ui_params");

var Crosstab=React.createClass({
    propTypes: {
        title: React.PropTypes.string,
        model: React.PropTypes.string,
        condition: React.PropTypes.array,
        group_field: React.PropTypes.string,
        subgroup_field: React.PropTypes.string,
        height: React.PropTypes.string,
    },

    getInitialState() {
        return {};
    },

    render() {
        console.log("Crosstab.render");
        return <div>TODO</div>
    }
});

module.exports=Crosstab;
views.register("crosstab",Crosstab);
