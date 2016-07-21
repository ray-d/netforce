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
from netforce.model import get_model, clear_cache
from netforce import database
from netforce import access
from netforce.locale import set_active_locale
import json
import sys
from datetime import *
import time
import random
from netforce.locale import translate
from netforce.utils import timeout, json_dumps
from netforce.log import rpc_log
import traceback


class JsonRpc(Controller):
    _path = "/json_rpc"

    def post(self):
        req = json.loads(self.request.body.decode())
        # open("/tmp/json_rpc.log","a").write(self.request.body.decode()+"\n###############################################################\n")
        db = database.get_connection()
        if db:
            db.begin()
        try:
            clear_cache()
            method = req["method"]
            params = req["params"]
            if method == "execute":
                model = params[0]
                method = params[1]
                if method.startswith("_"):
                    raise Exception("Invalid method")
                args = params[2]
                if len(params) >= 4:
                    opts = params[3] or {}
                else:
                    opts = {}
                if len(params) >= 5:
                    cookies = params[4] or {}
                else:
                    cookies = {}
                if "locale" in cookies:
                    set_active_locale(cookies["locale"])
                user_id = access.get_active_user()
                rpc_log.info("EXECUTE db=%s model=%s method=%s user=%s" %
                             (database.get_active_db(), model, method, user_id))
                m = get_model(model)
                f = getattr(m, method)
                ctx = {
                    "request_handler": self,
                    "request": self.request,
                }
                ctx.update(self.get_cookies())
                opts.setdefault("context", {}).update(ctx)
                with timeout(seconds=300):  # XXX: can make this faster? (less signal sys handler overhead)
                    t0 = time.time()
                    res = f(*args, **opts)
                    t1 = time.time()
                    dt = (t1 - t0) * 1000
                    rpc_log.info("<<< %d ms" % dt)
                resp = {
                    "result": res,
                    "error": None,
                    "id": req["id"],
                }
            else:
                raise Exception("Invalid method: %s" % method)
            if db:
                db.commit()
        except Exception as e:
            try:
                msg = translate(str(e))
            except:
                print("WARNING: Failed to translate error message")
                msg = str(e)
            rpc_log.error(msg)
            if db:
                db.rollback()
            rpc_log.error(traceback.format_exc())
            err = {
                "message": msg,
            }
            error_fields = getattr(e, "error_fields", None)
            if error_fields:
                err["error_fields"] = error_fields
            resp = {
                "result": None,
                "error": err,
                "id": req["id"],
            }
        access.clear_active_user()
        try:
            data = json_dumps(resp)
            self.add_header("Access-Control-Allow-Origin","*")
            self.write(data)
        except:
            print("JSONRPC ERROR: invalid response")
            from pprint import pprint
            pprint(resp)
            traceback.print_exc()

    def get(self):
        db = database.get_connection()
        if db:
            db.begin()
        try:
            clear_cache()
            print(self)
            method = self.get_argument("method")
            model = self.get_argument("model")
            if method.startswith("_"):
                raise Exception("Invalid method")
            args = self.get_argument("args",None)
            if args:
                args=json.loads(args)
            else:
                args=[]
            opts = self.get_argument("opts",None)
            if opts:
                opts=json.loads(opts)
            else:
                opts={}
            cookies = self.get_argument("cookies",None)
            if cookies:
                cookies = json.loads(cookies)
            else:
                cookies = {}
            if "locale" in cookies:
                set_active_locale(cookies["locale"])
            user_id = access.get_active_user()
            rpc_log.info("EXECUTE db=%s model=%s method=%s user=%s" %
                         (database.get_active_db(), model, method, user_id))
            m = get_model(model)
            f = getattr(m, method)
            ctx = {
                "request_handler": self,
                "request": self.request,
            }
            ctx.update(self.get_cookies())
            opts.setdefault("context", {}).update(ctx)
            with timeout(seconds=300):  # XXX: can make this faster? (less signal sys handler overhead)
                t0 = time.time()
                res = f(*args, **opts)
                t1 = time.time()
                dt = (t1 - t0) * 1000
                rpc_log.info("<<< %d ms" % dt)
            resp = {
                "result": res,
                "error": None,
                "id": self.get_argument("id"),
            }
            if db:
                db.commit()
        except Exception as e:
            try:
                msg = translate(str(e))
            except:
                print("WARNING: Failed to translate error message")
                msg = str(e)
            rpc_log.error(msg)
            if db:
                db.rollback()
            rpc_log.error(traceback.format_exc())
            err = {
                "message": msg,
            }
            error_fields = getattr(e, "error_fields", None)
            if error_fields:
                err["error_fields"] = error_fields
            resp = {
                "result": None,
                "error": err,
                "id": self.get_argument("id",None),
            }
        access.clear_active_user()
        try:
            data = json_dumps(resp)
            self.add_header("Access-Control-Allow-Origin","*")
            self.add_header("Last-Modified",datetime.utcnow())
            self.write(data)
        except:
            print("JSONRPC ERROR: invalid response")
            from pprint import pprint
            pprint(resp)
            traceback.print_exc()

JsonRpc.register()
