var React= require("react");

var Loading=React.createClass({
    render() {
        if (this.props.small) return <img src={require("../img/spinner.gif")}/>;
        return <p><img src={require("../img/spinner.gif")}/> Loading...</p>;
    }
});

module.exports=Loading;
