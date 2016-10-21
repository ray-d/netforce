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

from netforce.controller import Controller
from netforce.template import render
from netforce.model import get_model
from netforce.database import get_connection  # XXX: move this
import json
from netforce import utils
import base64
import os
from .cms_base import BaseController


class CartAdd(BaseController):
    _path = "/ecom_cart_add"

    def post(self):
        print("/ecom_cart_add")
        db = get_connection()
        try:
            cart_id = self.get_cookie("cart_id", None)
            user_id = self.get_cookie("user_id", None)
            if cart_id:
                cart_id = int(cart_id)
                res = get_model("ecom.cart").search([["id", "=", cart_id]])
                if not res:
                    cart_id = None
            if not cart_id:
                cart_id = get_model("ecom.cart").create_new_cart(website_id=self.website_id)
            product_id = self.get_argument("product_id")
            product_id = int(product_id)
            qty = self.get_argument("qty", None)
            if qty:
                qty = int(qty)
            else:
                qty = 1
            product = get_model("product").browse(product_id)
            variant_id = None
            if product.type == "master":
                for variant in product.variants:
                    print("checking variant %s..." % variant.code)
                    attr_vals={}
                    for attr in variant.attributes:
                        attr_vals[attr.attribute_id.code]=attr.option_id.code
                    print("attr_vals",attr_vals)
                    found = True
                    for arg in self.request.arguments:
                        if not arg.startswith("_CUST_OPT_"): #if end with space get argument will remove space
                            continue
                        attr_val=self.get_argument(arg)
                        attr_code=arg.replace("_CUST_OPT_","")
                        if attr_vals.get(attr_code)!=attr_val:
                            print("rejected because of attr %s (%s / %s)" % (attr_code, attr_val, attr_vals.get(attr_code)))
                            found=False
                            break
                    if found:
                        variant_id = variant.id
                        break
                if not variant_id:
                    raise Exception("Variant not found for master product %s" % product.code)
                print("variant found: %s"%variant_id)
            desc = self.get_argument("description", None)
            images = []
            for arg in self.request.arguments:
                if arg.startswith("preview_image_"):
                    preview_imgs.append(arg)
                    data = base64.b64decode(self.get_argument(arg).split(",", 1)[1].encode("utf-8"))
                    rand = base64.urlsafe_b64encode(os.urandom(8)).decode()
                    fname = "%s,%s.jpg" % (arg, rand)
                    images.append((data, fname))
            get_model("ecom.cart").add_product([cart_id], variant_id or product_id, desc, qty, images)
            db.commit()
            # set cookie only after commit to avoid invalid cart_id in case of exception
            self.set_cookie("cart_id", str(cart_id))
            self.redirect("/ecom_cart")
        except:
            import traceback
            traceback.print_exc()
            db.rollback()

CartAdd.register()
