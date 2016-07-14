var React= require("react");
var List=require("./list")
var Form=require("./form")

var MultiView=React.createClass({
    getInitialState() {
        var mode="list";
        return {
            mode: mode,
        };
    },

    componentDidMount() {
    },

    render() {
        if (this.state.mode=="list") {
            return <List title={this.props.title} model={this.props.model} layout={this.props.list_layout} tabs={this.props.tabs} group_field={this.props.group_field} on_new={this.on_new} on_select={this.on_select} summary_view={this.props.summary_view}/>
        } else if (this.state.mode=="form") {
            return <Form model={this.props.model} active_id={this.state.active_id} layout={this.props.form_layout} bread_title={this.props.title} on_bread={this.on_bread}/>
        } else {
            throw "Invalid view mode: "+this.state.mode;
        }
    },

    on_new() {
        this.setState({
            mode: "form",
            active_id: null,
        });
    },

    on_select(active_id) {
        this.setState({
            mode: "form",
            active_id: active_id,
        });
    },

    on_bread() {
        this.setState({
            mode: "list",
        });
    },
});

module.exports=MultiView;
