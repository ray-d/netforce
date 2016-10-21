/*
 * Copyright (c) 2012-2015 Netforce Co. Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
 * OR OTHER DEALINGS IN THE SOFTWARE.
 */

var InlineForm=NFView.extend({
    _name: "inline_form",
    events: {
        "click .btn-save": "save",
        "click .btn-cancel": "cancel"
    },

    initialize: function(options) {
        log("inline_form.initialize",this);
        var that=this;
        NFView.prototype.initialize.call(this,options);
        if (this.options.layout) {
            var layout=this.options.layout;
        } else {
            var form_view=get_xml_layout({model:this.options.model,type:"form"});
            var layout=form_view.layout;
        }
        if (_.isString(layout)) {
            var doc=$.parseXML(layout);
            this.$form=$(doc).children();
        } else {
            this.$form=layout;
        }
        if (!this.options.active_id) {
            this.relfield=this.options.relfield;
            if (!this.relfield) throw "No relfield";
            this.parent_id=this.options.parent_id;
            if (!this.parent_id) throw "No parent_id";
            this.parent_model=this.options.parent_model;
            if (!this.parent_model) throw "No parent_model";
        }
        this.data.render_form_body=function(ctx) { return that.render_form_body.call(that,ctx); };
    },

    render: function() {
        log("inline_form.render",this);
        var that=this;
        var model_name=this.options.model;
        var field_names=[];
        this.$form.find("field").each(function() {
            // remove this to show many2many data but it is BUG ?
            /*
            if ($(this).parents("field").length>0) {
                return;
            }
            if ($(this).parents("related").length>0) {
                return;
            }
            */
            field_names.push($(this).attr("name"));
        });
        if (this.options.active_id) {
            var ids=[this.options.active_id];
            rpc_execute(model_name,"read",[ids],{field_names:field_names},function(err,data) {
                that.model=new NFModel(data[0],{name:model_name});
                that.model.set_orig_data(data[0]);
                that.data.context.data=data[0];
                that.data.context.model=that.model;
                NFView.prototype.render.call(that);
            });
        } else {
            var ctx={
                data:that.options.parent_data,
                defaults: {}
            };
            var f=get_field(model_name,that.relfield);
            if (f.type=="reference") {
                ctx.defaults[that.relfield]=that.parent_model+","+that.parent_id;
            } else {
                ctx.defaults[that.relfield]=that.parent_id;
            }
            rpc_execute(model_name,"default_get",[],{field_names:field_names,context:ctx},function(err,data) {
                that.model=new NFModel(data,{name:model_name});
                that.data.context.data=data;
                that.data.context.model=that.model;
                NFView.prototype.render.call(that);
            });
        }
        return this;
    },

    render_form_body: function(context) {
        log("render_form_body",this,context);
        var that=this;
        var body=$("<div/>");
        var row=$('<div class="row"/>');
        body.append(row);
        var col=0;
        var form_layout=this.options.form_layout||"horizontal";
        this.$form.children().each(function() {
            var $el=$(this);
            var tag=$el.prop("tagName");
            if (tag=="field") {
                var span=$el.attr("span")
                if (span) span=parseInt(span);
                else span=5;
                if (col+span>12) {
                    col=0;
                    row=$('<div class="row"/>');
                    body.append(row);
                }
                var cell=$('<div/>');
                cell.addClass("col-sm-"+span);
                if (!$el.attr("nolabel")) { // XXX
                    cell.addClass("form-horizontal");
                }
                if ($el.attr("offset")) {
                    cell.addClass("col-sm-offset-"+$el.attr("offset"));
                }
                if (form_layout=="horizontal") {
                    cell.addClass("form-horizontal");
                }
                row.append(cell);
                var name=$el.attr("name");
                var opts={
                    name: name,
                    readonly: $el.attr("readonly"),
                    required: $el.attr("required"),
                    nolabel: $el.attr("nolabel"),
                    invisible: $el.attr("invisible"),
                    onchange: $el.attr("onchange"),
                    count: $el.attr("count")||1,
                    password: $el.attr("password"),
                    size: $el.attr("size"),
                    selection: $el.attr("selection"),
                    attrs: $el.attr("attrs"),
                    width: $el.attr("width"),
                    height: $el.attr("height"),
                    condition: $el.attr("condition"),
                    context_attr: $el.attr("context"),
                    perm: $el.attr("perm"),
                    pkg: $el.attr("pkg"),
                    link: $el.attr("link"),
                    nolink: $el.attr("nolink"), // only many2one
                    action: $el.attr("action"),
                    target: $el.attr("target"),
                    click_action: $el.attr("click_action"),
                    form_layout: form_layout,
                    context: context
                };
                if ($el.find("list").length>0) {
                    opts.inner=function(params) { 
                        var $list=$el.find("list");
                        var sub_fields=[];
                        $list.children().each(function() {
                            var $el2=$(this);
                            sub_fields.push({
                                name: $el2.attr("name"),
                                condition: $el2.attr("condition"),
                                onchange: $el2.attr("onchange")
                            });
                        });
                        var opts2={
                            fields: sub_fields,
                            context: params.context
                        }
                        var view=Sheet.make_view(opts2);
                        html="<div id=\""+view.cid+"\" class=\"view\"></div>";
                        return html;
                    };
                    opts.field_names=[];
                    $el.find("list").find("field").each(function() {
                        var $el2=$(this);
                        opts.field_names.push($el2.attr("name"));
                    });
                }
                var view=Field.make_view(opts);
                cell.append("<div id=\""+view.cid+"\" class=\"view\"></div>");
                col+=span;
            } else if (tag=="separator") {
                var span=$el.attr("span")
                if (span) cols=parseInt(span);
                else span=12;
                var cell=$('<div/>');
                cell.addClass("col-sm-"+span);
                row.append(cell);
                var opts={
                    string: $el.attr("string")
                };
                var view=Separator.make_view(opts);
                cell.append("<div id=\""+view.cid+"\" class=\"view\"></div>");
                col+=span;
            } else if (tag=="newline") {
                col+=12;
            } else if (tag=="group") {
                var span=$el.attr("span")
                if (span) span=parseInt(span);
                else span=12;
                var offset=$el.attr("offset")
                if (offset) offset=parseInt(offset);
                else offset=0;
                col+=offset;
                if (col+span>12) {
                    col=0;
                    row=$('<div class="row"/>');
                    body.append(row);
                }
                var cell=$('<div/>');
                cell.addClass("col-sm-"+span);
                if (offset) {
                    cell.addClass("col-sm-offset-"+offset);
                }
                row.append(cell);
                var opts={
                    group_layout: $el,
                    attrs: $el.attr("attrs"),
                    span: $el.attr("span"),
                    readonly: $el.attr("readonly")||that.readonly,
                    form_layout: $el.attr("form_layout"),
                    context: context
                };
                if (col>0 && !opts.span) {
                    opts.span=12-col;
                }
                var view_cls=get_view_cls("group");
                var view=view_cls.make_view(opts);
                cell.append("<div id=\""+view.cid+"\" class=\"view\"></div>");
                col+=span;
            }
        });
        return body.html();
    },

    save: function(e) {
        log("save");
        var that=this;
        e.preventDefault();
        e.stopPropagation();
        if (!this.model.check_required()) {
            set_flash("error","Some required fields are missing");
            render_flash();
            return;
        }
        this.model.save({},{
            success: function() {
                log("save success");
                that.trigger("save");
            },
            error: function(model,err) {
                log("save error",err);
                set_flash("error",err.message);
                render_flash();
            }
        });
    },

    cancel: function(e) {
        log("cancel");
        e.preventDefault();
        e.stopPropagation();
        this.$el.hide();
        this.trigger("cancel");
    }
});

InlineForm.register();
