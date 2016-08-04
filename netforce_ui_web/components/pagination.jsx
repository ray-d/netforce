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

var Pagination=React.createClass({
    render() {
        console.log("Pagination.render");
        var num_pages=Math.ceil(this.props.count/this.props.limit);
        var page_no=Math.floor(this.props.offset/this.props.limit);
        var pages=[page_no];
        for (var i=0; i<4; i++) {
            if (pages.length>=5) break;
            if (page_no<=num_pages-2-i) pages.push(page_no+1+i);
            if (pages.length>=5) break;
            if (page_no>=1+i) pages.unshift(page_no-1-i);
        }
        console.log("pages",pages);
        return <div>
            <ul className="pagination" style={{float:"right"}}>
                {function() {
                    if (page_no<=0) return;
                    return <li><a className="page-link" href="#" onClick={this.change_page.bind(this,0)}>&laquo; Start</a></li>
                }.bind(this)()}
                {function() {
                    if (page_no<=0) return;
                    return <li><a className="page-link" href="#" onClick={this.change_page.bind(this,page_no-1)}>&lsaquo; Prev</a></li>
                }.bind(this)()}
                {_.range(5).map(function(i) {
                    if (i>pages.length-1) return; 
                    return <li key={i} className={pages[i]==page_no?"active":null}><a className="page-link" href="#" onClick={this.change_page.bind(this,pages[i])}>{pages[i]+1}</a></li>
                }.bind(this))}
                {function() {
                    if (page_no>=num_pages-1) return;
                    return <li><a className="page-link" href="#" onClick={this.change_page.bind(this,page_no+1)}>Next &rsaquo;</a></li>
                }.bind(this)()}
                {function() {
                    if (page_no>=num_pages-1) return;
                    return <li><a className="page-link" href="#" onClick={this.change_page.bind(this,num_pages-1)}>End &raquo;</a></li>
                }.bind(this)()}
            </ul>
            <div style={{float:"left",margin:"20px 0"}}>
                <span style={{margin:10}}>
                    Page
                    <select style={{margin:5}} onChange={this.change_page} value={page_no} onChange={this.change_page}>
                        {_.range(num_pages).map(function(i) {
                            return <option value={i} key={i}>{i+1}</option>
                        }.bind(this))}
                    </select>
                    of {num_pages}
                </span>
                <span style={{margin:10}}>({this.props.count} total items)</span>
                <span style={{margin:10}}>
                    Showing
                    <select style={{margin:5}} onChange={this.change_limit} value={this.props.limit}>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                        <option value={1000}>1000</option>
                    </select>
                    items per page
                </span>
            </div>
            <div className="clearfix"/>
        </div>
    },

    change_limit: function(e) {
        var limit=e.target.value;
        this.props.onchange_limit(limit);
    },

    change_page: function(page_no,e) {
        if (!_.isNumber(page_no)) { // XXX
            e=page_no;
            var page_no=e.target.value;
        }
        e.preventDefault();
        var offset=page_no*this.props.limit;
        this.props.onchange_offset(offset);
    },
});

module.exports=Pagination;
