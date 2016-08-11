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
import urllib.request as reg

from netforce.controller import Controller
from netforce.template import render
from netforce.model import get_model
from netforce.database import get_connection,get_active_db # XXX: move this
from netforce.locale import set_active_locale,get_active_locale
from netforce.utils import new_token
from netforce.access import set_active_user
from .cms_base import BaseController

class Login(BaseController):
    _path="/cms_login"

    def get(self):
        db=get_connection()
        try:
            ctx=self.context
            ctx["return_url"]=self.get_argument("return_url",None)
            ctx["message"]=self.get_argument("message",None)
            content=render("cms_login",ctx)
            ctx["content"]=content
            html=render("cms_layout",ctx)
            self.write(html)
            db.commit()
        except:
            import traceback
            traceback.print_exc()
            db.rollback()

    def post(self):
        db=get_connection()
        try:
            try:
                print("CHECK protocol XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
                print(self.request.protocol)
                print("CHECK protocol XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
                fields=["email","password"]
                field_errors={}
                form_vals={}
                for n in fields:
                    v=self.get_argument(n,None)
                    form_vals[n]=v
                    if not v:
                        field_errors[n]=True
                if field_errors:
                    raise Exception("Some required fields are missing")
                #user_id=get_model("base.user").check_password(form_vals["email"],form_vals["password"])
                data_login={
                    'data' : {
                        'login' : form_vals["email"],
                        'password' : form_vals['password'],
                        'db_name' : get_active_db()
                    }
                }
                vals_user=get_model("login").login(context=data_login)
                if not vals_user:
                    raise Exception("Invalid login")
                user_id = vals_user['cookies']['user_id']
                if not user_id:
                    raise Exception("Invalid login")
                set_active_user(user_id)
                dbname=get_active_db()
                #token=new_token(dbname,user_id)
                for k,v in vals_user['cookies'].items():
                    if isinstance(v, int):
                        v=str(v)
                    if v:
                        v = reg.pathname2url(v)
                        self.set_cookie(k,v)
                #self.set_cookie("user_id",str(user_id))
                #self.set_cookie("token",token)
                cart_id=self.get_cookie("cart_id")
                if cart_id:
                    cart_id=int(cart_id)
                    get_model("ecom.cart").set_default_address([cart_id])
                db.commit()
                url=self.get_argument("return_url",None)
                if not url:
                    url="/cms_account"
                self.redirect(url)
            except Exception as e:
                db=get_connection()
                error_message=str(e)
                ctx=self.context
                ctx["form_vals"]=form_vals
                ctx["error_message"]=error_message
                ctx["field_errors"]=field_errors
                content=render("cms_login",ctx)
                ctx["content"]=content
                html=render("cms_layout",ctx)
                self.write(html)
                db.commit()
        except:
            import traceback
            traceback.print_exc()
            db.rollback()

Login.register()
