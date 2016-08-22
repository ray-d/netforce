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
from netforce import utils


class Contact(Model):
    _name = "contact"
    _string = "Contact"
    _audit_log = True
    _export_field = "name"
    _fields = {
        "user_id": fields.Many2One("base.user", "User"),
        "type": fields.Selection([["person", "Individual"], ["org", "Organization"]], "Contact Type", required=True, search=True),
        "customer": fields.Boolean("Customer", search=True),
        "supplier": fields.Boolean("Supplier", search=True),
        "name": fields.Char("Name", required=True, search=True, translate=True, size=256),
        "code": fields.Char("Code", search=True),
        "phone": fields.Char("Phone", search=True),
        "fax": fields.Char("Fax"),
        "website": fields.Char("Website"),

        "industry": fields.Char("Industry"),  # XXX: deprecated
        "employees": fields.Char("Employees"), # CRM
        "revenue": fields.Char("Annual Revenue"), # CRM
        "description": fields.Text("Description"),

        "active": fields.Boolean("Active"),

        "categ_id": fields.Many2One("contact.categ", "Contact Category"),

        "addresses": fields.One2Many("address", "contact_id", "Addresses"),
        "comments": fields.One2Many("message", "related_id", "Comments"),
        "last_name": fields.Char("Last Name"),
        "first_name": fields.Char("First Name"),
        "first_name2": fields.Char("First Name (2)"),
        "first_name3": fields.Char("First Name (3)"),
        "title": fields.Char("Title"),
        "position": fields.Char("Position"),
        "report_to_id": fields.Many2One("contact", "Reports To"),
        "mobile": fields.Char("Mobile"),
        "email": fields.Char("Email", search=True),
        "home_phone": fields.Char("Home Phone"),
        "other_phone": fields.Char("Other Phone"),
        "assistant": fields.Char("Assistant"),
        "assistant_phone": fields.Char("Assistant Phone"),
        "birth_date": fields.Date("Birth Date"), # CRM
        "department": fields.Char("Department"),
        "documents": fields.One2Many("document", "contact_id", "Documents"),
        "assigned_to_id": fields.Many2One("base.user", "Assigned To"),
        "lead_source": fields.Char("Lead source"), # CRM
        "inquiry_type": fields.Char("Type of inquiry"), # CRM
        "relations": fields.One2Many("contact.relation", "from_contact_id", "Relations", function="_get_relations"),
        "contact_id": fields.Many2One("contact", "Parent"),  # XXX: not used any more, just there for migration
        "emails": fields.One2Many("email.message", "name_id", "Emails"),
        "default_address_id": fields.Many2One("address", "Default Address", function="get_default_address"),
        "country_id": fields.Many2One("country", "Country", search=True),
        "region": fields.Char("Region"),  # XXX: deprecated
        "branch": fields.Char("Branch"),  # XXX: add by Cash
        "industry_id": fields.Many2One("industry", "Industry", search=True),
        "region_id": fields.Many2One("region", "Region", search=True),
        "business_area_id": fields.Many2One("business.area", "Business Area", search=True),
        "fleet_size_id": fields.Many2One("fleet.size", "Fleet Size", search=True),
        "groups": fields.Many2Many("contact.group", "Groups", search=True),

        "companies": fields.Many2Many("company", "Companies"),
        "picture": fields.File("Picture"),
        "users": fields.One2Many("base.user","contact_id","Users"),
    }

    def _get_number(self, context={}):
        seq_id = get_model("sequence").find_sequence(type="contact")
        if not seq_id:
            return None
        while 1:
            num = get_model("sequence").get_next_number(seq_id, context=context)
            res = self.search([["code", "=", num]])
            if not res:
                return num
            get_model("sequence").increment_number(seq_id, context=context)

    def _get_companies(self,context={}):
        is_create=context.get("is_create")
        comp_id=get_active_company()
        if comp_id:
            if not is_create:
                return [comp_id]
            else:
                return [('add',[comp_id])]

    _defaults = {
        "active": True,
        "type": "org",
        "code": _get_number,
        'companies': _get_companies,
    }
    _order = "name"
    _constraints=["check_email"]

    def create(self, vals, **kw):
        context=kw.get('context')
        if not context:
            kw['context']={
                'is_create': True,
            }
        else:
            context['is_create']=True
        if not vals.get("type"):
            if vals.get("name"):
                vals["type"] = "org"
            elif vals.get("last_name"):
                vals["type"] = "person"
        if vals.get("type") == "person":
            if vals.get("first_name"):
                vals["name"] = vals["first_name"] + " " + vals["last_name"]
            else:
                vals["name"] = vals["last_name"]
        self.check_duplicate_code(vals.get('code'))
        new_id = super().create(vals, **kw)
        return new_id

    def write(self, ids, vals, set_name=True, **kw):
        self.check_duplicate_code(vals.get('code'))
        super().write(ids, vals, **kw)
        if set_name:
            for obj in self.browse(ids):
                if obj.type == "person":
                    if obj.first_name:
                        name = obj.first_name + " " + obj.last_name
                    else:
                        name = obj.last_name
                    obj.write({"name": name}, set_name=False)

    def get_address_str(self, ids, context={}):
        obj = self.browse(ids[0])
        if not obj.addresses:
            return ""
        addr = obj.addresses[0]
        return addr.name_get()[0][1]

    def _get_relations(self, ids, context={}):
        cond = ["or", ["from_contact_id", "in", ids], ["to_contact_id", "in", ids]]
        rels = get_model("contact.relation").search_read(cond, ["from_contact_id", "to_contact_id"])
        vals = {}
        for rel in rels:
            from_id = rel["from_contact_id"][0]
            to_id = rel["to_contact_id"][0]
            vals.setdefault(from_id, []).append(rel["id"])
            vals.setdefault(to_id, []).append(rel["id"])
        return vals

    def get_address(self, ids, pref_type=None, context={}):
        obj = self.browse(ids)[0]
        for addr in obj.addresses:
            if pref_type and addr.type != pref_type:
                continue
            return addr.id
        if obj.addresses:
            return obj.addresses[0].id
        return None

    def get_default_address(self, ids, context={}):
        vals = {}
        for obj in self.browse(ids):
            addr_id = None
            for addr in obj.addresses:
                if addr.type == "billing":
                    addr_id = addr.id
                    break
            if not addr_id and obj.addresses:
                addr_id = obj.addresses[0].id
            vals[obj.id] = addr_id
        print("XXX", vals)
        return vals

    def check_email(self,ids,context={}):
        for obj in self.browse(ids):
            if not obj.email:
                continue
            if not utils.check_email_syntax(obj.email):
                raise Exception("Invalid email for contact '%s'"%obj.name)

    def check_duplicate_code(self,code,context={}):
        if code:
            res=self.search([['code','=',code]])
            if res:
                raise Exception("Duplicate code!")

Contact.register()
