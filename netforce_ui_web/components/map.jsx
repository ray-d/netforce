var React= require("react");
var ui_params=require("../ui_params");
var rpc=require("../rpc");
var utils=require("../utils");
var dom = require('xmldom').DOMParser;
var xpath = require('xpath');
var Loading=require("./loading")
var classNames = require('classnames');
var _=require("underscore");

var Map=React.createClass({
    getInitialState() {
        var layout;
        if (this.props.layout) {
            layout=ui_params.get_layout(this.props.layout);
        } else {
            layout=ui_params.find_layout({model:this.props.model,type:"map"});
            if (!layout) throw "Map layout not found for model "+this.props.model;
        }
        var doc=new dom().parseFromString(layout.layout);
        var layout_el=doc.documentElement;
        this.coords_field=layout_el.getAttribute("coords_field");
        if (!this.coords_field) throw "Missing coords field in map layout";
        this.title_field=layout_el.getAttribute("title_field");
        this.short_title_field=layout_el.getAttribute("short_title_field");
        this.group_field=layout_el.getAttribute("group_field");
        this.markers=[];
        this.lines=[];
        return {
            layout_el: layout_el,
            checked_items: {},
        };
    },

    componentDidMount() {
        this.load_data();
    },

    load_data() {
        console.log("Map.load_data");
        var cond=this.props.condition||[];
        var field_els=xpath.select("field", this.state.layout_el);
        var field_names=[this.coords_field];
        if (this.group_field) field_names.push(this.group_field);
        field_els.forEach(function(el) {
            var name=el.getAttribute("name");
            field_names.push(name);
        });
        this.setState({data:null});
        var ctx={};
        rpc.execute(this.props.model,"search_read",[cond,field_names],{count:true,offset:this.state.offset,limit:this.state.limit,context:ctx},function(err,res) {
            this.setState({data:res[0],count:res[1]});
        }.bind(this));
    },

    render: function() {
        console.log("Map.render");
        if (!this.state.data) return <Loading/>;
        if (this.state.data.length==0) return <p>There are no items to display.</p>;
        setTimeout(()=>this.show_markers(),200); // XXX
        return <div style={{height:500,marginTop:10}} ref={this.init_map}/>
    },

    init_map: function(el) {
        if (!el) return;
        var opts={
            center: {lat: 13.7563, lng: 100.6018},
            zoom: 12,
        };
        this.map = new google.maps.Map(el,opts);
    },

    show_markers: function() {
        console.log("show_markers",this.props.data);
        if (!this.map) return;
        _.each(this.markers,function(marker) {
            marker.setMap(null);
        });
        this.markers=[];
        _.each(this.lines,function(line) {
            line.setMap(null);
        });
        this.lines=[];
        var routes={};
        _.each(this.state.data,function(obj) {
            var coords=obj[this.coords_field];
            if (!coords) return;
            var r=coords.split(",");
            var pos={
                lat: parseFloat(r[0]),
                lng: parseFloat(r[1]),
            };
            var color="ff0000";
            var title;
            if (this.title_field) title=obj[this.title_field];
            else title="";
            var short_title;
            if (this.short_title_field) short_title=obj[this.short_title_field];
            else short_title="";
            var marker=new google.maps.Marker({
                position: pos,
                map: this.map,
                title: title,
                icon: "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld="+short_title+"|"+color+"|333333",
            });
            this.markers.push(marker);
            if (this.group_field) {
                var group_val=obj[this.group_field];
                var group_id;
                if (_.isArray(group_val)) group_id=group_val[0];
                else group_id=group_val;
                if (group_id) {
                    if (!routes[group_id]) routes[group_id]=[];
                    var path=routes[group_id];
                    path.push(pos);
                }
            }
        }.bind(this));
        console.log("routes",routes);
        for (var group_id in routes) {
            var path=routes[group_id];
            var line=new google.maps.Polyline({
                path: path,
                geodesic: true,
                strokeColor: "#666666",
                strokeOpacity: 1,
                strokeWeight: 2,
            });
            line.setMap(this.map);
            this.lines.push(line);
        }
    }
});

module.exports=Map;
