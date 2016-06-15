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
from netforce.database import get_connection
from netforce import access


class ProductionPlan(Model):
    _name = "production.plan"
    _string = "Production Plan"
    _name_field = "number"
    _fields = {
        "number": fields.Char("Number", required=True, search=True),
        "product_id": fields.Many2One("product", "Product", required=True, search=True),
        "customer_id": fields.Many2One("contact", "Customer", search=True),
        "date_from": fields.Date("From Date", required=True, search=True),
        "date_to": fields.Date("To Date", required=True, search=True),
        "plan_qty": fields.Decimal("Planned Production Qty", required=True),
        "uom_id": fields.Many2One("uom", "UoM", required=True),
        "location_id": fields.Many2One("stock.location", "To Warehouse"), # XXX: deprecated
        "bom_id": fields.Many2One("bom", "BoM", required=True, search=True),
        "priority": fields.Selection([["high", "High"], ["medium", "Medium"], ["low", "Low"]], "Priority", search=True),
        "state": fields.Selection([["open", "Open"], ["closed", "Closed"]], "Status", required=True, search=True),
        "description": fields.Text("Description"),
        "comments": fields.One2Many("message", "related_id", "Comments"),
        "year": fields.Char("Year", sql_function=["year", "due_date"]),
        "quarter": fields.Char("Quarter", sql_function=["quarter", "due_date"]),
        "month": fields.Char("Month", sql_function=["month", "due_date"]),
        "week": fields.Char("Week", sql_function=["week", "due_date"]),
        "agg_qty": fields.Decimal("Total Qty", agg_function=["sum", "qty"]),
        "comments": fields.One2Many("message", "related_id", "Comments"),
        "actual_qty": fields.Decimal("Actual Production Qty", function="get_actual_qty"),
        "stock_moves": fields.One2Many("stock.move", "related_id", "Stock Movements"),
        "plan_in_qty": fields.Decimal("Planned Receipt Qty", function="get_plan_in_qty"),
        "plan_remain_qty": fields.Decimal("Planned Remain Qty", function="get_plan_remain_qty"),
        "actual_qty": fields.Decimal("Actual Production Qty", function="get_actual_qty"),
    }
    _order = "date_to"

    def _get_number(self, context={}):
        seq_id = get_model("sequence").find_sequence(type="production_plan",context=context)
        if not seq_id:
            return None
        while 1:
            num = get_model("sequence").get_next_number(seq_id, context=context)
            if not num:
                return None
            user_id = access.get_active_user()
            access.set_active_user(1)
            res = self.search([["number", "=", num]])
            access.set_active_user(user_id)
            if not res:
                return num
            get_model("sequence").increment_number(seq_id, context=context)

    _defaults = {
        "number": _get_number,
        "state": "open",
    }

    def get_actual_qty(self, ids, context={}):
        vals = {}
        for obj in self.browse(ids):
            cond = [["state", "=", "done"], ["due_date", ">=", obj.date_from],
                    ["due_date", "<=", obj.date_to], ["product_id", "=", obj.product_id.id]]
            if obj.customer_id:
                cond.append(["customer_id", "=", obj.customer_id.id])
            total = 0
            for order in get_model("production.order").search_browse(cond):
                total += get_model("uom").convert(order.qty_received, order.uom_id.id, obj.uom_id.id)
            vals[obj.id] = total
        return vals

    def get_plan_in_qty(self, ids, context={}):
        settings = get_model("settings").browse(1)
        vals = {}
        for obj in self.browse(ids):
            cond = [["state", "in", ["pending", "approved", "done"]], ["date", ">=", obj.date_from + " 00:00:00"], ["date", "<=",
                                                                                                                    obj.date_to + " 23:59:59"], ["product_id", "=", obj.product_id.id], ["location_to_id", "=", obj.location_id.id]]
            if obj.customer_id:
                cond.append(["contact_id", "=", obj.customer_id.id])
            total = 0
            for move in get_model("stock.move").search_browse(cond):
                total += get_model("uom").convert(move.qty, move.uom_id.id, obj.uom_id.id)
            vals[obj.id] = total
        return vals

    def get_plan_remain_qty(self, ids, context={}):
        db = get_connection()
        vals = {}
        for obj in self.browse(ids):
            bal_qty = 0
            res = db.query("SELECT SUM(qty) AS qty,uom_id FROM stock_move WHERE product_id=%s AND location_to_id=%s AND date<=%s AND state IN ('pending','approved','done') GROUP BY uom_id",
                           obj.product_id.id, obj.location_id.id, obj.date_to + " 23:59:59")
            for r in res:
                bal_qty += get_model("uom").convert(r.qty, r.uom_id, obj.uom_id.id)
            res = db.query("SELECT SUM(qty) AS qty,uom_id FROM stock_move WHERE product_id=%s AND location_from_id=%s AND date<=%s AND state IN ('pending','approved','done') GROUP BY uom_id",
                           obj.product_id.id, obj.location_id.id, obj.date_to + " 23:59:59")
            for r in res:
                bal_qty -= get_model("uom").convert(r.qty, r.uom_id, obj.uom_id.id)
            vals[obj.id] = bal_qty
        return vals

    def update_stock(self, ids, context={}):
        settings = get_model("settings").browse(1)
        res = get_model("stock.location").search([["type", "=", "production"]])
        if not res:
            raise Exception("Production location not found")
        mfg_loc_id = res[0]
        for obj in self.browse(ids):
            obj.stock_moves.delete()
            diff_qty = obj.plan_qty - obj.plan_in_qty
            if diff_qty <= 0:
                continue
            bom=obj.bom_id
            if not bom:
                raise Exception("Missing BoM")
            vals = {
                "date": obj.date_to + " 23:59:59",
                "journal_id": settings.pick_in_journal_id.id,
                "related_id": "production.plan,%s" % obj.id,
                "location_from_id": mfg_loc_id,
                "location_to_id": bom.location_id.id,
                "product_id": obj.product_id.id,
                "qty": diff_qty,
                "uom_id": obj.uom_id.id,
                "state": "pending",
            }
            get_model("stock.move").create(vals)
            ratio=diff_qty/bom.qty
            for line in bom.lines:
                line_qty=line.qty*ratio
                vals = {
                    "date": obj.date_to + " 23:59:59",
                    "journal_id": settings.pick_out_journal_id.id,
                    "related_id": "production.plan,%s" % obj.id,
                    "location_from_id": line.location_id.id,
                    "location_to_id": mfg_loc_id,
                    "product_id": line.product_id.id,
                    "qty": line_qty,
                    "uom_id": line.uom_id.id,
                    "state": "pending",
                }
                get_model("stock.move").create(vals)

    def close(self, ids, context={}):
        for obj in self.browse(ids):
            obj.stock_moves.delete()
            obj.write({"state": "closed"})

    def reopen(self, ids, context={}):
        for obj in self.browse(ids):
            obj.write({"state": "open"})
            obj.update_stock()

    def copy(self, ids, context={}):
        for obj in self.browse(ids):
            vals = {
                "number": obj.number,
                "product_id": obj.product_id.id,
                "customer_id": obj.customer_id.id,
                "date_from": obj.date_from,
                "date_to": obj.date_to,
                "plan_qty": obj.plan_qty,
                "uom_id": obj.uom_id.id,
                "location_id": obj.location_id.id,
                "priority": obj.priority,
                "description": obj.description,
                "state": "open",
            }
            self.create(vals)

ProductionPlan.register()
