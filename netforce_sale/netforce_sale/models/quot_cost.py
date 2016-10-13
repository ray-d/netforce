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


class QuotCost(Model):
    _name = "quot.cost"
    _string = "Cost"
    _fields = {
        "quot_id": fields.Many2One("sale.quot","Quotation",required=True,on_delete="cascade"),
        "sequence": fields.Char("Apply To Item No."),
        "product_id": fields.Many2One("product","Cost Product"),
        "description": fields.Text("Description",required=True,search=True),
        "unit_price": fields.Decimal("Unit Price"), # XXX deprecated
        "list_price": fields.Decimal("Supplier List Price"),
        "purchase_price": fields.Decimal("Purchase Price"),
        "purchase_duty_percent": fields.Decimal("Import Duty (%)"),
        "purchase_ship_percent": fields.Decimal("Shipping Charge (%)"),
        "landed_cost": fields.Decimal("Landed Cost"),
        "qty": fields.Decimal("Qty"),
        "uom_id": fields.Many2One("uom","UoM"), # XXX deprecated
        "amount_cur": fields.Decimal("Cost Amount (Cur)",function="get_amount_cur"),
        "amount": fields.Decimal("Cost Amount",function="get_amount"),
        "currency_id": fields.Many2One("currency","Currency"),
        "currency_rate": fields.Decimal("Currency Rate"), # XXX deprecated
        "supplier_id": fields.Many2One("contact","Supplier"),
    }

    _order="sequence::numeric"

    _defaults={
        'sequence': '',
    }

    def get_amount_cur(self,ids,context={}):
        vals={}
        for obj in self.browse(ids):
            vals[obj.id]=(obj.qty or 0)*(obj.landed_cost or 0)
        return vals

    def get_amount(self,ids,context={}):
        vals={}
        settings = get_model("settings").browse(1)
        default_currency_id = settings.currency_id.id
        for obj in self.browse(ids):
            quot_rate = get_model("custom.currency.rate").search_browse([["related_id","=","sale.quot,%s"%obj.quot_id.id],["currency_id","=",obj.quot_id.currency_id.id]])
            if len(quot_rate) > 0:
                amount = (quot_rate[0].rate or 0) * (obj.amount_cur or 0)
            else:
                if obj.quot_id.date:
                    date_rate = obj.quot_id.date
                    amount = get_model("currency").convert(((obj.qty or 0)*(obj.landed_cost or 0)), obj.currency_id.id, default_currency_id, date=date_rate, rate_type="buy")
                else:
                    amount = get_model("currency").convert(((obj.qty or 0)*(obj.landed_cost or 0)), obj.currency_id.id, default_currency_id,rate_type="buy")
            ## check quot is THB and default is THB ,but set currency is not THB in product 
            if obj.quot_id.currency_id.id == default_currency_id:
                if obj.product_id.id:
                    if obj.product_id.purchase_currency_id.id != default_currency_id:
                        if obj.quot_id.date:
                            date_rate = obj.quot_id.date
                            amount = get_model("currency").convert(((obj.qty or 0)*(obj.landed_cost or 0)), obj.product_id.purchase_currency_id.id, default_currency_id, date=date_rate, rate_type="buy")
                        else:
                            amount = get_model("currency").convert(((obj.qty or 0)*(obj.landed_cost or 0)), obj.product_id.purchase_currency_id.id, default_currency_id,rate_type="buy")

                else:
                    if obj.quot_id.date:
                        date_rate = obj.quot_id.date
                        amount = get_model("currency").convert(((obj.qty or 0)*(obj.landed_cost or 0)), obj.currency_id.id, default_currency_id, date=date_rate, rate_type="buy")
                    else:
                        amount = get_model("currency").convert(((obj.qty or 0)*(obj.landed_cost or 0)), obj.currency_id.id, default_currency_id,rate_type="buy")
            vals[obj.id]=amount
        return vals

QuotCost.register()
