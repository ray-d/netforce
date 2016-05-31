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
from datetime import *
from dateutil.relativedelta import *
from netforce.access import get_active_company
from netforce.database import get_connection
import math

class ReportStockPlan(Model):
    _name = "report.stock.plan"
    _transient = True
    _fields = {
        "product_id": fields.Many2One("product", "Product", on_delete="cascade"),
        "product_categ_id": fields.Many2One("product.categ", "Product Category", on_delete="cascade"),
        "supplier_id": fields.Many2One("contact","Supplier"),
    }

    def get_report_data(self, ids, context={}):
        settings = get_model("settings").browse(1)
        company_id = get_active_company()
        comp = get_model("company").browse(company_id)
        if ids:
            params = self.read(ids, load_m2o=False)[0]
        else:
            params = self.default_get(load_m2o=False, context=context)
        product_id=params.get("product_id")
        categ_id=params.get("product_categ_id")
        if categ_id:
            categ_ids=get_model("product.categ").search([["id","child_of",categ_id]])
        else:
            categ_ids=None
        supplier_id=params.get("supplier_id")
        loc_types={}
        for loc in get_model("stock.location").search_browse([]):
            loc_types[loc.id]=loc.type
        min_qtys=get_model("stock.order").get_min_qtys()
        print("get qtys_unlim...")
        qtys_unlim=get_model("stock.order").get_plan_qtys_unlim(product_id=product_id,categ_ids=categ_ids)
        print("got_qtys_unlim (%s)"%len(qtys_unlim))
        product_ids=[]
        for prod_id,qty in qtys_unlim.items():
            min_qty=min_qtys.get(prod_id,0)
            if qty<min_qty:
                product_ids.append(prod_id)
        if supplier_id:
            prod_ids2=[]
            for prod in get_model("product").browse(product_ids):
                if prod.suppliers and prod.suppliers[0].supplier_id.id==supplier_id:
                    prod_ids2.append(prod.id)
            product_ids=prod_ids2
        print("product_ids",product_ids)
        qtys_horiz=get_model("stock.order").get_plan_qtys_horiz(product_ids)
        req_dates=get_model("stock.order").get_required_dates(product_ids)
        lines=[]
        for prod in get_model("product").browse(product_ids):
            plan_days=prod.stock_plan_horizon
            qty_unlim=qtys_unlim.get(prod.id,0)
            if plan_days is not None:
                qty_horiz=qtys_horiz.get(prod.id,0)
            else:
                qty_horiz=qty_unlim
            min_qty=min_qtys.get(prod.id,0)
            req_qty=min_qty-qty_horiz
            req_date=req_dates[prod.id]
            if not req_date:
                continue
            if prod.supply_method=="purchase":
                supply_method="Purchase"
                if prod.purchase_uom_id and prod.purchase_uom_id.id!=prod.uom_id.id:
                    order_uom=prod.purchase_uom_id
                    if not prod.purchase_to_stock_uom_factor:
                        raise Exception("Missing purchase to stock UoM factor for product %s"%prod.code)
                    order_qty=req_qty/prod.purchase_to_stock_uom_factor
                    if prod.purchase_min_qty and order_qty<prod.purchase_min_qty:
                        order_qty=prod.purchase_min_qty
                    if prod.purchase_qty_multiple:
                        n=math.ceil(order_qty/prod.purchase_qty_multiple)
                        order_qty=n*prod.purchase_qty_multiple
                else:
                    order_uom=prod.uom_id
                    order_qty=req_qty
                order_date=(datetime.strptime(req_date,"%Y-%m-%d")-timedelta(days=prod.purchase_lead_time or 0)).strftime("%Y-%m-%d")
            elif prod.supply_method=="production":
                supply_method="Production"
                order_uom=prod.uom_id
                order_qty=req_qty
                order_date=(datetime.strptime(req_date,"%Y-%m-%d")-timedelta(days=prod.mfg_lead_time or 0)).strftime("%Y-%m-%d")
            else:
                supply_method=None
                order_uom=None
                order_qty=None
                order_date=None
            line_vals={
                "product_id": prod.id,
                "product_code": prod.code,
                "product_name": prod.name,
                "plan_days": plan_days,
                "plan_qty_horiz": qty_horiz,
                "plan_qty_unlim": qty_unlim,
                "min_qty": min_qty,
                "req_qty": req_qty,
                "stock_uom_name": prod.uom_id.name,
                "req_date": req_date,
                "order_qty": order_qty,
                "order_uom_name": order_uom and order_uom.name or None,
                "order_date": order_date,
                "below_min": qty_horiz<min_qty,
                "supply_method": supply_method,
                "supplier_name": prod.suppliers and prod.suppliers[0].supplier_id.name or None,
            }
            lines.append(line_vals)
        lines.sort(key=lambda l: l["product_code"])
        print("lines",lines)
        data = {
            "company_name": comp.name,
            "lines": lines,
        }
        return data

ReportStockPlan.register()
