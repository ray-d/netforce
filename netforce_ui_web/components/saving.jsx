var React= require("react");

var Saving=React.createClass({
    render() {
        return <p><img src={require("../img/spinner.gif")}/> Saving...</p>
    }
});

module.exports=Saving;
