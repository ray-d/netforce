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

var List=NFView.extend({
    _name: "list",
    events: {
        "change input.list-select-all": "select_all",
        "click .nf-list-header": "header_click",
        "change .group-select input": "group_select"
    },

    initialize: function(options) {
        var that=this;
        NFView.prototype.initialize.call(this,options);
        var collection=this.context.collection;
        collection.on("click",this.line_click,this);
        collection.on("reset",this.collection_reset,this);
    },

    remove: function() {
        NFView.prototype.remove.call(this);
    },

    collection_reset: function() {
        log("collection_reset",this);
        this.render();
    },

    render: function() {
        log("list.render",this);
        this.data.select_model=!this.options.select_group && !this.options.noselect;
        this.data.select_group=this.options.select_group;
        var collection=this.context.collection;
        var order=collection.order;
        if (order) {
            var s=order.split(",")[0].split(" ");
            this.sort_field=s[0];
            this.sort_dir=s[1]||"asc";
        }
        var that=this;
        if (this.options.inner) {
            var content=this.options.inner({context: this.context});
            var xml="<root>"+content+"</root>";
            var doc=$.parseXML(xml);
            var cols=[];
            $(doc).find("root").children().each(function() {
                var $el=$(this);
                var tag=$el.prop("tagName");
                if (tag=="field") {
                    if (!$el.attr("invisible")) {
                        var model_cls=get_model(that.context.collection.name);
                        var name=$el.attr("name");
                        var f=model_cls.fields[name];
                        if (!f) throw "Invalid field: "+name;
                        var col={
                            col_type: "field",
                            name: name,
                            perm: $el.attr("perm"),
                            link: $el.attr("link")
                        };
                        if (f.type=="float") {
                            col.align="right";
                        }
                        if (col.name==that.sort_field) {
                            col.sort=that.sort_dir;
                        }
                        cols.push(col);
                    }
                } else if (tag=="button") {
                    cols.push({
                        col_type: "button",
                        perm: $el.attr("perm")
                    });
                }
            });
        } else {
            cols=this.options.cols;
        }
        _.each(cols,function(col) {
            if (col.name==that.sort_field) {
                col.sort=that.sort_dir;
            } else {
                col.sort=null;
            }
            col.perms=get_field_permissions(that.context.collection.name,col.name);
        });
        this.cols=cols;
        this.data.cols=cols;
        this.data.inner=this.options.inner;
        var collection=this.context.collection;
        this.data.context.data=collection.toJSON();
        if (this.options.minrows) {
            var minrows=parseInt(this.options.minrows);
            var extra_rows=[];
            for (var i=collection.length; i<minrows; i++) {
                extra_rows.push(i);
            }
            this.data.extra_rows=extra_rows;
        }
        if (_.isString(this.options.nodata)) {
            this.data.nodata=this.options.nodata;
        } else {
            this.data.nodata="There are no items to display.";
        }
        this.data.list_view=this;
        var sums={};
        _.each(cols,function(col) {
            if (col.show_sum) {
                sums[col.name]=0;
            }
        });
        if (!_.isEmpty(sums)) {
            this.data.show_sum=true;
            collection.each(function(m) {
                for (var n in sums) {
                    sums[n]+=m.get(n)||0;
                }
            });
            _.each(cols,function(col) {
                if (col.show_sum) {
                    col.sum=sums[col.name];
                }
            });
        }
        if (!_.isEmpty(this.options.group_fields)) {
            var model_cls=get_model(this.context.collection.name);
            var group_field=this.options.group_fields[0];
            var group_string=model_cls.fields[group_field].string;
            var subgroup_field=this.options.group_fields[1];
            if (subgroup_field) {
                var subgroup_string=model_cls.fields[subgroup_field].string;
            }
            var cur_group_model=null;
            var cur_subgroup_model=null;
            if (this.options.sum_fields) {
                var sum_field_names=this.options.sum_fields.split(",");
            } else {
                var sum_field_names=[];
            }
            this.context.collection.each(function(m) {
                var group_val=m.get(group_field);
                if (!cur_group_model || !_.isEqual(group_val,cur_group_model.get(group_field))) {
                    m.set("_group_string",group_string);
                    var ctx={
                        model: m
                    };
                    m.set("_group_val",field_value(group_field,ctx));
                    m.set("_group_count",0);
                    var group_sum=[];
                    _.each(sum_field_names,function(n) {
                        var f=model_cls.fields[n];
                        if (!f) throw "Invalid field: "+n;
                        group_sum.push({
                            name: n,
                            string: f.string,
                            value: 0
                        });
                    });
                    m.set("_group_sum",group_sum);
                    cur_subgroup_model=null;
                    cur_group_model=m;
                }
                cur_group_model.set("_group_count",cur_group_model.get("_group_count")+1);
                _.each(cur_group_model.get("_group_sum"),function(sum) {
                    sum.value+=m.get(sum.name)||0;
                });
                if (subgroup_field) {
                    var subgroup_val=m.get(subgroup_field);
                    if (!cur_subgroup_model || !_.isEqual(subgroup_val,cur_subgroup_model.get(subgroup_field))) {
                        m.set("_subgroup_string",subgroup_string);
                        var ctx={
                            model: m
                        };
                        m.set("_subgroup_val",field_value(subgroup_field,ctx));
                        m.set("_subgroup_count",0);
                        var subgroup_sum=[];
                        _.each(sum_field_names,function(n) {
                            var f=model_cls.fields[n];
                            if (!f) throw "Invalid field: "+n;
                            subgroup_sum.push({
                                name: n,
                                string: f.string,
                                value: 0
                            });
                        });
                        m.set("_subgroup_sum",subgroup_sum);
                        cur_subgroup_model=m;
                    }
                    cur_subgroup_model.set("_subgroup_count",cur_subgroup_model.get("_subgroup_count")+1);
                    _.each(cur_subgroup_model.get("_subgroup_sum"),function(sum) {
                        sum.value+=m.get(sum.name)||0;
                    });
                }
            });
        }
        NFView.prototype.render.call(this);
    },

    select_all: function(e) {
        log("select_all");
        e.preventDefault();
        e.stopPropagation();
        var val=this.$el.find("input.list-select-all").is(":checked");
        this.$el.find(".list-line-select input").prop("checked",val).change();
    },

    header_click: function(e) {
        log("header_click");
        e.preventDefault();
        e.stopPropagation();
        var name=$(e.target).data("name");
        log("name",name);
        var order=name;
        if (this.sort_field==name && this.sort_dir=="asc") {
            order+=" desc";
        }
        var collection=this.context.collection;
        collection.order=order;
        collection.get_data();
        if (this.options.navigate) {
            var h=window.location.hash.substr(1);
            var action=qs_to_obj(h);
            action.order=order;
            var h2=obj_to_qs(action);
            workspace.navigate(h2);
        }
    },

    line_click: function(model) {
        log("list.line_click",this,model);
        if (this.options.on_click_item) {
            this.options.on_click_item(this.options.data.id);
        }
    },

    group_select: function(e) {
        log("list.group_select");
        e.preventDefault();
        e.stopPropagation();
        var val=$(e.target).is(":checked");
        var model_id=$(e.target).parent("td").data("model-id");
        log("model_id",model_id);
        var model=this.context.collection.get(model_id);
        model.set("_selected",val);
    }
});

List.register();
