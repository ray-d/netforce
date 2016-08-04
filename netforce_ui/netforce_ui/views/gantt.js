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

var Gantt=NFView.extend({
    _name: "gantt",
    events: {
        "click .run-report": "run_report",
        "click .nf-move-up": "move_up",
        "click .nf-move-down": "move_down",
        "click .nf-fullscreen": "fullscreen",
        "click .nf-scale-month": "set_scale_month",
        "click .nf-scale-week": "set_scale_week",
        "click .nf-scale-day": "set_scale_day",
        "click .nf-scale-hour": "set_scale_hour",
        "click .nf-critical-path": "critical_path",
        "click .nf-export-pdf": "export_pdf",
        "click .nf-export-png": "export_png",
        "click .nf-export-xls": "export_xls",
    },

    initialize: function(options) {
        log("Gantt.initialize",this);
        var that=this;
        NFView.prototype.initialize.call(this,options);
        if (!this.options.model) throw "GanttView: missing model";
        var search_view=get_xml_layout({model:this.options.model,type:"search",noerr:true});
        if (!search_view) {
            search_view=get_default_search_view(this.options.model);
        }
        var doc=$.parseXML(search_view.layout);
        this.$search=$(doc).children();
        this.model=new NFModel({},{name:"_gantt"});
        this.data.context.model=this.model;
        this.data.context.collection=null;
        this.$search.find("field").each(function() {
            var $el=$(this);
            var name=$el.attr("name");
            log("conv field: "+name);
            var orig_field=get_field_path(that.options.model,name);
            var search_field;
            if (orig_field.type=="char") search_field={type:"char",string:orig_field.string};
            else if (orig_field.type=="selection") search_field={type:"selection",selection:orig_field.selection,string:orig_field.string};
            else if (orig_field.type=="many2one") {
                if ($el.attr("noselect")) {
                    search_field={type:"char",string:orig_field.string};
                } else {
                    search_field={type:"many2one",relation:orig_field.relation,string:orig_field.string};
                }
            } else if (orig_field.type=="text") search_field={type:"char",string:orig_field.string};
            else if (orig_field.type=="reference") search_field={type:"char",string:orig_field.string};
            else if (orig_field.type=="float") search_field={type:"float_range",string:orig_field.string};
            else if (orig_field.type=="integer") search_field={type:"float_range",string:orig_field.string}; // XXX
            else if (orig_field.type=="date" || orig_field.type=="datetime") search_field={type:"date_range",string:orig_field.string};
            else if (orig_field.type=="boolean") search_field={type:"selection",selection:[["yes","Yes"],["no","No"]],string:orig_field.string};
            else if (orig_field.type=="many2many") {
                search_field={type:"many2one",relation:orig_field.relation,string:orig_field.string};
            }
            else throw "Can't search field: "+name;
            that.model.fields[name]=search_field;
        });
    },

    render: function() {
        console.log("Gantt.render",this);
        var that=this;
        this.data.title=this.options.string;
        this.data.render_search_body=function(ctx) { return that.render_search_body.call(that,ctx); };
        NFView.prototype.render.call(this);
        setTimeout(function() {
            $("#nf-gantt-content").css({minHeight:500});
            gantt.config.scale_unit="week";
            gantt.config.date_scale="%M, Week #%W";
            gantt.config.subscales = [
                {unit:"day", step:1, date:"%d"}
            ];
            gantt.config.min_column_width = 30;
            gantt.config.order_branch=true;
            gantt.config.columns = [
                {name:"text",       label:"Task name",  width:"*", tree:true },
                {name:"start_date", label:"Start time", align: "center" },
                {name:"duration",   label:"Duration",   align: "center" }
            ];
            this.$el.find(".nf-scale-week").addClass("active");
            gantt.templates.scale_cell_class = function(date){
                if(date.getDay()==0){
                    return "weekend";
                }
            };
            gantt.templates.task_cell_class = function(item,date){
                if(date.getDay()==0){
                    return "weekend";
                }
            };
            gantt.init("nf-gantt-content");
            gantt.clearAll();
            if (!this.gantt_events) this.gantt_events=[];
            while (this.gantt_events.length) gantt.detachEvent(this.gantt_events.pop());
            this.gantt_events.push(gantt.attachEvent("onAfterTaskUpdate",this.on_after_task_update.bind(this)));
            this.gantt_events.push(gantt.attachEvent("onAfterTaskDelete",this.on_after_task_delete.bind(this)));
            this.gantt_events.push(gantt.attachEvent("onAfterTaskMove",this.on_after_task_move.bind(this)));
            this.gantt_events.push(gantt.attachEvent("onAfterTaskDrag",this.on_after_task_drag.bind(this)));
            this.gantt_events.push(gantt.attachEvent("onAfterLinkAdd",this.on_after_link_add.bind(this)));
            this.gantt_events.push(gantt.attachEvent("onAfterLinkDelete",this.on_after_link_delete.bind(this)));
            this.gantt_events.push(gantt.attachEvent("onAfterLinkUpdate",this.on_after_link_update.bind(this)));
            var gantt_view=get_xml_layout({model:this.options.model,type:"gantt"});
            log("gantt_view",gantt_view);
            this.$layout=$($.parseXML(gantt_view.layout)).children();
            this.group_field_name=this.$layout.attr("group_field");
            if (this.group_field_name) {
                this.group_field=get_field(this.options.model,this.group_field_name);
            }
            this.subgroup_field_name=this.$layout.attr("subgroup_field");
            if (this.subgroup_field_name) {
                this.subgroup_field=get_field(this.options.model,this.subgroup_field_name);
            }
            this.subsubgroup_field_name=this.$layout.attr("subsubgroup_field");
            if (this.subsubgroup_field_name) {
                this.subsubgroup_field=get_field(this.options.model,this.subsubgroup_field_name);
            }
            this.start_field_name=this.$layout.attr("start_field");
            if (!this.start_field_name) throw "Missing attribute 'start_field' in gantt layout";
            this.start_field=get_field(this.options.model,this.start_field_name);
            this.duration_field_name=this.$layout.attr("duration_field");
            if (!this.duration_field_name) throw "Missing attribute 'duration_field' in gantt layout";
            this.duration_field=get_field(this.options.model,this.duration_field_name);
            this.label_field_name=this.$layout.attr("label_field");
            if (!this.label_field_name) throw "Missing attribute 'label_field' in gantt layout";
            this.label_field=get_field(this.options.model,this.label_field_name);
            this.progress_field_name=this.$layout.attr("progress_field");
            if (this.progress_field_name) {
                this.progress_field=get_field(this.options.model,this.progress_field_name);
            }
            this.depends_field_name=this.$layout.attr("depends_field");
            if (this.depends_field_name) {
                this.depends_field=get_field(this.options.model,this.depends_field_name);
            }

            var fields=[this.start_field_name,this.duration_field_name,this.label_field_name];
            if (this.group_field_name) fields.push(this.group_field_name);
            if (this.subgroup_field_name) fields.push(this.subgroup_field_name);
            if (this.subsubgroup_field_name) fields.push(this.subsubgroup_field_name);
            if (this.progress_field_name) fields.push(this.progress_field_name);
            if (this.depends_field_name) fields.push(this.depends_field_name);
            var condition=this.get_condition();
            console.log("condition",condition);
            rpc_execute(this.options.model,"search_read",[condition,fields],{},function(err,data) {
                if (err) {
                    throw "Failed to get gantt data: "+err.message;
                }
                tasks={
                    data: [],
                    links: [],
                };
                var last_group_id=null;
                var last_subgroup_id=null;
                var last_subsubgroup_id=null;
                var group_tasks={};
                var subgroup_tasks={};
                var subsubgroup_tasks={};
                _.each(data,function(obj) {
                    var task_label=render_field_value(obj[this.label_field_name],this.label_field);
                    var start_date=obj[this.start_field_name];
                    if (!start_date) throw "Missing start date for task "+obj.id;
                    var duration=obj[this.duration_field_name];
                    if (duration==null) throw "Missing duration for task "+obj.id;
                    if (this.group_field_name) {
                        var group_val=obj[this.group_field_name];
                        var group_id=group_val?group_val[0]:null;
                        var group_label=group_val?group_val[1]:null;
                        if (group_id!=last_group_id) {
                            console.log("new group",group_id);
                            if (group_id) {
                                var task={
                                    id: 1000000+group_id, // XXX
                                    text: group_label,
                                    type: gantt.config.types.project,
                                    open: true,
                                };
                                console.log("add task group",task);
                                tasks.data.push(task);
                                group_tasks[group_id]=task;
                            }
                            last_group_id=group_id;
                        }
                    } else {
                        group_id=null;
                    }
                    if (this.subgroup_field_name) {
                        var subgroup_val=obj[this.subgroup_field_name];
                        var subgroup_id=subgroup_val?subgroup_val[0]:null;
                        var subgroup_label=subgroup_val?subgroup_val[1]:null;
                        if (subgroup_id!=last_subgroup_id) {
                            console.log("new subgroup",subgroup_id);
                            if (subgroup_id) {
                                var task={
                                    id: 2000000+subgroup_id, // XXX
                                    text: subgroup_label,
                                    type: gantt.config.types.project,
                                    open: true,
                                };
                                if (group_id) {
                                    task.parent=group_tasks[group_id].id;
                                }
                                console.log("add task subgroup",task);
                                tasks.data.push(task);
                                subgroup_tasks[subgroup_id]=task;
                            }
                            last_subgroup_id=subgroup_id;
                        }
                    } else {
                        subgroup_id=null;
                    }
                    if (this.subsubgroup_field_name) {
                        var subsubgroup_val=obj[this.subsubgroup_field_name];
                        var subsubgroup_id=subsubgroup_val?subsubgroup_val[0]:null;
                        var subsubgroup_label=subsubgroup_val?subsubgroup_val[1]:null;
                        if (subsubgroup_id!=last_subsubgroup_id) {
                            console.log("new subsubgroup",subsubgroup_id);
                            if (subsubgroup_id) {
                                var task={
                                    id: 3000000+subsubgroup_id, // XXX
                                    text: subsubgroup_label,
                                    type: gantt.config.types.project,
                                    open: true,
                                };
                                if (subgroup_id) {
                                    task.parent=subgroup_tasks[subgroup_id].id;
                                } else if (group_id) {
                                    task.parent=group_tasks[group_id].id;
                                }
                                console.log("add task subsubgroup",task);
                                tasks.data.push(task);
                                subsubgroup_tasks[subsubgroup_id]=task;
                            }
                            last_subsubgroup_id=subsubgroup_id;
                        }
                    } else {
                        subsubgroup_id=null;
                    }
                    var progress=obj[this.progress_field_name];
                    if (progress) progress=progress/100.0;
                    var task={
                        id: obj.id,
                        text: task_label,
                        start_date: new Date(start_date),
                        duration: duration,
                        progress: progress,
                    };
                    if (subsubgroup_id) {
                        task.parent=subsubgroup_tasks[subsubgroup_id].id;
                    } else if (subgroup_id) {
                        task.parent=subgroup_tasks[subgroup_id].id;
                    } else if (group_id) {
                        task.parent=group_tasks[group_id].id;
                    }
                    tasks.data.push(task);
                    if (this.depends_field_name) {
                        var res=obj[this.depends_field_name];
                        _.each(res,function(r) {
                            var link={
                                id: r[0],
                                source: r[1],
                                target: task.id,
                                type: "0",
                            };
                            tasks.links.push(link);
                        });
                    }
                }.bind(this));
                console.log("tasks",tasks);
                gantt.parse(tasks);
            }.bind(this));
        }.bind(this),100);
        return this;
    },

    render_search_body: function(context) {
        log("Gantt.render_search_body",this,context);
        var that=this;
        var body=$("<div/>");
        var row=$('<div class="row"/>');
        body.append(row);
        var col=0;
        this.$search.children().each(function() {
            var $el=$(this);
            var tag=$el.prop("tagName");
            if (tag=="field") {
                var name=$el.attr("name");
                var cell=$('<div class="col-sm-2"/>');
                if (col+2>12) {
                    row=$('<div class="row"/>');
                    body.append(row);
                    col=0;
                }
                row.append(cell);
                col+=2;
                var opts={
                    name: name,
                    context: context
                };
                var view=Field.make_view(opts);
                cell.append("<div id=\""+view.cid+"\" class=\"view\"></div>");
            } else if (tag=="newline") {
                row=$('<div class="row"/>');
                body.append(row);
            }
        });
        return body.html();
    },

    run_report: function(e) {
        log("report_view.run_report");
        e.preventDefault();
        e.stopPropagation();
        this.render();
    },

    get_condition: function() {
        log("report_view.get_condition",this);
        var that=this;
        var condition=[];
        this.$search.find("field").each(function() {
            var $el=$(this);
            var n=$el.attr("name");
            var v=that.model.get(n);
            if (!v) return;
            var f=get_field_path(that.options.model,n);
            var sf=that.model.get_field(n);
            if ((f.type=="float") || (f.type=="date")) {
                if (v[0]) {
                    var clause=[n,">=",v[0]];
                    condition.push(clause);
                }
                if (v[1]) {
                    var clause=[n,"<=",v[1]];
                    condition.push(clause);
                }
            } else if ((f.type=="many2one") && (sf.type=="many2one")) {
                if (_.isArray(v)) v=v[0];
                if ($el.attr("child_of")) {
                    var clause=[n,"child_of",v];
                } else {
                    var clause=[n,"=",v];
                }
                condition.push(clause);
            } else if (f.type=="boolean") {
                if (v=="yes") {
                    condition.push([[n,"=",true]]);
                } else if (v=="no") {
                    condition.push([[n,"=",false]]);
                }
            } else if (f.type=="many2many") {
                if ($el.attr("child_of")) {
                    var clause=[n,"child_of",v[0]];
                } else {
                    var clause=[n,"=",v[0]];
                }
                condition.push(clause);
            } else {
                var clause=[n,"ilike",v];
                condition.push(clause);
            }
        });
        log("=> condition",condition);
        return condition;
    },

    fullscreen: function(e) {
        e.preventDefault();
        gantt.expand();
    },

    on_after_task_update(id,item) {
        console.log("gantt.on_after_task_update",id,item);
        if (item.type==gantt.config.types.project) return;
        var vals={};
        vals[this.label_field_name]=item.text;
        vals[this.start_field_name]=moment(item.start_date).format("YYYY-MM-DD");
        vals[this.duration_field_name]=item.duration;
        if (this.progress_field_name) {
            vals[this.progress_field_name]=(item.progress||0)*100;
        }
        rpc_execute(this.options.model,"write",[[id],vals],{},function(err) {
            if (err) {
                alert("Error: "+err.message);
                return;
            }
        }.bind(this));
    },

    on_after_task_delete(id,item) {
        console.log("gantt.on_after_task_delete",id,item);
        rpc_execute(this.options.model,"delete",[[id]],{},function(err) {
            if (err) {
                alert("Error: "+err.message);
                return;
            }
        }.bind(this));
    },

    on_after_task_move(id,parent,tindex) {
        console.log("gantt.on_after_task_move",id,parent,tindex);
    },

    on_after_task_drag(id,mode,e) {
        console.log("gantt.on_after_task_drag",id,mode,e);
    },

    on_after_link_add(id,item) {
        console.log("gantt.on_after_link_add",id,item);
        var source_id=item.source;
        var target_id=item.target;
        rpc_execute(this.options.model,"add_link",[source_id,target_id],{},function(err) {
            if (err) {
                alert("Error: "+err.message);
                return;
            }
        }.bind(this));
    },

    on_after_link_delete(id,item) {
        console.log("gantt.on_after_link_delete",id,item);
        rpc_execute(this.options.model,"delete_link",[[id]],{},function(err) {
            if (err) {
                alert("Error: "+err.message);
                return;
            }
        }.bind(this));
    },

    on_after_link_update(id,item) {
        console.log("gantt.on_after_link_update",id,item);
    },

    set_scale_month(e) {
        e.preventDefault();
        this.$el.find(".nf-scale").removeClass("active");
        this.$el.find(".nf-scale-month").addClass("active");
        gantt.config.scale_unit="month";
        gantt.config.date_scale="%M";
        gantt.config.subscales = [
            {unit:"week", step:1, date:"W%W"}
        ];
        gantt.config.min_column_width = 30;
        gantt.render();
    },

    set_scale_week(e) {
        e.preventDefault();
        this.$el.find(".nf-scale").removeClass("active");
        this.$el.find(".nf-scale-week").addClass("active");
        gantt.config.scale_unit="week";
        gantt.config.date_scale="%M, Week #%W";
        gantt.config.subscales = [
            {unit:"day", step:1, date:"%d"}
        ];
        gantt.config.min_column_width = 30;
        gantt.render();
    },

    set_scale_day(e) {
        e.preventDefault();
        this.$el.find(".nf-scale").removeClass("active");
        this.$el.find(".nf-scale-day").addClass("active");
        gantt.config.scale_unit = "day"; 
        gantt.config.date_scale = "%D %d %M"; 
        gantt.config.subscales = [
              {unit:"hour", step:1, date:"%H:00"}
        ];
        gantt.config.min_column_width = 40;
        gantt.render();
    },

    critical_path: function(e) {
        e.preventDefault();
        var show=gantt.config.highlight_critical_path;
        if (show) {
            gantt.config.highlight_critical_path = false;
            this.$el.find(".nf-critical-path").text("Show Critical Path");
        } else {
            gantt.config.highlight_critical_path = true;
            this.$el.find(".nf-critical-path").text("Hide Critical Path");
        }
        gantt.render();
    },

    export_pdf: function(e) {
        e.preventDefault();
        gantt.exportToPDF({name:"gantt.pdf"});
    },

    export_png: function(e) {
        e.preventDefault();
        gantt.exportToPNG({name:"gantt.png"});
    },

    export_xls: function(e) {
        e.preventDefault();
        gantt.exportToExcel({name:"gantt.xls"});
    },

    export_ical: function(e) {
        e.preventDefault();
        gantt.exportToICal({name:"gantt.ical"});
    },

    export_msproject: function(e) {
        e.preventDefault();
        gantt.exportToMSProject({name:"gantt.proj"});
    },
});

Gantt.register();
