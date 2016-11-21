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
from decimal import Decimal

class SaleQuotLine(Model):
    _name = "sale.quot.line"
    _fields = {
        "quot_id": fields.Many2One("sale.quot", "Quotation", required=True, on_delete="cascade", search=True),
        "product_id": fields.Many2One("product", "Product", search=True),
        "description": fields.Text("Description", required=True),
        "qty": fields.Decimal("Qty"),
        "uom_id": fields.Many2One("uom", "UoM"),
        "unit_price": fields.Decimal("Unit Price", scale=6),
        "discount": fields.Decimal("Disc %"),
        "discount_amount": fields.Decimal("Disc Amt"),
        "tax_id": fields.Many2One("account.tax.rate", "Tax Rate"),
        "amount": fields.Decimal("Amount",readonly=True),
        "contact_id": fields.Many2One("contact", "Contact", function="_get_related", function_search="_search_related", function_context={"path": "quot_id.contact_id"}, search=True),
        "date": fields.Date("Date", function="_get_related", function_search="_search_related", function_context={"path": "quot_id.date"}, search=True),
        "user_id": fields.Many2One("base.user", "Owner", function="_get_related", function_search="_search_related", function_context={"path": "quot_id.user_id"}, search=True),
        "state": fields.Selection([("draft", "Draft"), ("waiting_approval", "Awaiting Approval"), ("approved", "Approved"), ("won", "Won"), ("lost", "Lost"), ("revised", "Revised")], "Status", function="_get_related", function_search="_search_related", function_context={"path": "quot_id.state"}, search=True),
        "product_categs": fields.Many2Many("product.categ", "Product Categories", function="_get_related", function_context={"path": "product_id.categs"}, function_search="_search_related", search=True),
        "agg_amount": fields.Decimal("Total Amount", agg_function=["sum", "amount"]),
        "agg_qty": fields.Decimal("Total Order Qty", agg_function=["sum", "qty"]),
        "sequence": fields.Char("Item No."),
        "retail_price": fields.Decimal("Retail Price"),
        "retail_amount": fields.Decimal("Retail Amount",function="get_retail_amount"),
        "est_cost_amount": fields.Decimal("Est. Cost Amount",function="get_est_profit",function_multi=True),
        "est_profit_amount": fields.Decimal("Est. Profit Amount",function="get_est_profit",function_multi=True),
        "est_margin_percent": fields.Decimal("Est. Margin %",function="get_est_profit",function_multi=True),
        "hide_sub": fields.Boolean("Hide Sub-items"),
        "is_hidden": fields.Boolean("Hidden",function="get_is_hidden",function_multi=True),
        "parent_sequence": fields.Char("Parent Sequence",function="get_is_hidden",function_multi=True),
        "est_margin_percent_input": fields.Decimal("Est. Margin % Input"),
        "unit_price_dis": fields.Decimal("Unit Price (Discount)", scale=6),
        "supp_price_list": fields.Decimal("Supplier price list", scale=6,function="get_supp_price_list"),
        "cif": fields.Decimal("CIF", scale=6,function="get_cif"),
    }
    _order = "sequence::numeric,id"

    def create(self, vals, context={}):
        id = super(SaleQuotLine, self).create(vals, context)
        self.function_store([id])
        return id

    def write(self, ids, vals, context={}):
        super(SaleQuotLine, self).write(ids, vals, context)
        self.function_store(ids)

    def get_retail_amount(self, ids, context={}):
        vals = {}
        for line in self.browse(ids):
            vals[line.id] = (line.retail_price or 0) * (line.qty or 0)
        return vals

    def get_supp_price_list(self,ids,context={}):
        quot_ids=[]
        for line in self.browse(ids):
            quot_ids.append(line.quot_id.id)
        quot_ids=list(set(quot_ids))
        item_costs={}
        ## get currency default == THB
        settings = get_model("settings").browse(1)
        default_currency_id = settings.currency_id.id
        for quot in get_model("sale.quot").browse(quot_ids):
            for cost in quot.est_costs:
                comps=[]
                if cost.sequence:
                    for comp in cost.sequence.split("."):
                        comps.append(comp)
                        path=".".join(comps)
                        k=(quot.id,path)
                        item_costs.setdefault(k,0)
                        item_costs[k]+=cost.list_price or 0
        vals={}
        for line in self.browse(ids):
            k=(line.quot_id.id,line.sequence)
            supp_price_list=item_costs.get(k,0)
            if line.qty:
                vals[line.id]=supp_price_list
            else:
                vals[line.id]=0
        return vals

    def get_cif(self,ids,context={}):
        quot_ids=[]
        for line in self.browse(ids):
            quot_ids.append(line.quot_id.id)
        quot_ids=list(set(quot_ids))
        item_costs={}
        ## get currency default == THB
        settings = get_model("settings").browse(1)
        default_currency_id = settings.currency_id.id
        for quot in get_model("sale.quot").browse(quot_ids):
            for cost in quot.est_costs:
                comps=[]
                if cost.sequence and cost.purchase_duty_percent and cost.purchase_ship_percent:
                    for comp in cost.sequence.split("."):
                        purchase_duty_percent = (cost.list_price * Decimal((cost.purchase_duty_percent or 0) / 100)) or 0
                        purchase_ship_percent = (cost.list_price * Decimal((cost.purchase_ship_percent or 0) / 100)) or 0
                        comps.append(comp)
                        path=".".join(comps)
                        k=(quot.id,path)
                        item_costs.setdefault(k,0)
                        item_costs[k]+= purchase_duty_percent + purchase_ship_percent
        vals={}
        for line in self.browse(ids):
            k=(line.quot_id.id,line.sequence)
            if line.qty:
                cif=item_costs.get(k,0)
            else:
                cif=0
            vals[line.id]=cif
        return vals

    def get_est_profit(self,ids,context={}):
        quot_ids=[]
        for line in self.browse(ids):
            quot_ids.append(line.quot_id.id)
        quot_ids=list(set(quot_ids))
        ## get currency default == THB
        settings = get_model("settings").browse(1)
        default_currency_id = settings.currency_id.id
        item_costs={}
        for quot in get_model("sale.quot").browse(quot_ids):
            for cost in quot.est_costs:
                if line.quot_id.currency_id.id != default_currency_id:
                    amt=cost.amount_cur or 0
                else:
                    amt=cost.amount or 0
                #if cost.currency_id:
                #    rate=quot.get_relative_currency_rate(cost.currency_id.id)
                #    amt=amt*rate
                comps=[]
                if cost.sequence:
                    for comp in cost.sequence.split("."):
                        comps.append(comp)
                        path=".".join(comps)
                        k=(quot.id,path)
                        item_costs.setdefault(k,0)
                        item_costs[k]+=amt
        vals={}
        for line in self.browse(ids):
            k=(line.quot_id.id,line.sequence)
            cost=item_costs.get(k,0)
            profit = (line.amount or 0) - cost
            margin=profit*100/line.amount if line.amount else 0
            if not line.hide_sub and not line.qty :
                cost = 0
                profit = 0
                margin = 0
            vals[line.id]={
                "est_cost_amount": cost,
                "est_profit_amount": profit,
                "est_margin_percent": margin,
            }
        return vals

    def get_is_hidden(self,ids,context={}):
        quot_ids=[]
        for obj in self.browse(ids):
            quot_ids.append(obj.quot_id.id)
        quot_ids=list(set(quot_ids))
        vals={}
        for quot in get_model("sale.quot").browse(quot_ids):
            hide_parents=[]
            for line in quot.lines:
                if line.hide_sub and line.sequence:
                    hide_parents.append(line.sequence)
            for line in quot.lines:
                parent_seq=None
                if line.sequence:
                    for seq in hide_parents:
                        if line.sequence.startswith(seq+"."):
                            parent_seq=seq
                            break
                if line.id in ids:
                    vals[line.id]={
                        "is_hidden": parent_seq is not None,
                        "parent_sequence": parent_seq,
                    }
        return vals

SaleQuotLine.register()
