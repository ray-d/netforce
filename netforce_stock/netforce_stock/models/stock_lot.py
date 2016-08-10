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


class StockLot(Model):
    _name = "stock.lot"
    _string = "Lot / Serial Number"
    _name_field = "number"
    _key = ["number"]
    _fields = {
        "number": fields.Char("Number", required=True, search=True),
        "received_date": fields.DateTime("Received Date", search=True),
        "expiry_date": fields.Date("Expiry Date", search=True),
        "description": fields.Text("Description", search=True),
        "weight": fields.Decimal("Weight"),
        "width": fields.Decimal("Width"),
        "length": fields.Decimal("Length"),
        "comments": fields.One2Many("message", "related_id", "Comments"),
        "product_id": fields.Many2One("product","Product",search=True),
        "stock_balances": fields.One2Many("stock.balance","lot_id","Stock Quantities"),
    }
    _order = "number desc"

    def _get_number(self, context={}):
        seq_id = get_model("sequence").find_sequence("stock_lot")
        if not seq_id:
            return None
        while 1:
            num = get_model("sequence").get_next_number(seq_id)
            res = self.search([["number", "=", num]])
            if not res:
                return num
            get_model("sequence").increment_number(seq_id)

    _defaults = {
        "number": _get_number,
    }

    def remove_expired_lots(self,context={}):
        print("StockLot.remove_expired_lots")
        access.set_active_user(1)
        access.set_active_company(1)
        settings=get_model("settings").browse(1)
        if not settings.lot_expiry_journal_id:
            raise Exception("Missing lot expiry journal")
        journal=settings.lot_expiry_journal_id
        if not journal.location_to_id:
            raise Exception("Missing to location in lot expiry journal")
        t=time.strftime("%Y-%m-%d")
        pick_vals={
            "type": "out",
            "journal_id": journal.id,
            "lines": [],
        }
        n=0
        for obj in self.search_browse([["expiry_date","<",t]]):
            prod=obj.product_id
            if not prod:
                continue
            for bal in obj.stock_balances:
                if bal.qty_phys<=0:
                    continue
                line_vals={
                    "product_id": prod.id,
                    "location_from_id": bal.location_id.id,
                    "location_to_id": journal.location_to_id.id,
                    "lot_id": obj.id,
                    "qty": bal.qty_phys,
                    "uom_id": prod.uom_id.id,
                }
                pick_vals["lines"].append(("create",line_vals))
                n+=1
        if pick_vals["lines"]:
            pick_id=get_model("stock.picking").create(pick_vals,context={"pick_type":"out"})
            get_model("stock.picking").set_done([pick_id])
            get_model("stock.picking").trigger([pick_id],"lot_expired")
        return {
            "flash": "%d lots removed from stock"%n,
        }

StockLot.register()
