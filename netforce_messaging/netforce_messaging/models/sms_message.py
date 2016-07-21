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
from netforce import access
import time
import requests

class SmsMessage(Model):
    _name = "sms.message"
    _string = "SMS Message"
    _name_field = "sender"
    _fields = {
        "account_id": fields.Many2One("sms.account", "SMS Account"),
        "date": fields.DateTime("Date", required=True, search=True),
        "phone": fields.Char("Phone Number", required=True, size=256, search=True),
        "body": fields.Text("Body", search=True),
        "state": fields.Selection([["draft", "Draft"], ["to_send", "To Send"], ["sent", "Sent"], ["error", "Error"]], "Status", required=True),
    }
    _order = "date desc"
    _defaults = {
        "state": "draft",
        "date": lambda *a: time.strftime("%Y-%m-%d %H:%M:%S"),
    }

    def to_send(self, ids, context={}):
        for obj in self.browse(ids):
            obj.write({"state": "to_send"})

    def send_thaibulksms(self, context={}):
        ids = self.search([["state", "=", "to_send"]])
        for obj in self.browse(ids):
            acc = obj.account_id
            if not acc:
                raise Exception("Missing SMS account")
            if acc.type!="thaibulksms":
                raise Exception("Invalid SMS account type")
            params = {
                'username': acc.username,
                'password': acc.password,
                'msisdn': obj.phone,
                'message': obj.body[:160].encode('tis-620'),
                'sender': acc.sender
            }
            url = "https://secure.thaibulksms.com/sms_api.php"
            res = requests.get(url, params=params, timeout=10).read().decode()
            if res.find("<Status>1</Status>") == -1:
                raise Exception(res)
            obj.write({"state": "sent"})

    def send_smsmkt(self,ids,context={}):
        print("send_smsmkt",ids)
        for obj in self.browse(ids):
            acc=obj.account_id
            if not acc:
                raise Exception("Missing SMS account")
            if not acc.username:
                raise Exception("Missing SMSMKT username")
            if not acc.password:
                raise Exception("Missing SMSMKT password")
            if not acc.sender:
                raise Exception("Missing SMSMKT sender")
            url="https://member.smsmkt.com/SMSLink/SendMsg/index.php"
            params={
                "Username": acc.username,
                "Password": acc.password,
                "Msnlist": obj.phone,
                "Msg": obj.body,
                "Sender": acc.sender,
            }
            url+="?User=%(Username)s&Password=%(Password)s&Msnlist=%(Msnlist)s&Msg=%(Msg)s&Sender=%(Sender)s"%params
            r=requests.get(url,timeout=15)
            if r.status_code!=200:
                raise Exception("Failed to send SMS")
            print("SMSMKT response",r.text)
            if r.text.find("Status=0,")==-1:
                raise Exception("Invalid SMSMKT reponse")
            obj.write({"state": "sent"})

    def send(self,ids,context={}):
        for obj in self.browse(ids):
            acc=obj.account_id
            if not acc:
                raise Exception("Missing SMS account")
            if acc.type=="thaibulksms":
                obj.send_thaibulksms()
            elif acc.type=="smsmkt":
                obj.send_smsmkt()
            else:
                raise Exception("Invalid account type")

    def send_messages(self, context={}):
        print("SmsMessage.send_messages")
        ids = self.search([["state", "=", "to_send"]])
        for obj in self.browse(ids):
            try:
                obj.send()
            except Exception as e:
                print("Failed to send SMS: %s" % e)
                import traceback
                traceback.print_exc()
                obj.write({"state": "error"})
                get_model("log").log("Failed to send Sms", str(e))

    def send_from_template(self, template=None, context={}):
        if not template:
            raise Exception("Missing template")
        res = get_model("sms.template").search([["name", "=", template]])
        if not res:
            raise Exception("Template not found: %s" % template)
        tmpl_id = res[0]
        tmpl = get_model("sms.template").browse(tmpl_id)
        trigger_model = context.get("trigger_model")
        if not trigger_model:
            raise Exception("Missing trigger model")
        tm = get_model(trigger_model)
        trigger_ids = context.get("trigger_ids")
        if trigger_ids is None:
            raise Exception("Missing trigger ids")
        user_id = access.get_active_user()
        if user_id:
            user = get_model("base.user").browse(user_id)
        else:
            user = None
        for obj in tm.browse(trigger_ids):
            tmpl_ctx = {"obj": obj, "user": user, "context": context}
            tmpl.create_sms(data=tmpl_ctx)

SmsMessage.register()
