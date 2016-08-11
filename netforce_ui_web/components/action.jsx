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
require("./crosstab");
require("./labels");
require("./field_code");
require("./report");
require("./field_time")

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
        console.log("Action.componentWillReceiveProps",next_props);
        var action=next_props.action;
        this.action_el=null;
        this.setState({action:action});
    },

    render_action(action,context) {
        console.log("Action.render_action",action,context);
        var action=this.expand_action(action);
        console.log("exp action",action);
        if (!action.view) throw "Missing view in action";
        var view_class=views.get_view(action.view);
        var prop_types=view_class.propTypes||{};
        console.log("prop_types",prop_types);
        if (action.props) {
            var ctx=utils.get_cookies();
            Object.assign(action,utils.eval_json(action.props,ctx));
        }
        var props={};
        for (var n in action) {
            if (n=="name") continue;
            if (n=="view") continue;
            if (n=="module") continue;
            if (n=="target") continue;
            if (n=="props") continue;
            var f=prop_types[n];
            if (!f) {
                console.log("Warning: invalid prop '"+n+"' for view "+action.view);
                props[n]=action[n];
            } else {
                var s=action[n];
                var v;
                if (_.isString(s)) {
                    if (f==React.PropTypes.string) {
                        v=s;
                    } else if (f==React.PropTypes.number) {
                        v=JSON.parse(s);
                    } else if (f==React.PropTypes.array) {
                        v=JSON.parse(s);
                    } else if (f==React.PropTypes.object) {
                        v=JSON.parse(s);
                    } else {
                        console.log("Warning: invalid prop type '"+n+"' for view "+action.view);
                        v=s;
                    }
                } else {
                    v=s;
                }
                props[n]=v;
            }
        }
        if (action.target=="popup") {
            props.onclose_modal=this.onclose_modal;
        }
        props.key=(new Date()).getTime(); // force unmount of previous view
        props.context=Object.assign(props.context||{},context||{});
        console.log("props",props);
        var el=React.createElement(view_class,props);
        return el;
    },

    render: function() {
        console.log("===============================================================================");
        console.log("Action.render");
        console.log("action",this.state.action);
        console.log("popup_action",this.state.popup_action);
        if (!this.action_el) {
            this.action_el=this.render_action(this.state.action);
        }
        if (this.state.popup_action) {
            if (!this.popup_el) {
                this.popup_el=this.render_action(this.state.popup_action,this.state.popup_action_context);
            }
        } else {
            this.popup_el=null;
        }
        return <div>
            {this.action_el}
            {this.popup_el}
        </div>
    },

    onclose_modal() {
        this.setState({popup_action:null});
    },

    execute(action,context) {
        console.log("Action.execute",action,context);
        if (!context) context={}; 
        if (_.isString(action)) {
            action={name:action};
        }
        var exp_action=this.expand_action(action);
        if (exp_action.type=="download") {
            var url=exp_action.url;
            utils.download_url(url);
            return;
        }
        if (exp_action.target=="popup") {
            this.popup_el=null;
            this.setState({popup_action:action,popup_action_context:context});
        } else {
            this.action_el=null;
            this.setState({action:action});
            //this.props.update_history(action);
        }
    },

    update_history(action) {
        console.log("Action.update_history");
        return;
        if (!this.props.update_history) return;
        this.props.update_history(action);
    },

    get_action() {
        return this.state.action;
    },
})

module.exports=Action;
