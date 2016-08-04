var React= require("react");
var views=require("../views");

var Labels=React.createClass({
    render() {
        var val=this.props.data[this.props.name];
        return <span>
            {val.map((obj)=>{
                return <span className="label label-default" style={{backgroundColor:obj.color,marginRight:2}}>{obj.name}</span>
            })}
        </span>
    },
});

module.exports=Labels;
views.register("labels",Labels);
