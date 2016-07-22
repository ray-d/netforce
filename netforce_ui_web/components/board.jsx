var React = require("react");
var views=require("../views");
var dom = require('xmldom').DOMParser;
var xpath = require('xpath');
var ui_params=require("../ui_params");

var Action=require("./action2"); // XXX
console.log("YYY Action",Action);
var Loading=require("./loading");
console.log("YYY Loading",Loading);

var Board=React.createClass({
    propTypes: {
        title: React.PropTypes.string,
        layout: React.PropTypes.string,
    },

    getInitialState() {
        var layout=ui_params.get_layout(this.props.layout);
        var doc=new dom().parseFromString(layout.layout);
        var layout_el=doc.documentElement;
        return {
            layout_el: layout_el,
        };
    },

    render() {
        console.log("Board.render");
        var title=this.props.title;
        var panel_els=xpath.select("child::*", this.state.layout_el);
        return <div>
            <div className="page-header nf-page-header">
                <h1>{title}</h1>
            </div>
            {panel_els.map((panel_el,i)=>{
                if (panel_el.tagName!="panel") throw "Unexpected tag '"+panel_el.tagName+"' in board layout";
                var widget_els=xpath.select("child::*", panel_el);
                return <div key={i} className="row">
                    {widget_els.map((widget_el,j)=>{
                        if (widget_el.tagName!="widget") throw "Unexpected tag '"+widget_el.tagName+"' in panel layout";
                        var string=widget_el.getAttribute("string");
                        var action=widget_el.getAttribute("action");
                        var span=widget_el.getAttribute("span")||"6";
                        return <div key={j} className={"col-md-"+span}>
                            <div className="nf-board-widget-title"><h3>{string}</h3></div>
                            <Action action={action}/>
                        </div>
                    })}
                </div>
            })}
        </div>
    }
});

module.exports=Board;
views.register("board",Board);
