# Copyright (c) 2012-2015 Netforce Co. Ltd.
# 
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
# 
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
# 
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
# EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
# MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
# IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
# DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
# OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
# OR OTHER DEALINGS IN THE SOFTWARE.

from netforce.model import Model, fields, get_model
from netforce.access import get_active_company


class PrintWizard(Model):
    _name = "print.wizard"
    _transient = True
    _fields = {
        "print_model": fields.Char("Print Model", required=True),
        "print_ids": fields.Text("Print IDs", required=True),
        "template": fields.Char("Template"),
        "template_method": fields.Char("Template Method"),
        "template_format": fields.Char("Template Format"),
        "out_format": fields.Selection([["pdf", "PDF"], ["odt", "ODT"], ["docx", "DOCX"], ["xlsx", "XLSX"]], "Output Format", required=True),
        "custom_template_type": fields.Char("Custom Template Type"),
        "custom_template_id": fields.Many2One("report.template", "Custom Template"),
        "multi_page": fields.Boolean("Multi-page"),
    }

    def get_print_ids(self, ctx={}):
        refer_id = ctx.get("refer_id")
        if refer_id:
            ids = [int(refer_id)]
        else:
            ids = ctx.get("ids")
        if not ids:
            return
        return ",".join([str(x) for x in ids])

    _defaults = {
        "out_format": "pdf",
        "print_model": lambda self, ctx: ctx.get("print_model"),
        "print_ids": get_print_ids,
        "template": lambda self, ctx: ctx.get("template"),
        "template_method": lambda self, ctx: ctx.get("template_method"),
        "template_format": lambda self, ctx: ctx.get("template_format"),
        "custom_template_type": lambda self, ctx: ctx.get("custom_template_type"),
        "multi_page": lambda self, ctx: ctx.get("multi_page"),
    }

    def print(self, ids, context={}):
        obj = self.browse(ids)[0]
        if obj.custom_template_id:
            tmpl_fmt = obj.custom_template_id.format
            method = obj.custom_template_id.method
        else:
            tmpl_fmt = obj.template_format
            method = None
        if tmpl_fmt == "odt":
            action_type = "report_odt"
        elif tmpl_fmt == "odt2":
            action_type = "report_odt2"
        elif tmpl_fmt == "jrxml":
            action_type = "report"
        elif tmpl_fmt == "jrxml2":
            action_type = "report_jasper"
        elif tmpl_fmt == "docx":
            action_type = "report_doc"
        else:
            raise Exception("Invalid template format: %s" % tmpl_fmt)
        print_ids = [int(x) for x in obj.print_ids.split(",")]
        action = {
            "type": action_type,
            "model": obj.print_model,
            "ids": print_ids,
            "convert": obj.out_format,
        }
        if method:
            action["method"] = method
        if obj.multi_page:
            action["multi_page"] = 1
        if obj.custom_template_id:
            action["template"] = obj.custom_template_id.name
        elif obj.template:
            action["template"] = obj.template
        elif obj.template_method:
            action["template_method"] = obj.template_method
        print("print action", action)
        return {
            "next": action,
        }

PrintWizard.register()
