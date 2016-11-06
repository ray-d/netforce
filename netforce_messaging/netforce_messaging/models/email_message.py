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

import smtplib
import email
from email.utils import parseaddr, parsedate_tz, formatdate
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.base import MIMEBase
from email.encoders import encode_base64
from email.header import Header
from email.header import decode_header
from netforce import utils
from netforce.access import get_active_user
from netforce.template import render_template
from netforce.utils import print_color
import re
import os
import base64
from datetime import *
import time
import requests
import mimetypes
import json

from netforce import config
from netforce.model import Model, fields, get_model
from netforce.database import get_active_db


def conv_charset(charset):
    if charset == "windows-874":
        charset = "cp874"
    return charset


class EmailMessage(Model):
    _name = "email.message"
    _string = "Email Message"
    _name_field = "message_id"
    _fields = {
        "type": fields.Selection([["in", "Incoming"], ["out", "Outgoing"]], "Type"),  # XXX: deprecated
        "date": fields.DateTime("Date", required=True, search=True, readonly=True),
        "from_addr": fields.Char("From", required=True, search=True, size=256),
        "to_addrs": fields.Char("To", size=256, search=True),
        "cc_addrs": fields.Char("Cc", size=256, search=True),
        "subject": fields.Char("Subject", required=True, size=128, search=True),
        # XXX: deprecated
        "content_type": fields.Selection([["plain", "Plain Text"], ["html", "HTML"]], "Content Type"),
        "body": fields.Text("Body", search=True),
        "state": fields.Selection([["draft", "Draft"], ["to_send", "To Send"], ["sent", "Sent"], ["delivered", "Delivered"], ["bounced", "Bounced"], ["rejected", "Rejected"], ["received", "Received"], ["error", "Error"]], "Status", required=True, search=True),
        "message_id": fields.Char("Message ID", size=256),
        "mailbox_message_uid": fields.Char("Mailbox Message UID"),
        "comments": fields.One2Many("message", "related_id", "Comments"),
        "name_id": fields.Reference([["contact", "Contact"], ["sale.lead", "Sales Lead"], ["mkt.target", "Marketing Target"]], "Contact Person", search=True),
        "related_id": fields.Reference([["sale.opportunity", "Sales Opportunity"], ["sale.quot", "Quotation"], ["sale.order", "Sales Order"], ["job", "Service Order"], ["purchase.order", "Purchase Order"], ["account.invoice", "Invoice"], ["mkt.campaign", "Marketing Campaign"], ["ecom.cart","Ecommerce Cart"]], "Related To"),
        "attachments": fields.One2Many("email.attach", "email_id", "Attachments"),
        "events": fields.One2Many("email.event", "email_id", "Email Events"),
        "opened": fields.Boolean("Opened", readonly=True, search=True),
        "clicked": fields.Boolean("Link Clicked", readonly=True, search=True),
        "in_reject_list": fields.Boolean("Black Listed", function="check_reject_list"),
        "parent_uid": fields.Char("Parent Unique ID", readonly=True, size=256),  # XXX
        "parent_id": fields.Many2One("email.message", "Parent"),
        "mailbox_id": fields.Many2One("email.mailbox", "Mailbox", required=False, search=True),
        "open_detect": fields.Boolean("Open Detect", function="get_open_detect"),
        "num_attach": fields.Integer("# Attach.", function="get_num_attach"),
        "error_message": fields.Text("Error Message"),
    }
    _order = "date desc"

    def _get_mailbox(self, context={}):
        user_id = get_active_user()
        res = get_model("email.mailbox").search([["type", "=", "out"]], order="id")
        if not res:
            return None
        return res[0]

    def _get_from_addr(self, context={}):
        user_id = get_active_user()
        user = get_model("base.user").browse(user_id)
        return user.email

    def _get_to_addrs(self, context={}):
        defaults = context.get("defaults")
        if not defaults:
            return None
        parent_id = int(defaults.get("parent_id"))
        if not parent_id:
            return None
        parent = get_model("email.message").browse(parent_id)
        return parent.from_addr

    def _get_subject(self, context={}):
        defaults = context.get("defaults")
        if not defaults:
            return None
        parent_id = int(defaults.get("parent_id"))
        if not parent_id:
            return None
        parent = get_model("email.message").browse(parent_id)
        s = parent.subject
        return "Re: " + s

    def _get_body(self, context={}):
        defaults = context.get("defaults")
        if not defaults:
            return None
        parent_id = int(defaults.get("parent_id"))
        if not parent_id:
            return None
        parent = get_model("email.message").browse(parent_id)
        d = datetime.strptime(parent.date, "%Y-%m-%d %H:%M:%S")
        pbody = parent.body
        m = re.search("<body>(.*)</body>", pbody, re.DOTALL)
        if m:
            pbody = m.group(1)
        m = re.search("<BODY>(.*)</BODY>", pbody, re.DOTALL)
        if m:
            pbody = m.group(1)
        body = "<div>On %s, %s wrote:" % (d.strftime("%a, %b %d, %Y at %H:%M"), parent.from_addr)
        body += '<blockquote style="margin:0 0 0 .8ex;border-left:1px #ccc solid;padding-left:1ex">' + \
            pbody + "</blockquote>"
        body += "</div>"
        return body

    _defaults = {
        "type": "out",
        "state": "draft",
        "date": lambda *a: time.strftime("%Y-%m-%d %H:%M:%S"),
        "mailbox_id": _get_mailbox,
        "from_addr": _get_from_addr,
        "to_addrs": _get_to_addrs,
        "subject": _get_subject,
        "body": _get_body,
    }

    def to_send(self, ids, context={}):
        for obj in self.browse(ids):
            obj.write({"state": "to_send"})

    def to_draft(self,ids,context={}):
        for obj in self.browse(ids):
            obj.write({"state": "draft"})

    def send_emails(self, context={}):  # FIXME
        print("send_emails")
        mailbox_ids = get_model("email.mailbox").search([["account_id.type", "in", ["smtp", "mailgun"]]])
        if not mailbox_ids:
            email_account=config.get("email_account")
            if email_account:
                for mail in get_model("email.message").search_browse([["state", "=", "to_send"]], order="id"):
                    mail.send()
        else:
            get_model("email.mailbox").send_emails(mailbox_ids)

    def check_sent_emails(self, context={}):
        print("send_sent_emails")
        res = get_model("email.account").search([["type", "=", "mailgun"]])  # XXX
        if not res:
            return
        acc_id = res[0]
        get_model("email.account").check_sent_emails([acc_id])

    def send_from_template(self, template=None, from_addr=None, to_addrs=None, context={}):  # XXX: deprecated
        if not template:
            raise Exception("Missing template")
        res = get_model("email.template").search([["name", "=", template]])
        if not res:
            raise Exception("Template not found: %s" % template)
        tmpl_id = res[0]
        tmpl = get_model("email.template").browse(tmpl_id)
        trigger_model = context.get("trigger_model")
        if not trigger_model:
            raise Exception("Missing trigger model")
        tm = get_model(trigger_model)
        trigger_ids = context.get("trigger_ids")
        if trigger_ids is None:
            raise Exception("Missing trigger ids")
        user_id = get_active_user()
        if user_id:
            user = get_model("base.user").browse(user_id)
        else:
            user = None
        for obj in tm.browse(trigger_ids):
            tmpl_ctx = {"obj": obj, "user": user, "context": context}
            get_model("email.template").create_email([tmpl_id],tmpl_ctx)

    def import_email(self, vals):
        print("import_email from=%s to=%s cc=%s subject=%s" %
              (vals["from_addr"], vals.get("to_addrs"), vals.get("cc_addrs"), vals["subject"]))

        def _check_addr(addrs):
            if not addrs:
                return False
            addr_list = addrs.split(",")
            for addr in addr_list:
                addr = addr.strip()
                res = get_model("base.user").search([["email", "=ilike", addr]])
                if res:
                    return True
                res = get_model("contact").search([["email", "=ilike", addr]])
                if res:
                    return True
                res = get_model("sale.lead").search([["email", "=ilike", addr]])
                if res:
                    return True
            return False
        if not _check_addr(vals["from_addr"]):
            print_color("email ignored: unknown 'from' address: %s" % vals["from_addr"], "red")
            return None
        if not _check_addr(vals.get("to_addrs")) and not _check_addr(vals.get("cc_addrs")):
            print_color("email ignored: unknown 'to' and 'cc' address: to=%s cc=%s" %
                        (vals.get("to_addrs"), vals.get("cc_addrs")), "red")
            return None
        new_id = self.create(vals)
        print_color("email imported: id=%d" % new_id, "green")
        self.link_emails([new_id])
        self.trigger([new_id], "received")
        return new_id

    def link_emails(self, ids, context={}):
        def _get_addr_contact(addr):
            res = get_model("contact").search([["email", "=ilike", addr]])
            if res:
                return res[0]
            return None

        def _get_msg_name(obj):
            if obj.from_addr:
                contact_id = _get_addr_contact(obj.from_addr)
                if contact_id:
                    return "contact,%d" % contact_id
            if obj.to_addrs:
                for addr in obj.to_addrs.split(","):
                    addr = addr.strip()
                    contact_id = _get_addr_contact(addr)
                    if contact_id:
                        return "contact,%d" % contact_id
            if obj.cc_addrs:
                for addr in obj.cc_addrs.split(","):
                    addr = addr.strip()
                    contact_id = _get_addr_contact(addr)
                    if contact_id:
                        return "contact,%d" % contact_id

        def _get_msg_related(obj):
            m = re.search("\[(.*?)\]", obj.subject or "")
            if not m:
                return None
            num = m.group(1).strip()
            res = get_model("sale.opportunity").search([["name", "=ilike", num]])
            if res:
                return "sale.opportunity,%s" % res[0]
            res = get_model("sale.quot").search([["number", "=ilike", num]])
            if res:
                return "sale.quot,%s" % res[0]
            res = get_model("sale.order").search([["number", "=ilike", num]])
            if res:
                return "sale.order,%s" % res[0]
            res = get_model("job").search([["number", "=ilike", num]])
            if res:
                return "job,%s" % res[0]
            res = get_model("account.invoice").search([["number", "=ilike", num]])
            if res:
                return "account.invoice,%s" % res[0]
            return None
        for obj in self.browse(ids):
            if not obj.name_id:
                name_id = _get_msg_name(obj)
                if name_id:
                    obj.write({"name_id": name_id})
            if not obj.related_id:
                related_id = _get_msg_related(obj)
                if related_id:
                    obj.write({"related_id": related_id})

    def copy_to_lead(self, context={}):
        trigger_ids = context["trigger_ids"]  # XXX: put in workflow action args instead (need eval)?
        obj = self.browse(trigger_ids)[0]
        vals = {
            "last_name": "/",
            "email": obj.from_addr,
            "description": obj.body,
        }
        lead_id = get_model("sale.lead").create(vals)
        obj.write({"related_id": "sale.lead,%d" % lead_id})

    def check_reject_list(self, ids, context={}):
        vals = {}
        for obj in self.browse(ids):
            rejected = False
            for addr in obj.to_addrs.split(","):
                addr = addr.strip()
                res = get_model("email.reject").search([["email", "=", addr]])
                if res:
                    rejected = True
                    break
            vals[obj.id] = rejected
        return vals

    def create_from_string(self, email_str, mailbox_id=None, mailbox_message_uid=None):
        print("email.message create_from_string (%d bytes)" % len(email_str), mailbox_message_uid)
        msg = email.message_from_bytes(email_str)
        msg_id = msg.get("message-id")
        print("msg_id", msg_id)
        res = get_model("email.message").search([["mailbox_id", "=", mailbox_id], ["message_id", "=", msg_id]])
        if res:
            return res[0]

        def dec_header(data):
            dh = decode_header(data or "")
            s = ""
            for data, charset in dh:
                if isinstance(data, str):
                    s += data
                else:
                    try:
                        s += data.decode(conv_charset(charset) or "utf-8")
                    except:
                        s += data.decode("utf-8", errors="replace")
            return s

        def dec_date(data):
            print("dec_date", data)
            res = parsedate_tz(data or "")
            if not res:
                return time.strftime("%Y-%m-%d %H:%M:%S")
            d = datetime.fromtimestamp(email.utils.mktime_tz(res))
            return d.strftime("%Y-%m-%d %H:%M:%S")
        body_text = []
        body_html = []
        attachments = []
        content_ids = {}
        for i, part in enumerate(msg.walk()):
            print("-" * 80)
            print("part #%d" % i)
            c_type = part.get_content_type()
            print("c_type", c_type)
            c_disp = part.get("Content-Disposition")
            print("c_disp", c_disp)
            c_id = part.get("Content-ID")
            print("c_id", c_id)
            if c_disp:
                fname = part.get_filename()
                data = part.get_payload(decode=True)
                attachments.append((fname, data))
            elif c_id:
                data = part.get_payload(decode=True)
                rand = base64.urlsafe_b64encode(os.urandom(8)).decode()
                fname = "email-inline-content," + rand
                if c_type == "image/png":
                    ext = ".png"
                elif c_type == "image/jpeg":
                    ext = ".jpg"
                elif c_type == "image/gif":
                    ext = ".gif"
                else:
                    ext = None
                if ext:
                    fname += "." + ext
                content_ids[c_id] = (fname, data)
            else:
                if c_type == "text/plain":
                    v = part.get_payload(decode=True).decode(errors="replace")
                    body_text.append(v)
                elif c_type == "text/html":
                    v = part.get_payload(decode=True).decode(errors="replace")
                    body_html.append(v)
                else:
                    continue
        if body_html:
            body = body_html[0]
        elif body_text:
            body = "<html><body>"
            for t in body_text:
                body += "<pre>" + t + "</pre>"
            body += "</body></html>"
        else:
            body = ""

        def _replace(m):
            cid = m.group(1)
            cid = "<" + cid + ">"
            if cid not in content_ids:
                return m.group(0)
            fname = content_ids[cid][0]
            dbname = get_active_db()
            return "/static/db/" + dbname + "/files/" + fname
        body = re.sub('"cid:(.*?)"', _replace, body)
        email_vals = {
            "type": "in",
            "state": "received",
            "date": dec_date(msg["date"]),
            "from_addr": parseaddr(msg["from"])[1][:64],
            "subject": dec_header(msg["subject"])[:128],
            "body": body,
            "message_id": msg_id,
            "parent_uid": msg.get("in-reply-to"),
            "mailbox_id": mailbox_id,
            "mailbox_message_uid": mailbox_message_uid,
        }
        if msg.get_all("to"):
            email_vals["to_addrs"] = ",".join([parseaddr(x)[1] for x in msg.get_all("to")])[:256]
        if msg.get_all("cc"):
            email_vals["cc_addrs"] = ",".join([parseaddr(x)[1] for x in msg.get_all("cc")])[:256]
        email_id = get_model("email.message").create(email_vals)
        for fname, data in attachments:
            if not fname:
                continue
            rand = base64.urlsafe_b64encode(os.urandom(8)).decode()
            res = os.path.splitext(fname)
            fname2 = res[0] + "," + rand + res[1]
            dbname = get_active_db()
            fdir = os.path.join("static", "db", dbname, "files")
            if not os.path.exists(fdir):
                os.makedirs(fdir)
            path = os.path.join(fdir, fname2)
            open(path, "wb").write(data)
            vals = {
                "email_id": email_id,
                "file": fname2,
            }
            get_model("email.attach").create(vals)
        for fname, data in content_ids.values():
            dbname = get_active_db()
            fdir = os.path.join("static", "db", dbname, "files")
            if not os.path.exists(fdir):
                os.makedirs(fdir)
            path = os.path.join(fdir, fname)
            open(path, "wb").write(data)

    def reply(self, ids, context={}):
        obj = self.browse(ids)[0]
        return {
            "next": {
                "name": "email",
                "mode": "form",
                "defaults": {
                    "parent_id": obj.id,
                },
            }
        }

    def get_open_detect(self, ids, context={}):
        vals = {}
        for obj in self.browse(ids):
            if obj.mailbox_id and obj.mailbox_id.type == "in":
                obj.write({"opened": True})
            vals[obj.id] = None
        return vals

    def send(self, ids, context={}):
        print("EmailMessage.send", ids)
        for obj in self.browse(ids):
            if obj.state not in ("draft","to_send"):
                continue
            account=config.get("email_account")
            mailbox = obj.mailbox_id
            if not mailbox:
                if account:
                    miss_params=[]
                    for param in ["host", "password", "port", "type", "user", "security"]:
                        found=account.get(param)
                        if not found:
                            miss_params.append(param)
                    if miss_params:
                        raise Exception("server config [email]: missing '%s'"%', '.join(miss_params))
                    if account.get("type")=='smtp':
                        obj.send_email_smtp_config()
                    elif account.get("type")=='mailgun':
                        obj.send_email_mailgun_config()
                    continue
                else:
                    raise Exception("Missing mailbox in email %s" % obj.id)
            account = mailbox.account_id
            if not account:
                raise Exception("Missing account in mailbox %s of email %s" % (mailbox.name, obj.id))
            if obj.in_reject_list:
                print("WARNING: email in reject list: %s" % obj.id)
                obj.write({"state": "rejected"})
                continue
            if account.type == "smtp":
                obj.send_email_smtp()
            elif account.type == "mailgun":
                obj.send_email_mailgun()
            else:
                raise Exception("Invalid email account type")
        return {
            "next": {
                "name": "email",
                "tab_no": 1,
            },
        }

    def send_email_smtp_config(self, ids, context={}):
        print("send_email_config_smtp", ids)
        obj = self.browse(ids)[0]
        if obj.state not in ("draft","to_send"):
            return
        try:
            account=config.get("email_account")
            if account.get("type") != "smtp":
                raise Exception("Invalid email account type")

            if account.get("security") == "SSL":
                server = smtplib.SMTP_SSL(account.get("host"), account.get("port") or 465, timeout=30)
            else:
                server = smtplib.SMTP(account.get("host"), account.get("port") or 587, timeout=30)
            server.ehlo()
            if account.get("security") == "starttls":
                server.starttls()
            if account.get("user"):
                server.login(account.get("user"), emai_account.get("password"))
            msg = MIMEMultipart()
            msg.set_charset("utf-8")
            msg["From"] = obj.from_addr
            msg["To"] = obj.to_addrs
            if obj.cc_addrs:
                msg["CC"] = ",".join([a.strip() for a in obj.cc_addrs.split(",")])
            msg["Subject"] = Header(obj.subject, "utf-8")
            msg.attach(MIMEText(obj.body, "html", "utf-8"))
            for attach in obj.attachments:
                path = utils.get_file_path(attach.file)
                data = open(path, "rb").read()
                part = MIMEBase('application', "octet-stream")
                part.set_payload(data)
                encode_base64(part)
                part.add_header('Content-Disposition', 'attachment; filename="%s"' % attach.file)
                msg.attach(part)
            to_addrs = obj.to_addrs.split(",")
            server.sendmail(obj.from_addr, to_addrs, msg.as_string())
            obj.write({"state": "sent"})
            server.quit()
        except Exception as e:
            print("WARNING: failed to send email %s" % obj.id)
            import traceback
            traceback.print_exc()
            obj.write({"state": "error", "error_message": str(e)})

    def send_email_mailgun_config(self, ids, context={}):
        print("send_emails_mailgun_config", ids)
        obj = self.browse(ids)[0]
        if obj.state not in ("draft","to_send"):
            return
        try:
            account=config.get("email_account")
            if not account:
                raise Exception("Missing email account")

            if account.get("type") != "mailgun":
                raise Exception("Invalid email account type")
            url = "https://api.mailgun.net/v2/%s/messages" % account.get("user")
            to_addrs = []
            for a in obj.to_addrs.split(","):
                a = a.strip()
                if not utils.check_email_syntax(a):
                    raise Exception("Invalid email syntax: %s" % a)
                to_addrs.append(a)
            if not to_addrs:
                raise Exception("Missing recipient address")
            data = {
                "from": obj.from_addr,
                "to": to_addrs,
                "subject": obj.subject,
            }
            if obj.cc_addrs:
                data["cc"] = [a.strip() for a in obj.cc_addrs.split(",")]
            data["html"] = obj.body
            files = []
            for attach in obj.attachments:
                path = utils.get_file_path(attach.file)
                f = open(path, "rb")
                files.append(("attachment", f))
            r = requests.post(url, auth=("api", account.get("password")), data=data, files=files,timeout=5)
            try:
                res = json.loads(r.text)
                msg_id = res["id"]
            except:
                raise Exception("Invalid mailgun response: %s" % r.text)
            obj.write({"state": "sent", "message_id": msg_id})
        except Exception as e:
            print("WARNING: failed to send email %s" % obj.id)
            import traceback
            traceback.print_exc()
            obj.write({"state": "error", "error_message": str(e)})

    def send_email_smtp(self, ids, context={}):
        print("send_email_smtp", ids)
        obj = self.browse(ids)[0]
        if obj.state not in ("draft","to_send"):
            return
        try:
            mailbox = obj.mailbox_id
            if not mailbox:
                raise Exception("Missing mailbox")
            account = mailbox.account_id
            if account.type != "smtp":
                raise Exception("Invalid email account type")
            if account.security == "SSL":
                server = smtplib.SMTP_SSL(account.host, account.port or 465, timeout=30)
            else:
                server = smtplib.SMTP(account.host, account.port or 587, timeout=30)
            server.ehlo()
            if account.security == "starttls":
                server.starttls()
            if account.user:
                server.login(account.user, account.password)
            msg = MIMEMultipart()
            msg.set_charset("utf-8")
            msg["From"] = obj.from_addr
            msg["To"] = obj.to_addrs
            if obj.cc_addrs:
                msg["CC"] = obj.cc_addrs
            msg["Subject"] = Header(obj.subject, "utf-8")
            msg.attach(MIMEText(obj.body, "html", "utf-8"))
            for attach in obj.attachments:
                path = utils.get_file_path(attach.file)
                data = open(path, "rb").read()
                part = MIMEBase('application', "octet-stream")
                part.set_payload(data)
                encode_base64(part)
                part.add_header('Content-Disposition', 'attachment; filename="%s"' % attach.file)
                msg.attach(part)
            to_addrs = obj.to_addrs.split(",")
            if obj.cc_addrs:
                to_addrs += obj.cc_addrs.split(",")
            server.sendmail(obj.from_addr, to_addrs, msg.as_string())
            obj.write({"state": "sent"})
            server.quit()
        except Exception as e:
            print("WARNING: failed to send email %s" % obj.id)
            import traceback
            traceback.print_exc()
            obj.write({"state": "error", "error_message": str(e)})

    def send_email_mailgun(self, ids, context={}):
        print("send_emails_mailgun", ids)
        obj = self.browse(ids)[0]
        if obj.state not in ("draft","to_send"):
            return
        try:
            mailbox = obj.mailbox_id
            if not mailbox:
                raise Exception("Missing mailbox")
            account = mailbox.account_id
            if account.type != "mailgun":
                raise Exception("Invalid email account type")
            url = "https://api.mailgun.net/v3/%s/messages" % account.user
            to_addrs = []
            for a in obj.to_addrs.split(","):
                a = a.strip()
                if not utils.check_email_syntax(a):
                    raise Exception("Invalid email syntax: %s" % a)
                to_addrs.append(a)
            if not to_addrs:
                raise Exception("Missing recipient address")
            data = {
                "from": obj.from_addr,
                "to": to_addrs,
                "subject": obj.subject,
            }
            if obj.cc_addrs:
                data["cc"] = [a.strip() for a in obj.cc_addrs.split(",")]
            data["html"] = obj.body
            files = []
            for attach in obj.attachments:
                path = utils.get_file_path(attach.file)
                f = open(path, "rb")
                files.append(("attachment", f))
            r = requests.post(url, auth=("api", account.password), data=data, files=files,timeout=5)
            try:
                res = json.loads(r.text)
                msg_id = res["id"]
            except:
                raise Exception("Invalid mailgun response: %s" % r.text)
            obj.write({"state": "sent", "message_id": msg_id})
        except Exception as e:
            print("WARNING: failed to send email %s" % obj.id)
            import traceback
            traceback.print_exc()
            obj.write({"state": "error", "error_message": str(e)})

    def get_emails(self, context={}):
        print("EmailMessage.get_emails")
        for mailbox in get_model("email.mailbox").search_browse([]):
            acc = mailbox.account_id
            if not acc:
                continue
            if acc.type == "imap":
                mailbox.fetch_emails_imap()
                mailbox.get_flags_imap()
            elif acc.type == "pop":
                mailbox.fetch_emails_pop()
            elif acc.type == "mailgun":
                mailbox.get_email_events_mailgun()
        return {
            "next": {
                "name": "email",
                "tab_no": 0,
            },
        }

    def mark_opened(self, ids, context={}):
        self.write(ids, {"opened": True})

    def get_num_attach(self, ids, context={}):
        vals = {}
        for obj in self.browse(ids):
            vals[obj.id] = len(obj.attachments)  # XXX: speed
        return vals

EmailMessage.register()
