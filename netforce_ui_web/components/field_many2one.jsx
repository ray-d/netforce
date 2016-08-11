var React= require("react");
var ui_params=require("../ui_params");
var utils=require("../utils");
var rpc=require("../rpc");
var Saving=require("./saving");
var $=require("jquery");

var FieldMany2One=React.createClass({
    getInitialState() {
        var f=ui_params.get_field_by_path(this.props.model,this.props.name);
        var val=this.props.data[this.props.name];
        var val_str=utils.fmt_field_val(val,f);
        var readonly=this.props.readonly?true:false;
        if (this.props.edit_focus) readonly=true;
        var link_action=ui_params.find_details_action(f.relation);
        var show_link=link_action!=null && !this.props.no_link;
        return {
            readonly: readonly,
            val_str: val_str,
            show_menu: false,
            show_link: show_link,
        };
    },

    contextTypes: {
        action_view: React.PropTypes.object,
    },

    componentDidMount() {
        window.addEventListener("click",this.click_page,false);
    },

    componentWillUnmount () {
        window.removeEventListener('click', this.click_page)
    },

    render() {
        if (this.state.readonly) {
            return <a href="#" style={{color:"#333"}} onClick={this.click_readonly}>{this.state.val_str}</a>;
        } else {
            return <div ref={(el)=>{if (el) this.root_el=el}}>
                <div className="input-group nf-field-input-group" style={{width:this.props.width}}>
                    <input className="form-control nf-field-input" ref={this.input_mounted} onBlur={this.on_blur} type="text" value={this.state.val_str} onChange={this.onchange_text}/>
                    <span className="input-group-btn">
                        {function() {
                            if (!this.state.show_link) return;
                            if (!this.state.val_str) return;
                            return <a href="#" onClick={this.click_link} className="btn btn-default" tabIndex="-1"><span className="glyphicon glyphicon-arrow-right"></span></a>
                        }.bind(this)()}
                        <a className="btn btn-default" tabIndex="-1" onMouseDown={this.click_caret}><span className="caret"></span></a>
                    </span>
                </div>
                {function() {
                    if (!this.state.show_menu) return;
                    return <div style={{position:"relative"}}>
                        <ul style={{position:"absolute",top:0,left:0,zIndex:1000,backgroundColor:"#fff",border:"1px solid rgba(0,0,0,0.15)",maxHeight:250,overflow:"auto",minWidth:200,padding:"5px 0"}}>
                            {this.state.results.map(function(o,i) {
                                return <li key={i} style={{listStyle:"none"}}>
                                    <a href="#" style={{display:"block",padding:"3px 20px",textDecoration:"none",color:"#333",fontSize:"14px"}} onMouseDown={this.select_item.bind(this,o[0],o[1])}>{o[1]}</a>
                                </li>
                            }.bind(this))}
                        </ul>
                    </div>
                }.bind(this)()}
                {function() {
                    if (!this.state.saving) return;
                    return <Saving/>
                }.bind(this)()}
            </div>
        }
    },

    click_link(e) {
        console.log("FieldMany2One.click_link");
        e.preventDefault();
        var f=ui_params.get_field_by_path(this.props.model,this.props.name);
        var val=this.props.data[this.props.name];
        var val_id=val?val[0]:null;
        var action=ui_params.find_details_action(f.relation,val_id);
        this.context.action_view.execute(action);
    },

    click_caret(e) {
        console.log("FieldMany2One.click_caret");
        e.preventDefault();
        this.input_el.focus();
        if (this.state.show_menu) {
            this.setState({show_menu:false});
            return;
        }
        this.load_results("");
    },

    load_results(q) {
        var f=ui_params.get_field_by_path(this.props.model,this.props.name);
        var cond=[];
        if (this.props.condition) {
            cond=this.eval_condition();
        }
        var ctx={};
        rpc.execute(f.relation,"name_search",[q,cond],{context:ctx,limit:100},function(err,res) {
            if (err) throw "ERROR: "+err;
            this.setState({
                show_menu: true,
                results: res,
            });
        }.bind(this));
    },

    select_item(record_id,record_name,e) {
        console.log("FieldMany2One.select_item",this.props.name);
        e.preventDefault();
        this.setState({
            val_str: record_name,
            show_menu: false,
        });
        this.props.data[this.props.name]=[record_id,record_name];
    },

    click_page(e) {
        console.log("FieldMany2One.click_page",this.props.name);
        if (!this.root_el) return;
        if ($.contains(this.root_el,e.target)) {
            console.log("click inside => keep menu");
            return;
        }
        this.setState({show_menu:false});
    },

    onchange_text(e) {
        var val_str=e.target.value;
        this.setState({val_str:val_str});
        this.props.data[this.props.name]=null;
        this.load_results(val_str);
    },

    click_readonly() {
        if (this.props.edit_focus) {
            this.setState({readonly:false});
        }
    },

    input_mounted(el) {
        if (!el) return;
        this.input_el=el;
        if (this.props.edit_focus) {
            this.input_el.focus();
        }
    },

    on_blur() {
        console.log("FieldMany2One.on_blur");
        if (this.props.edit_focus) {
            this.setState({readonly:true});
        }
        var val=this.props.data[this.props.name];
        var val_str=utils.fmt_field_val(val,f);
        this.setState({val_str:val_str});
        if (this.props.auto_save) this.save_data();
    },

    save_data() {
        var active_id=this.props.data.id;
        if (!active_id) return;
        var vals={};
        var val=this.props.data[this.props.name]
        vals[this.props.name]=val?val[0]:null;
        var ctx={};
        this.setState({saving:true});
        rpc.execute(this.props.model,"write",[[active_id],vals],{context:ctx},function(err) {
            if (err) {
                alert(err);
                return;
            }
            this.setState({saving:false});
        }.bind(this));
    },

    eval_condition() {
        if (!this.props.condition) return;
        var ctx=this.props.data; // XXX
        return utils.eval_json(this.props.condition,ctx);
    },
});

module.exports=FieldMany2One;
