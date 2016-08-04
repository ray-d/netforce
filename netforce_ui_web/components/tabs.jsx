var React= require("react");
var ui_params=require("../ui_params");
var rpc=require("../rpc");
var dom = require('xmldom').DOMParser;
var xpath = require('xpath');
var Loading=require("./loading")
var classNames = require('classnames');

var Tabs=React.createClass({
    mixins: [ui_params],

    getInitialState() {
        return {active_tab:0};
    },

    componentDidMount() {
    },

    render() {
        console.log("Tabs.render");
        var FormLayout=require("./form_layout"); // XXX
        var tab_els=xpath.select("child::*", this.props.layout_el);
        return <div>
            <ul className="nav nav-tabs">
                {tab_els.map(function(el,i) {
                    return <li key={i} className={i==this.state.active_tab?"active":null}><a href="#" onClick={this.click_tab.bind(this,i)}>{el.getAttribute("string")}</a></li>
                }.bind(this))}
            </ul>
            <FormLayout model={this.props.model} layout_el={tab_els[this.state.active_tab]} data={this.props.data}/>
        </div>
    },

    click_tab(tab_no) {
        this.setState({active_tab:tab_no});
    },
});

module.exports=Tabs;
