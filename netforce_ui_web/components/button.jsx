var React = require("react");
var ui_params=require("../ui_params");
var utils=require("../utils");
var rpc=require("../rpc");
var Loading=require("./loading");
var _=require("underscore");

var Button=React.createClass({
    getInitialState() {
        return {loading:false};
    },

    componentDidMount() {
    },

    render() {
        return <button className={"btn btn-"+(this.props.type||"default")+" btn-"+(this.props.size||"md")} style={{marginRight:10}} onClick={this.on_click}>
            {function() {
                if (this.state.loading) return <Loading small={true}/>;
                if (this.props.icon) return [<span className={"glyphicon glyphicon-"+this.props.icon} style={{marginRight:5}}/>,this.props.string];
                return this.props.string;
            }.bind(this)()}
        </button>
    },

    on_click(e) {
        console.log("Button.on_click");
        e.preventDefault();
        if (this.state.loading) return;
        if (this.props.on_click) {
            this.setState({loading:true});
            this.props.on_click(()=>{
                this.setState({loading:false});
            });
        }
    },
});

module.exports=Button;
