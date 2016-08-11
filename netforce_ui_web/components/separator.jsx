var React= require("react");

var Separator=React.createClass({
    render() {
        return <div style={{borderBottom:"1px solid #ccc",marginBottom:10,marginTop:10,clear:"both",fontWeight:"bold"}}>
                {this.props.string}
        </div>;
    }
});

module.exports=Separator;
