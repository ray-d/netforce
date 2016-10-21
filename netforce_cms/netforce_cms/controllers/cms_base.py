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
from netforce.model import get_model
from netforce.database import get_connection,get_active_db # XXX: move this
from netforce.locale import set_active_locale,get_active_locale
from netforce import template

class BaseController(Controller):
    def prepare(self):
        print(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
        print("prepare")
        super(BaseController,self).prepare()
        user_id=self.get_cookie("user_id",None)
        #if not user_id :
            #self.redirect("/cms_login")
            #return
        website_id=self.request.headers.get("X-Website-ID")
        if website_id:
            website_id=int(website_id)
        else:
            res=get_model("website").search([["state","=","active"]])
            if not res:
                raise Exception("No website found")
            website_id=res[0]
        self.website_id=website_id
        website=get_model("website").browse(website_id)
        template.set_active_theme(website.theme_id.id)
        browse_ctx={
            "website_id": website.id,
            "theme_id": website.theme_id.id,
            "sale_channel_id": website.sale_channel_id.id,
            "pricelist_id": website.sale_channel_id.pricelist_id.id if website.sale_channel_id else None,
        }
        lang=self.get_argument("set_lang",None)
        if lang:
            set_active_locale(lang)
            self.set_cookie("locale",lang)
        ctx={}
        ctx["website"]=website
        ctx["database"]=get_active_db()
        ctx["locale"]=get_active_locale()
        ctx["ga_script"]=website.ga_script
        ctx["linklists"]=get_model("cms.linklist").search_browse([])
        ctx["product_groups"]=get_model("product.group").search_browse([],context=browse_ctx)
        ctx["countries"]=get_model("country").search_browse([]) # XXX
        cart_id=self.get_cookie("cart_id",None)
        if cart_id:
            cart_id=int(cart_id)
            res=get_model("ecom.cart").search([["id","=",cart_id]])
            if res:
                ctx["cart"]=get_model("ecom.cart").browse(cart_id)
            else: # handle invalid cart_id cookie
                self.clear_cookie("cart_id")
        if user_id:
            user_id=int(user_id)
            user=get_model("base.user").browse(user_id)
            ctx["customer"]=user.contact_id
        offset=self.get_argument("offset",None)
        if offset:
            ctx["offset"]=int(offset)
        ctx["url"]=self.request.uri
        self.context=ctx
