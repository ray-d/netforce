var React = require("react");
var ui_params=require("../ui_params");
var rpc=require("../rpc");
var utils=require("../utils");
var $=require("jquery");

var FieldFile=React.createClass({
    getInitialState() {
        var readonly=this.props.readonly?true:false;
        if (this.props.model) {
            var f=ui_params.get_field(this.props.model,this.props.name);
            if (f.readonly) readonly=true;
        }
        if (this.props.edit_focus) readonly=true;
        var val=this.props.data[this.props.name];
        return {
            readonly: readonly,
            value: val,
        };
    },

    componentDidMount() {
    },

    render() {
        return <div>
            {function() {
                if (!this.state.value) return;
                var is_picture=false;
                if (this.state.value.match(/\.png$|\.jpg$|\.jpeg$|\.gif$/i)) {
                    is_picture=true;
                }
                var url=rpc.get_file_uri(this.state.value);
                var file_str=utils.get_file_name(this.state.value);
                if (is_picture) {
                    return <a href={url}><img src={url} style={{maxWith:100,maxHeight:100}}/></a>
                } else {
                    return <a href={url}>{file_str}</a>
                }
            }.bind(this)()}
            <button className="btn btn-default btn-sm" onClick={this.choose_file}>Choose File</button>
            {function() {
                if (!this.state.value) return;
                return <button className="btn btn-default btn-sm" onClick={this.clear_file}>Clear</button>
            }.bind(this)()}
            <input type="file" onChange={this.onchange_file} style={{display:"none"}} ref={(el)=>this.input_el=el}/>
            {function() {
                if (!this.state.uploading) return;
                return <span>Uploading... {this.state.progress||0}%</span>
            }.bind(this)()}
        </div>
    },

    onchange_file(e) {
        console.log("FieldFile.onchange_file",e);
        var target=e.target;
        console.log("target",target);
        var files=target.files;
        if (!files.length) return;
        var file=files[0];
        console.log("file",file);
        this.setState({uploading:true});
        rpc.upload_file(file,this.file_uploaded.bind(this),this.file_progress.bind(this));
    },

    file_uploaded(err,fname)  {
        console.log("file_uploaded",err,fname);
        this.setState({uploading:false});
        if (err) {
            alert("Error: "+err);
            return;
        }
        this.props.data[this.props.name]=fname;
        this.setState({value:fname});
    },

    file_progress(loaded,total)  {
        console.log("file_progress",loaded,total);
        var progress=Math.ceil(loaded*100/total);
        this.setState({progress:progress});
    },

    choose_file(e) {
        console.log("choose_file");
        e.preventDefault();
        $(this.input_el).trigger("click");
    },

    clear_file() {
        console.log("clear_file");
        this.props.data[this.props.name]=null;
        this.setState({value:null});
    },
});

module.exports=FieldFile;
