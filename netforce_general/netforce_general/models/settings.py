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

from netforce.model import Model, fields
from netforce import static
import datetime
from dateutil.relativedelta import relativedelta


class Settings(Model):
    _name = "settings"
    _key = ["name"]
    _audit_log = True
    _fields = {
        "name": fields.Char("Display Name"),  # not used any more...
        "legal_name": fields.Char("Legal Name"),  # not used any more...
        "company_type_id": fields.Many2One("company.type", "Organization Type"),
        "lock_date": fields.Date("Lock Date"),
        "nf_email": fields.Char("Email to Netforce"),  # XXX: deprecated
        "share_settings": fields.One2Many("share.access", "settings_id", "Sharing Settings"),
        "logo": fields.File("Company Logo", multi_company=True),
        "package": fields.Char("Package", readonly=True),
        "version": fields.Char("Version"),
        "tax_no": fields.Char("Tax ID Number", multi_company=True),
        "branch_no": fields.Char("Branch Number", multi_company=True),
        "addresses": fields.One2Many("address", "settings_id", "Addresses", multi_company=True),
        "date_format": fields.Char("Date Format"),
        "use_buddhist_date": fields.Boolean("Use Buddhist Date"),
        "phone": fields.Char("Phone", multi_company=True),
        "fax": fields.Char("Fax", multi_company=True),
        "website": fields.Char("Website", multi_company=True),
        "root_url": fields.Char("Root URL"),
        "default_address_id": fields.Many2One("address", "Default Address", function="get_default_address"),

        "anon_profile_id": fields.Many2One("profile", "Anonymous User Profile"),
        "menu_icon": fields.File("Menu Icon"),
    }
    _defaults = {
        "package": "free",
    }

    def get_address_str(self, ids, context={}):
        obj = self.browse(ids[0])
        if not obj.addresses:
            return ""
        addr = obj.addresses[0]
        return addr.name_get()[0][1]

    def write(self, ids, vals, **kw):
        res = super().write(ids, vals, **kw)
        if "date_format" in vals or "use_buddhist_date" in vals:
            static.clear_translations()  # XXX: rename this


    def get_default_address(self, ids, context={}):
        vals = {}
        for obj in self.browse(ids):
            vals[obj.id] = obj.addresses and obj.addresses[0].id or None
        return vals

Settings.register()
