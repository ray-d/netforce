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
import time
import os
from netforce import ipc
from netforce import database

_cache = {}


def _clear_cache():
    pid = os.getpid()
    print("uom _clear_cache pid=%s" % pid)
    _cache.clear()

ipc.set_signal_handler("clear_uom_cache", _clear_cache)


class Uom(Model):
    _name = "uom"
    _string = "Unit of Measure"
    _key = ["name"]
    _fields = {
        "name": fields.Char("Name", required=True, search=True),
        "type": fields.Selection([["unit", "Unit"], ["time", "Time"], ["length", "Length"], ["weight", "Weight"], ["volume", "Volume"], ["other", "Other"]], "Type", required=True, search=True),
        "ratio": fields.Decimal("Ratio", required=True, scale=9),
        "comments": fields.One2Many("message", "related_id", "Comments"),
    }
    _defaults = {
        "ratio": 1,
    }

    def create(self, *a, **kw):
        new_id = super().create(*a, **kw)
        ipc.send_signal("clear_uom_cache")
        return new_id

    def write(self, *a, **kw):
        super().write(*a, **kw)
        ipc.send_signal("clear_uom_cache")

    def delete(self, *a, **kw):
        super().delete(*a, **kw)
        ipc.send_signal("clear_uom_cache")

    def get_ratio(self, uom_id, context={}):
        dbname = database.get_active_db()
        if not context.get("no_cache"):
            if (dbname, uom_id) in _cache:
                return _cache[(dbname, uom_id)]
        obj = self.browse(uom_id)
        if not context.get("no_cache"):
            _cache[(dbname, uom_id)] = obj.ratio
        return obj.ratio

    def convert(self, qty, uom_from_id, uom_to_id, context={}):
        #print("UoM.convert",qty,uom_from_id,uom_to_id)
        from_ratio = self.get_ratio(uom_from_id,context=context)
        #print("from_ratio",from_ratio)
        to_ratio = self.get_ratio(uom_to_id,context=context)
        #print("to_ratio",to_ratio)
        qty_conv = qty * (from_ratio or 1) / (to_ratio or 1)
        #print("qty_conv",qty_conv)
        return qty_conv

Uom.register()
