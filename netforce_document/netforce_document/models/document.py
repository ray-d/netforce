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
import time
import datetime
from dateutil.relativedelta import relativedelta
from netforce import utils
import os
import base64
from netforce.template import render_template


class Document(Model):
    _name = "document"
    _string = "Document"
    _audit_log = True
    _name_field="file"
    _fields = {
        "file": fields.File("File"),
        "categ_id": fields.Many2One("document.categ", "Category", search=True),
        "description": fields.Text("Description", search=True),
        "contact_id": fields.Many2One("contact", "Contact", search=True),
        "related_id": fields.Reference([
            ["sale.quot", "Quotation"],
            ["sale.order", "Sales Order"],
            ["purchase.order", "Purchase Order"],
            ["job", "Service Order"],
            ["project", "Project"],
            ["hr.employee", "Employee"],
            ["account.invoice", "Invoice"],
            ["account.payment", "Payment"],
            ["account.track.categ", "Tracking Category"]
            ], "Related To"),
        "date": fields.Date("Date Created", required=True, search=True),
        "attachments": fields.One2Many("attach", "related_id", "Attachments"),
        "comments": fields.One2Many("message", "related_id", "Comments"),
        "expiry_date": fields.Date("Expiry Date", search=True),
        "expiring_soon": fields.Boolean("Expiring Soon", store=False, function_search="search_expiring"),
        "expired": fields.Boolean("Expired", function="get_expired", function_search="search_expired"),
        "create_job": fields.Boolean("Automatically Create Job To Renew"),  # XXX: deprecated
        "active": fields.Boolean("Active"),
        "days_remaining": fields.Integer("Days Remaining", function="get_days_remaining"),
        "reminders": fields.One2Many("reminder", "doc_id", "Reminders"),
        "state": fields.Selection([["draft", "Draft"], ["verified", "Verified"]], "Status"),
        "share": fields.Boolean("Share With Contact"),
    }
    _order = "date desc"

    def _get_contact(self, context={}):
        defaults = context.get("defaults")
        if not defaults:
            return
        related_id = defaults.get("related_id")
        if not related_id:
            return
        model, model_id = related_id.split(",")
        model_id = int(model_id)
        if model == "job":
            job = get_model("job").browse(model_id)
            return job.contact_id.id
        elif model == "sale.quot":
            quot = get_model("sale.quot").browse(model_id)
            return quot.contact_id.id

    _defaults = {
        "date": lambda *a: time.strftime("%Y-%m-%d"),
        "contact_id": _get_contact,
        "active": True,
        "state": "draft",
    }
    _constraints = ["_check_date"]

    def _check_date(self, ids, context={}):
        for obj in self.browse(ids):
            if obj.expiry_date:
                if obj.expiry_date and obj.expiry_date < obj.date:
                    raise Exception("Expiry date is before creation date")

    def name_get(self, ids, context={}):
        vals = []
        for obj in self.browse(ids):
            if obj.file:
                s, ext = os.path.splitext(obj.file)
                name = s.rsplit(",")[0] + ext
            else:
                name = "#%d" % obj.id
            vals.append((obj.id, name))
        return vals

    def search_expiring(self, clause, context={}):
        d = datetime.date.today() + datetime.timedelta(days=35)
        return [["expiry_date", "<=", d.strftime("%Y-%m-%d")]]

    def onchange_categ(self, context={}):
        data = context["data"]
        categ_id = data.get("categ_id")
        if not categ_id:
            return
        categ = get_model("document.categ").browse(categ_id)
        expire_after = categ.expire_after
        if expire_after:
            expire_after = expire_after.strip()
            t0 = datetime.datetime.strptime(data.get("date"), "%Y-%m-%d")
            p = expire_after[-1]
            n = int(expire_after[:-1])
            if p == "y":
                dt = relativedelta(years=n)
            elif p == "m":
                dt = relativedelta(months=n)
            elif p == "w":
                dt = relativedelta(weeks=n)
            elif p == "d":
                dt = relativedelta(days=n)
            exp_date = (t0 + dt).strftime("%Y-%m-%d")
        else:
            exp_date = None
        return {
            "expiry_date": exp_date,
            "create_job": categ.create_job,
        }

    def onchange_file(self, context={}):
        print("onchange_file")
        data = context["data"]
        filename = data["file"]
        if not filename:
            return
        categ_id = data.get("categ_id")
        if not categ_id:
            return
        categ = get_model("document.categ").browse(categ_id)
        fmt = categ.file_name
        if not fmt:
            return
        contact_id = data.get("contact_id")
        if contact_id:
            contact = get_model("contact").browse(contact_id)
        else:
            contact = None
        date = data["date"]
        vals = {
            "contact_code": contact and contact.code or "",
            "doc_code": categ.code or "",
            "Y": date[0:4],
            "y": date[2:4],
            "m": date[5:7],
            "d": date[8:10],
        }
        filename2 = fmt % vals
        res = os.path.splitext(filename)
        rand = base64.urlsafe_b64encode(os.urandom(8)).decode()
        filename2 += "," + rand + res[1]
        if filename2 != filename:
            path = utils.get_file_path(filename)
            path2 = utils.get_file_path(filename2)
            os.rename(path, path2)
        return {
            "file": filename2,
        }

    def get_expired(self, ids, context={}):
        vals = {}
        for obj in self.browse(ids):
            if obj.expiry_date:
                vals[obj.id] = obj.expiry_date < time.strftime("%Y-%m-%d")
            else:
                vals[obj.id] = False
        return vals

    def search_expired(self, clause, context={}):
        return [["expiry_date", "<", time.strftime("%Y-%m-%d")]]

    def do_create_job(self, ids, context={}):
        for obj in self.browse(ids):
            categ = obj.categ_id
            tmpl = categ.job_template_id
            if not tmpl:
                continue
            job_id = tmpl.create_job(context={"contact_id": obj.contact_id.id})
            obj.write({"create_job": False, "related_id": "job,%d" % job_id})

    def create_jobs(self, context={}):
        try:
            for categ in get_model("document.categ").search_browse([["create_job", "=", True]]):
                days = categ.create_days and int(categ.create_days) or 0
                d = (datetime.date.today() + datetime.timedelta(days=days)).strftime("%Y-%m-%d")
                for doc in self.search_browse([["expiry_date", "<=", d], ["create_job", "=", True]]):
                    doc.do_create_job()
        except Exception as e:
            print("WARNING: Failed to create jobs")
            import traceback
            traceback.print_exc()

    def check_days_before_expiry(self, ids, days=None, days_from=None, days_to=None, categs=None, context={}):
        print("Document.check_days_before_expiry", ids, days)
        cond = []
        if days != None:
            d = (datetime.date.today() + datetime.timedelta(days=days)).strftime("%Y-%m-%d")
            cond.append(["expiry_date", "=", d])
        if days_from != None:
            d = (datetime.date.today() + datetime.timedelta(days=days_from)).strftime("%Y-%m-%d")
            cond.append(["expiry_date", "<=", d])
        if days_to != None:
            d = (datetime.date.today() + datetime.timedelta(days=days_to)).strftime("%Y-%m-%d")
            cond.append(["expiry_date", ">=", d])
        if categs:
            cond.append(["categ_id.code", "in", categs])
        if ids:
            cond.append(["ids", "in", ids])
        ids = self.search(cond)
        return ids

    def get_days_remaining(self, ids, context={}):
        vals = {}
        d = datetime.datetime.now()
        for obj in self.browse(ids):
            if obj.expiry_date:
                vals[obj.id] = (datetime.datetime.strptime(obj.expiry_date, "%Y-%m-%d") - d).days
            else:
                vals[obj.id] = None
        return vals

    def create_reminders(self, ids, context={}):
        for obj in self.browse(ids):
            categ = obj.categ_id
            if not categ:
                continue
            obj.write({"reminders": [("delete_all",)]})
            for tmpl in categ.reminder_templates:
                s = tmpl.scheduled_date.strip()
                days = int(s)
                d = datetime.datetime.strptime(obj.expiry_date, "%Y-%m-%d") + datetime.timedelta(days=days)
                ctx = {"doc": obj}
                subject = render_template(tmpl.subject, ctx)
                body = render_template(tmpl.body or "", ctx)
                vals = {
                    "scheduled_date": d.strftime("%Y-%m-%d"),
                    "doc_id": obj.id,
                    "user_id": tmpl.user_id.id,
                    "subject": subject,
                    "body": body,
                }
                get_model("reminder").create(vals)

    def delete_pending_reminders(self, ids, context={}):
        for obj in self.browse(ids):
            for reminder in obj.reminders:
                if reminder.state == "pending":
                    reminder.delete()

    def create(self, vals, **kw):
        new_id = super().create(vals, **kw)
        obj = self.browse(new_id)
        obj.create_reminders()
        return new_id

    def write(self, ids, vals, **kw):
        old_categs = {}
        old_dates = {}
        for obj in self.browse(ids):
            old_categs[obj.id] = obj.categ_id.id
            old_dates[obj.id] = obj.expiry_date
        super().write(ids, vals, **kw)
        for obj in self.browse(ids):
            if obj.categ_id.id != old_categs[obj.id] or obj.expiry_date != old_dates[obj.id]:
                obj.create_reminders()

    def to_draft(self, ids, context={}):
        for obj in self.browse(ids):
            obj.write({"state": "draft"})

    def to_verified(self, ids, context={}):
        for obj in self.browse(ids):
            obj.write({"state": "verified"})

    def delete(self, ids, **kw):
        files = []
        for obj in self.browse(ids):
            if obj.file:
                files.append(obj.file)
        super().delete(ids, **kw)
        for f in files:
            path = utils.get_file_path(f)
            os.remove(path)

Document.register()
