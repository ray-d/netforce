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
from netforce.utils import get_data_path
from datetime import *
import time


class Bom(Model):
    _name = "bom"
    _string = "Bill of Material"
    _name_field = "number"
    _key = ["number"]
    _fields = {
        "number": fields.Char("Number", required=True, search=True),
        "product_id": fields.Many2One("product", "Product", required=True, search=True),
        "qty": fields.Decimal("Qty", required=True, scale=6),
        "uom_id": fields.Many2One("uom", "UoM", required=True),
        "location_id": fields.Many2One("stock.location", "FG Warehouse"),
        "routing_id": fields.Many2One("routing", "Routing"),
        "lines": fields.One2Many("bom.line", "bom_id", "Lines"),
        "comments": fields.One2Many("message", "related_id", "Comments"),
        "documents": fields.One2Many("document", "related_id", "Documents"),
        "max_qty_loss": fields.Decimal("Max Qty Loss", scale=6),
        "container": fields.Selection([["sale", "From Sales Order"]], "FG Container"),
        "lot": fields.Selection([["production", "From Production Order"]], "FG Lot"),
        "qc_tests": fields.Many2Many("qc.test", "QC Tests"),
    }

    def _get_number(self, context={}):
        while 1:
            num = get_model("sequence").get_number("bom")
            if not num:
                return None
            res = self.search([["number", "=", num]])
            if not res:
                return num
            get_model("sequence").increment("bom")

    _defaults = {
        "number": _get_number,
    }

    def onchange_product(self,context={}):
        data=context['data']
        path=context['path']
        line=get_data_path(data,path,parent=True)
        product_id=line['product_id']
        if product_id:
            product=get_model('product').browse(product_id)
            line['uom_id']=product.uom_id.id
        return data

Bom.register()
