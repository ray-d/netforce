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
import time


class SaleCost(Model):
    _name = "sale.cost"
    _string = "Cost"
    _fields = {
        "sale_id": fields.Many2One("sale.order","Sales Order",required=True,on_delete="cascade"),
        "sequence": fields.Char("Apply To Item No.",required=True),
        "product_id": fields.Many2One("product","Cost Product"),
        "description": fields.Text("Description",required=True,search=True),
        "unit_price": fields.Decimal("Unit Price"), # XXX deprecated
        "list_price": fields.Decimal("Supplier List Price",required=True),
        "purchase_price": fields.Decimal("Purchase Price"),
        "purchase_duty_percent": fields.Decimal("Import Duty (%)"),
        "purchase_ship_percent": fields.Decimal("Shipping Charge (%)"),
        "landed_cost": fields.Decimal("Landed Cost"),
        "qty": fields.Decimal("Qty"),
        "uom_id": fields.Many2One("uom","UoM"), # XXX deprecated
        "amount_cur": fields.Decimal("Cost Amount (Cur)",function="get_amount_cur"),
        "amount": fields.Decimal("Cost Amount",function="get_amount"),
        "currency_id": fields.Many2One("currency","Currency"),
        "currency_rate": fields.Decimal("Currency Rate"), # XXX: deprecated
        "supplier_id": fields.Many2One("contact","Supplier"),
    }
    _order="sequence::numeric"

    def get_amount_cur(self,ids,context={}):
        vals={}
        for obj in self.browse(ids):
            currency_id = obj.sale_id.currency_id.id    ## get currency sale order
            amt = (obj.qty or 0)*(obj.landed_cost or 0) ## amount total
            std_currency = obj.currency_id.id           ## get currency in line cost
            f_rate = get_model("currency").get_rate([std_currency])  ## get rate currency in line cost
            ## get rate from tab currency in order
            so_rate = get_model("custom.currency.rate").search_browse([["related_id","=","sale.order,%s"%obj.sale_id.id],["currency_id","=",obj.sale_id.currency_id.id]])             
            if len(so_rate) > 0 and obj.currency_id.id != std_currency:
                if obj.sale_id.date: 
                    total = get_model("currency").convert(amt, std_currency, currency_id ,from_rate=f_rate,date=obj.sale_id.date, to_rate=so_rate[0].rate)
                else:
                    total = get_model("currency").convert(amt, std_currency, currency_id ,from_rate=f_rate, to_rate=so_rate[0].rate)
            else:
                if obj.sale_id.date:
                    total = get_model("currency").convert(amt, std_currency, currency_id, date=obj.sale_id.date, rate_type="buy")
                else:
                    total = get_model("currency").convert(amt, std_currency, currency_id, rate_type="buy")
            vals[obj.id]=total
        return vals

    def get_amount(self,ids,context={}):
        vals={}
        settings = get_model("settings").browse(1)
        default_currency_id = settings.currency_id.id
        for obj in self.browse(ids):
            so_rate = get_model("custom.currency.rate").search_browse([["related_id","=","sale.order,%s"%obj.sale_id.id],["currency_id","=",obj.sale_id.currency_id.id]])
            if len(so_rate) > 0:
                amount = (so_rate[0].rate or 0) * (obj.amount_cur or 0)
            else:
                if obj.sale_id.date:
                    amount = get_model("currency").convert(((obj.qty or 0)*(obj.landed_cost or 0)), obj.currency_id.id, default_currency_id, date=obj.sale_id.date, rate_type="buy")
                else:
                    amount = get_model("currency").convert(((obj.qty or 0)*(obj.landed_cost or 0)), obj.currency_id.id, default_currency_id, rate_type="buy")

            if obj.sale_id.currency_id.id == default_currency_id:
                if obj.product_id.id:
                ## check sale is THB and default is THB ,but set currency is not THB in product 
                #if obj.sale_id.currency_id.id == default_currency_id:
                    if obj.product_id.purchase_currency_id.id != default_currency_id:
                        if obj.sale_id.date:
                            amount = get_model("currency").convert(((obj.qty or 0)*(obj.landed_cost or 0)), obj.product_id.purchase_currency_id.id, default_currency_id, date=obj.sale_id.date, rate_type="buy")
                        else:
                            amount = get_model("currency").convert(((obj.qty or 0)*(obj.landed_cost or 0)), obj.product_id.purchase_currency_id.id, default_currency_id, rate_type="buy")
                else:
                    if obj.sale_id.date:
                        amount = get_model("currency").convert(((obj.qty or 0)*(obj.landed_cost or 0)), obj.currency_id.id, default_currency_id, date=obj.sale_id.date, rate_type="buy")
                    else:
                        amount = get_model("currency").convert(((obj.qty or 0)*(obj.landed_cost or 0)), obj.currency_id.id, default_currency_id, rate_type="buy")


            vals[obj.id]=amount
        return vals

SaleCost.register()
