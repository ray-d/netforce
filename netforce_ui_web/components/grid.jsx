var React= require("react");
var ui_params=require("../ui_params");
var rpc=require("../rpc");
var utils=require("../utils");
var views=require("../views");
var dom = require('xmldom').DOMParser;
var xpath = require('xpath');
var Loading=require("./loading")
var classNames = require('classnames');
var _=require("underscore");
var Search=require("./search")
var FieldChar=require("./field_char")
var FieldMany2One=require("./field_many2one")
var Pagination=require("./pagination")

var Grid=React.createClass({
    getInitialState() {
        console.log("Grid.getInitialState");
        var layout;
        if (this.props.layout) {
            layout=ui_params.get_layout(this.props.layout);
        } else {
            layout=ui_params.find_layout({model:this.props.model,type:"grid"});
            if (!layout) throw "Grid layout not found for model "+this.props.model;
        }
        var doc=new dom().parseFromString(layout.layout);
        var layout_el=doc.documentElement;
        this.item_width=parseInt(layout_el.getAttribute("width"))||200;
        this.image_field=layout_el.getAttribute("image_field");
        if (!this.image_field) throw "Missing image_field in grid layout";
        this.title_field=layout_el.getAttribute("title_field");
        this.subtitle_field=layout_el.getAttribute("subtitle_field");
        this.description_field=layout_el.getAttribute("description_field");
        return {
            layout_el: layout_el,
            checked_items: {},
            offset: 0,
            limit: 100,
        };
    },

    componentDidMount() {
        console.log("Grid.componentDidMount");
        this.load_data();
    },

    load_data() {
        console.log("Grid.load_data");
        var cond=this.props.condition||[];
        console.log("cond",cond);
        var field_names=[this.image_field];
        if (this.title_field) field_names.push(this.title_field);
        if (this.subtitle_field) field_names.push(this.subtitle_field);
        if (this.description_field) field_names.push(this.description_field);
        this.setState({data:null});
        var ctx={};
        var opts={
            count: true,
            order: this.props.order,
            offset: this.state.offset,
            limit: this.state.limit,
            context: ctx,
        };
        rpc.execute(this.props.model,"search_read",[cond,field_names],opts,function(err,res) {
            this.setState({data:res[0],count:res[1]});
        }.bind(this));
    },

    render() {
        console.log("Grid.render");
        if (!this.state.data) return <Loading/>;
        if (this.state.data.length==0) return <p>There are no items to display.</p>
        var child_els=xpath.select("child::*",this.state.layout_el);
        var items=[];
        _.each(this.state.data,(obj)=>{
            var item={
                obj: obj,
                image: obj[this.image_field],
                title: obj[this.title_field],
                description: obj[this.description_field],
            }
            items.push(item);
        });
        return <div style={{marginTop:10}}>
            <div>
                {items.map((item)=>{
                    var url=rpc.get_file_uri(item.image);
                    return <div style={{display:"inline-block",verticalAlign:"top",width:this.item_width,marginRight:18}}>
                        <div className="thumbnail" onClick={this.on_select.bind(this,item.obj.id)}>
                            <img src={url}/>
                            <div className="caption">
                                <h3 className="nf-grid-title">{item.title}</h3>
                                <p className="nf-grid-description">{item.description}</p>
                            </div>
                        </div>
                    </div>
                })}
            </div>
            <Pagination limit={this.state.limit} offset={this.state.offset} count={this.state.count} onchange_limit={this.change_limit} onchange_offset={this.change_offset}/>
        </div>
    },

    on_select(active_id) {
        if (this.props.on_select) {
            this.props.on_select(active_id);
        }
    },

    change_limit: function(limit) {
        this.setState({limit:limit},function() {
            this.load_data();
        }.bind(this));
    },

    change_offset: function(offset) {
        this.setState({offset:offset},function() {
            this.load_data();
        }.bind(this));
    },
});

module.exports=Grid;
