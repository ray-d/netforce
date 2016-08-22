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
from netforce import config
from netforce.model import get_model
from netforce import database
from netforce.logger import audit_log
from netforce.access import set_active_user
import urllib
import time
from urllib.parse import quote
from netforce.utils import new_token

class LoginToken(Controller):
    _path="/login_token"

    def get(self):
        self.get_argument("token") # TODO: check token and move to private module
        dbname=database.get_active_db()
        db=database.get_connection()
        try:
            db.begin()
            set_active_user(None)
            user_id=1
            user=get_model("base.user").browse(user_id)
            t=time.strftime("%Y-%m-%d %H:%M:%S")
            user.write({"lastlog":t})
            comp=get_model("company").browse(1)
            set_active_user(user_id)
            audit_log("Login token")
            url="http://nf1.netforce.com/update_lastlogin?dbname=%s"%dbname
            req=urllib.request.Request(url)
            try:
                urllib.request.urlopen(req).read()
            except:
                print("ERROR: failed to update last login time")
            token=new_token(dbname,user_id)
            self.set_cookie("dbname",dbname)
            self.set_cookie("user_id",str(user_id))
            self.set_cookie("token",token)
            self.set_cookie("user_name",quote(user.name)) # XXX: space
            self.set_cookie("company_name",quote(comp.name))
            self.set_cookie("package",comp.package)
            self.redirect("http://%s.my.netforce.com/action#name=contact_board"%dbname.replace("_","-"))
            db.commit()
        except:
            db.rollback()

LoginToken.register()
