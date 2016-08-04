'use strict'

var React = require('react')
var utils=require("../utils");
var ui_params=require("../ui_params");
var views=require("../views");
var _=require("underscore");

require("./list_container");
require("./form_popup");
require("./board");
require("./chart");

var Action = React.createClass({
    childContextTypes: {
        action_view: React.PropTypes.object,
    },

    getChildContext() {
        return {action_view:this};
    },

    getInitialState() {
        console.log("Action.getInitialState");
        if (!this.props.action) throw "Missing action prop";
        var action=this.props.action;
        if (_.isString(action)) {
            action={name:action};
        }
        return {action:action};
    },

    expand_action(action) {
        if (action.name) {
            action=Object.assign({},ui_params.get_action(action.name),action);
        }
        return Object.assign({},action);
    },

    componentWillReceiveProps(next_props) {
        var action=next_props.action;
        this.setState({action:action});
    },

    render_action(action) {
        console.log("Action.render_action",action);
        var action=this.expand_action(action);
        console.log("exp action",action);
        if (!action.view) throw "Missing view in action";
        var view_class=views.get_view(action.view);
        var prop_types=view_class.propTypes||{};
        console.log("prop_types",prop_types);
        var props={};
        for (var n in action) {
            if (n=="name") continue;
            if (n=="view") continue;
            if (n=="module") continue;
            if (n=="target") continue;
            var f=prop_types[n];
            if (!f) throw "Invalid prop '"+n+"' for view "+action.view;
            var s=action[n];
            var v;
            if (f==React.PropTypes.string) {
                v=s;
            } else if (f==React.PropTypes.number) {
                v=JSON.parse(s);
            } else if (f==React.PropTypes.array) {
                v=JSON.parse(s);
            } else if (f==React.PropTypes.object) {
                v=JSON.parse(s);
            } else {
                throw "Invalid prop type '"+n+"' for view "+action.view;
            }
            props[n]=v;
        }
        if (action.target=="popup") {
            props.onclose_modal=this.onclose_modal;
        }
        props.key=(new Date()).getTime(); // force unmount of previous view
        console.log("props",props);
        var el=React.createElement(view_class,props);
        return el;
    },

    render: function() {
        console.log("Action.render");
        console.log("action",this.state.action);
        console.log("popup_action",this.state.popup_action);
        var el=this.render_action(this.state.action);
        if (!this.state.popup_action) return el;
        var popup_el=this.render_action(this.state.popup_action);
        return <div>
            {el}
            {popup_el}
        </div>
    },

    onclose_modal() {
        this.setState({popup_action:null});
    },

    execute(action) {
        console.log("Action.execute",action);
        if (_.isString(action)) {
            action={name:action};
        }
        var exp_action=this.expand_action(action);
        if (exp_action.target=="popup") {
            this.setState({popup_action:action});
        } else {
            this.setState({action:action});
            this.update_history(action);
        }
    },

    get_action() {
        return this.state.action;
    },

    update_history(action) { // XXX TODO: should not rerender, just update URL...
        if (this.props.update_history) {
            this.props.update_history(action);
        }
    },
})

module.exports=Action;
