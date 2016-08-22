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
import uuid


class Product(Model):
    _name = "product"
    _key = ["name"]
    _order = "name"
    _name_field = "name"
    _fields = {
        "name": fields.Char("Name", required=True),
        "code": fields.Char("Code"),
        "description": fields.Text("Description"),
        "purchase_price": fields.Decimal("Purchase Price"),
        "sale_price": fields.Decimal("Sale Price"),
        "tags": fields.Many2Many("tag", "Tags"),
        "image": fields.File("Image"),
        "cost_method": fields.Selection([["standard", "Standard Cost"], ["average", "Weighted Average"], ["fifo", "FIFO"], ["lifo", "LIFO"]], "Costing Method"),
        "cost_price": fields.Decimal("Cost Price"),
        "uuid": fields.Char("UUID"),
    }
    _defaults = {
        "uuid": lambda *a: str(uuid.uuid4()),
    }

Product.register()
