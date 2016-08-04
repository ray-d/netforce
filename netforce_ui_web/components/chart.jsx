var React = require("react");
var ui_params=require("../ui_params");
var rpc=require("../rpc");
var views=require("../views");
var dom = require('xmldom').DOMParser;
var xpath = require('xpath');
var Loading=require("./loading")
var Highcharts = require('highcharts');
var ReactHighcharts = require('react-highcharts');

var Chart=React.createClass({
    propTypes: {
        title: React.PropTypes.string,
        chart_type: React.PropTypes.string,
        model: React.PropTypes.string,
        method: React.PropTypes.string,
        height: React.PropTypes.number,
    },

    getInitialState() {
        return {data:null};
    },

    componentDidMount() {
        this.load_data();
    },

    load_data() {
        console.log("Chart.load_data");
        rpc.execute(this.props.model,this.props.method,[],{},(err,data)=>{
            if (err) {
                alert("Error: "+err);
                return;
            }
            console.log("=> data",data);
            this.setState({data:data});
        });
    },

    render() {
        console.log("Chart.render");
        if (!this.state.data) return <Loading/>
        if (this.props.chart_type=="line") {
            var config={
                chart: {
                    type: "spline",
                    height: this.props.height,
                },
                title: {
                    text: this.props.title,
                },
                xAxis: {
                    type: "datetime"
                },
                yAxis: {
                    title: {
                        enabled: false,
                        text: ""
                    }
                },
                series: this.state.data,
                legend: {
                    enabled: true,
                },
                tooltip: {
                    formatter: function() {
                        return Highcharts.dateFormat("%A, %b %e %Y",this.x)+"<br><b>"+Highcharts.numberFormat(this.y,2)+"</b>";
                    }
                },
                credits: {
                    enabled: false
                }
            }
        } else {
            throw "Invalid chart type '"+this.props.chart_type+"'";
        }
        return <ReactHighcharts config={config}/>
    },
});

module.exports=Chart;
views.register("chart",Chart);
