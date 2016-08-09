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

from .module import get_loaded_modules, read_module_file
import os.path
import os
import re
from lxml import etree
import locale
from datetime import *
import time
import imp
import py_compile
from io import StringIO
import pkg_resources
import marshal
import types
import shutil
import netforce
import sys
import json
import tempfile
from netforce import config
from netforce import database
from netforce.model import get_model, BrowseRecord
from . import hbs_compiler
from netforce import module
from netforce import utils
from io import BytesIO
import zipfile

##############################################################################
### RUNTIME ##################################################################
##############################################################################

def register_helper(name,func):
    hbs_compiler.register_helper(name,func)

_template_cache={}
_active_theme_id=None

class Template(object):
    pass

def set_active_theme(theme_id):
    global _active_theme_id
    _active_theme_id=theme_id

def templates_to_json(modules=None):
    templates={}
    if modules is None:
        modules=module.get_loaded_modules()
    for m in modules:
        if not pkg_resources.resource_exists(m, "templates"):
            continue
        for fname in pkg_resources.resource_listdir(m, "templates"):
            if not fname.endswith(".hbs") and not fname.endswith(".jsx"):
                continue
            tmpl_name = os.path.splitext(fname)[0]
            tmpl_src = pkg_resources.resource_string(m, "templates/" + fname).decode("utf-8")
            templates[tmpl_name]=tmpl_src
    return templates

def get_module_template_src(name):
    loaded_modules = module.get_loaded_modules()
    for m in loaded_modules:
        if not pkg_resources.resource_exists(m, "templates"):
            continue
        for fname in pkg_resources.resource_listdir(m, "templates"):
            if not fname.endswith("hbs"):
                continue
            tmpl_name = os.path.splitext(fname)[0]
            if tmpl_name!=name:
                continue
            tmpl_src = pkg_resources.resource_string(m, "templates/" + fname).decode("utf-8")
            return tmpl_src
    return None

def get_db_template_src(name):
    db=database.get_connection()
    res=db.get("SELECT template FROM template WHERE name=%s AND theme_id=%s",name,_active_theme_id)
    if not res:
        return None
    return res.template

def get_template(name):
    dbname=database.get_active_db()
    key=(dbname,_active_theme_id,name)
    tmpl=_template_cache.get(key)
    if tmpl:
        return tmpl
    tmpl_src = get_module_template_src(name)
    if tmpl_src is None:
        tmpl_src=get_db_template_src(name)
        if tmpl_src is None:
            raise Exception("Template not found: %s (active_theme_id=%s)" % (name,_active_theme_id))
    try:
        compiler = hbs_compiler.Compiler()
        py_src = compiler.compile(tmpl_src)
        tmpl = Template()
        exec(py_src, tmpl.__dict__)
    except Exception as e:
        print("Template source:")
        print(tmpl_src)
        raise Exception("Failed to compile template: %s" % name)
    _template_cache[key] = tmpl
    return tmpl


def clear_template_cache():
    _template_cache.clear()


def get_template_source(name):
    loaded_modules = get_loaded_modules()
    res = read_module_file("template/" + name + ".hbs")
    if res:
        return res.decode()
    src = get_theme_template(name)
    if src:
        return src
    raise Exception("Template source not found: %s" % name)


def compile_template(tmpl_src, tmpl_name="<string>"):
    # py_src=compile_template_py(tmpl_src,tmpl_name) # deprecated
    compiler = hbs_compiler.Compiler()
    py_src = compiler.compile(tmpl_src)
    tmpl = Template()
    tmpl.source = py_src
    exec(py_src, tmpl.__dict__)
    return tmpl


def compile_template_old(tmpl_src, tmpl_name="<string>"):
    py_src = compile_template_py(tmpl_src, tmpl_name)  # deprecated
    tmpl = Template()
    tmpl.source = py_src
    exec(py_src, tmpl.__dict__)
    return tmpl


def render_template(tmpl_src, context):
    print("compiling template...")
    tmpl = compile_template(tmpl_src)
    print("executing template...")
    return "".join(tmpl.render(context))


def render_template_old(tmpl_src, context):
    print("compiling template (old)...")
    tmpl = compile_template_old(tmpl_src)
    print("executing template (old)...")
    return "".join(tmpl.render(context))

# XXX: works with hbs compiler only
def render(tmpl_name, context, data={}):
    tmpl = get_template(tmpl_name)
    scope = hbs_compiler.Scope(context,context,data=data)
    return "".join(tmpl.render(scope))

_XHTML_ESCAPE_RE = re.compile('[&<>"]')
_XHTML_ESCAPE_DICT = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}


def xhtml_escape(value):
    return _XHTML_ESCAPE_RE.sub(lambda match: _XHTML_ESCAPE_DICT[match.group(0)], value)

##############################################################################


def _if(data, cond, options={}):
    if cond:
        inner = options["inner"]
        data = inner(data)
    else:
        inverse = options.get("inverse")
        if inverse:
            data = inverse(data)
        else:
            data = ""
    return data


def _ifeq(data, val1, val2, options={}):
    if val1 == val2:
        inner = options["inner"]
        data = inner(data)
    else:
        inverse = options.get("inverse")
        if inverse:
            data = inverse(data)
        else:
            data = ""
    return data


def _iflt(data, val1, val2, options={}):
    if val1 < val2:
        inner = options["inner"]
        data = inner(data)
    else:
        inverse = options.get("inverse")
        if inverse:
            data = inverse(data)
        else:
            data = ""
    return data


def _ifgt(data, val1, val2, options={}):
    if val1 > val2:
        inner = options["inner"]
        data = inner(data)
    else:
        inverse = options.get("inverse")
        if inverse:
            data = inverse(data)
        else:
            data = ""
    return data


def _unless(data, cond, options={}):
    if not cond:
        inner = options["inner"]
        data = inner(data)
    else:
        inverse = options.get("inverse")
        if inverse:
            data = inverse(data)
        else:
            data = ""
    return data


def _include(data, name, options={}):
    tmpl = get_template(name)
    html = tmpl.render(options)
    return html


def _json(data, val):
    if val is None or val == "":
        return ""
    return json.dumps(val)


def _set(data, obj, attr, val):
    obj[attr] = val
    return ""


def _with(data, item, options={}):
    data = item.copy()
    data["context"] = options["hash"]["context"]
    return options["inner"](ctx)


def _each(data, items, options={}):
    html = ""
    for item in items:
        data = item.copy()
        data["context"] = options["hash"].get("context", {})
        html += options["inner"](data)
    return html


def _currency(data, val, options={}):
    h = options.get("hash", {})
    if val is None:
        return ""
    try:
        val = float(val)  # in case string
        if h.get("zero") is not None and abs(val) < 0.0001:
            return h["zero"]
        val = "{:0,.2f}".format(val)
        if h.get("nogroup"):
            val = val.replace(",", "")
        return val
    except:
        return val


def remove_zeros(s):
    z = 0
    while s[-1 - z] == "0":
        z += 1
    if s[-1 - z] == ".":
        z += 1
    if z:
        s = s[:-z]
    return s


def _fmt_date(data, val, options={}):
    return val


def _fmt_qty(data, val, options={}):
    if val is None:
        return ""
    try:
        val = float(val)  # in case string
        return remove_zeros("%.6f" % val)
    except:
        return "ERR"


def _fmt_date(data, val, options={}):
    if val is None:
        return ""
    return val


def _filename(data, val, options={}):
    if val is None:
        return ""
    try:
        name, ext = os.path.splitext(val)
        name2 = name.rsplit(",")[0]
        return name2 + ext
    except:
        return val


def _file_path(data, val, options={}):
    if val is None:
        return ""
    try:
        dbname = database.get_active_db()
        return "/static/db/" + dbname + "/files/" + val
    except:
        return val


def _minus(data, val, options={}):
    if val is None:
        return ""
    return str(-val)


def _first(data, items, options={}):
    if not items:
        return ""
    item = items[0]
    data = item.copy()
    data["context"] = options["hash"].get("context", {})
    return options["inner"](data)


def _after_first(data, items, options={}):
    html = ""
    for item in items[1:]:
        data = item.copy()
        data["context"] = options["hash"].get("context", {})
        html += options["inner"](data)
    return html


def _padding(data, val, options={}):
    if not val:
        return ""
    return "-" + " " * int(val / 10)  # XXX


def _each_group(data, items, group_field, options={}):  # XXX: check this
    ctx = options["hash"].get("context", {})
    sum_fields = options.get("sum", "").split(",")
    groups = {}
    group_list = []
    for item in items:
        v = item.get(group_field)
        group = groups.get(v)
        if not group:
            group = {}
            group[group_field] = v
            group["group_items"] = []
            group["context"] = ctx
            group["sum"] = {}
            for f in sum_fields:
                group["sum"][f] = 0
            groups[v] = group
            group_list.append(v)
        group["group_items"].append(item)
        for f in sum_fields:
            v = item.get(f)
            if v:
                group["sum"][f] += v
    if group_list:
        html = ""
        for v in group_list:
            group = groups[v]
            data = group.copy()
            data["context"] = ctx
            html += options["inner"](data)
    else:
        inverse = options.get("inverse")
        if inverse:
            html = inverse(data)
        else:
            html = ""
    return html


def _content(data, name, options={}):
    ctx = data["context"]  # XXX
    page_id = ctx["page_id"]
    if name == "menu":
        html = '<ul class="wsite-menu-default">'
        for page in get_model("cms.page").search_browse([["parent_id", "=", None]]):
            if page.id == page_id:
                html += '<li id="active">'
            else:
                html += '<li>'
            html += '<a href="%s">%s</a>' % ("/action?name=page&active_id=%s" % page.id, page.name)
            html += '</li>'
        html += '</ul>'
        return html
    elif name == "social":
        return ""
    elif name == "search":
        return ""
    if name == "content":
        default_type = "html"
        default_glob = False
    else:
        default_type = "text"
        default_glob = True
    type = options["hash"].get("type", default_type)
    glob = options["hash"].get("global", default_glob)
    defaults = {"name": name}
    if glob:
        ids = get_model("cms.content").search([["name", "=", name], ["page_id", "=", None]])
    else:
        ids = get_model("cms.content").search([["name", "=", name], ["page_id", "=", page_id]])
        defaults["page_id"] = page_id
    if type == "text":
        defaults["type"] = "text"
        if ids:
            cont = get_model("cms.content").browse(ids)[0]
            return '<span class="inline-edit wsite-text" data-model="cms.content" data-id="%s" data-field="data_text">%s</span>' % (cont.id, cont.data_text)
        else:
            return """<span class="inline-edit wsite-text" data-model="cms.content" data-field="data_text" data-defaults='%s'>Add text</span>""" % json.dumps(defaults)
    elif type == "html":
        defaults["type"] = "html"
        if ids:
            cont = get_model("cms.content").browse(ids)[0]
            return '<div class="inline-edit" data-model="cms.content" data-id="%s" data-field="data_html" data-editor="true">%s</span>' % (cont.id, cont.data_html)
        else:
            return """<div class="inline-edit" data-model="cms.content" data-field="data_html" data-defaults='%s' data-editor="true">Click here to edit.</div>""" % json.dumps(defaults)
    elif type == "button":
        defaults["type"] = "button"
        if ids:
            cont = get_model("cms.content").browse(ids)[0]
            return '<a class="btn btn-large btn-primary inline-edit" data-model="cms.content" data-id="%s" data-field="data_button">%s</a>' % (cont.id, cont.data_button)
        else:
            return """<a class="btn btn-large btn-primary inline-edit" data-model="cms.content" data-field="data_button" data-defaults='%s'>Button</a>""" % json.dumps(defaults)
    else:
        return "ERROR"

_acc_bal_cache = {}


def get_all_balances(date_from=None, date_to=None, track1=None, track2=None, contact=None):
    t = time.time()
    k = (date_from, date_to, track1, track2, contact)
    if k in _acc_bal_cache:
        res, res_t = _acc_bal_cache[k]
        if t - res_t <= 10:
            print("cache hit", k)
            return res
    print("cache miss", k)
    error = False
    if track1:
        res = get_model("account.track.categ").search([["code", "=ilike", track1]])
        if not res:
            error = True
        else:
            track_id = res[0]
    else:
        track_id = None
    if track2:
        res = get_model("account.track.categ").search([["code", "=ilike", track2]])
        if not res:
            error = True
        else:
            track2_id = res[0]
    else:
        track2_id = None
    if contact:
        res = get_model("partner").search([["code", "=ilike", contact]])
        if not res:
            error = True
        else:
            contact_id = res[0]
    else:
        contact_id = None
    if not error:
        ctx = {
            "date_from": date_from,
            "date_to": date_to,
            "track_id": track_id,
            "track2_id": track2_id,
            "partner_id": contact_id,
        }
        res = get_model("account.account").search_read([["type", "!=", "view"]], ["code", "balance"], context=ctx)
    else:
        res = []
    _acc_bal_cache[k] = (res, t)
    return res


def _acc_balance(this, options={}):
    h = options.get("hash", {})
    acc_from = h.get("acc_from")
    acc_to = h.get("acc_to")
    date_from = h.get("date_from")
    date_to = h.get("date_to")
    track1 = h.get("track1")
    track2 = h.get("track2")
    contact = h.get("contact")
    negate = h.get("negate")
    print("_acc_balance", acc_from, acc_to, date_from, date_to, track1, track2, contact)
    res = get_all_balances(date_from=date_from, date_to=date_to, track1=track1, track2=track2, contact=contact)
    bal = 0
    for r in res:
        if r["code"] >= acc_from and r["code"] <= acc_to:
            bal += r["balance"]
    if negate:
        return "%.2f" % -bal
    return "%.2f" % bal

_helpers = {
    "if": _if,
    "ifeq": _ifeq,
    "iflt": _iflt,
    "ifgt": _ifgt,
    "unless": _unless,
    "include": _include,
    "json": _json,
    "set": _set,
    "with": _with,
    "each": _each,
    "currency": _currency,
    "fmt_qty": _fmt_qty,
    "fmt_date": _fmt_date,
    "first": _first,
    "after_first": _after_first,
    "padding": _padding,
    "each_group": _each_group,
    "content": _content,
    "filename": _filename,
    "minus": _minus,
    "file_path": _file_path,
    "acc_balance": _acc_balance,  # XXX: remove from there!!!
}


def _get_helper(name):
    f = _helpers.get(name)
    if not f:
        raise Exception("Invalid helper: %s" % name)
    return f


def _expr(e, data):
    try:
        if (e[0] == "\"" and e[-1] == "\"") or (e[0] == "'" and e[-1] == "'"):
            return e[1:-1]
        if e.isdigit():
            return float(e)
        i = e.rfind(".")
        if i != -1:
            parent = e[:i]
            attr = e[i + 1:]
            pval = _expr(parent, data)
            if not pval:
                return ""
            if attr == "":
                val = pval
            elif attr.isdigit():
                n = int(attr)
                if isinstance(pval, (list, tuple)) and n < len(pval):
                    val = pval[n]
                else:
                    val = None
            else:
                if isinstance(pval, dict):
                    val = pval.get(attr)
                elif isinstance(pval, BrowseRecord):  # XXX
                    val = getattr(pval, attr, None)
                else:
                    val = None
        else:
            val = data.get(e)
        if val is None:
            return ""
        return val
    except:
        print("WARNING: error evaluating template expression '%s'" % e)
        return ""

xml_attrs_re = re.compile(r"^(\s*(\w+)\s*=\s*((\"[^\"]*\")|('[^']*')))+\s*$")
xml_attr_re = re.compile(r"(\w+)\s*=\s*([\"'])(.*?)\2")


def _parse_attrs(s):
    attrs = {}
    for m in xml_attr_re.finditer(s):
        name, val = m.group(1, 3)
        attrs[name] = val
    return attrs

##############################################################################
### COMPILE-TIME #############################################################
##############################################################################


def compile_templates(module):
    tmpl_dir = os.path.join(module, "templates")
    if not os.path.exists(tmpl_dir):
        return
    tmplc_dir = os.path.join(module, "templates_c")
    if os.path.exists(tmplc_dir):
        shutil.rmtree(tmplc_dir)
    os.mkdir(tmplc_dir)
    open(os.path.join(tmplc_dir, "__init__.py"), "w").write("")
    for fname in os.listdir(tmpl_dir):
        name, ext = os.path.splitext(fname)
        if ext != ".hbs":
            continue
        path = os.path.join(tmpl_dir, fname)
        tmpl_src = open(path).read()
        try:
            compiler = hbs_compiler.Compiler()
            py_src = compiler.compile(tmpl_src)
        except Exception as e:
            print("WARNING: failed to compile template %s:" % name, e)
            continue
        py_path = os.path.join(tmplc_dir, name + ".py")
        open(py_path, "w").write(py_src)
        py_compile.compile(py_path)


def compile_template_py(tmpl_src, name="<string>"):
    reader = _Reader(tmpl_src)
    tmpl = _File(name, _parse(reader))
    buf = StringIO()
    writer = _CodeWriter(buf, name)
    tmpl.generate(writer)
    py_src = buf.getvalue()
    return py_src


def compile_templates_js(module):
    print("compiling templates to js...")
    tmpl_dir = os.path.join(module, "templates")
    if not os.path.exists(tmpl_dir):
        return
    tmplc_dir = os.path.join(module, "templates_js")
    if not os.path.exists(tmplc_dir):
        os.mkdir(tmplc_dir)
    for fname in os.listdir(tmpl_dir):
        name, ext = os.path.splitext(fname)
        if ext != ".hbs":
            continue
        path = os.path.join(tmpl_dir, fname)
        js_path = os.path.join(tmplc_dir, name + ".js")
        if os.path.exists(js_path) and os.path.getmtime(js_path) >= os.path.getmtime(path):
            continue
        print("compiling template %s..." % fname)
        tmpl_src = open(path).read()
        open("/tmp/template.hbs", "wb").write(tmpl_src.encode())
        js_src = os.popen("handlebars -e hbs -s /tmp/template.hbs").read()
        if not js_src:
            print("ERROR: Failed to compile template %s" % fname)
            continue
        src = "(function() {\nvar fn="
        src += js_src
        src + ";\n"
        src += "if (window.nf_templates) {nf_templates[\"%s\"]=Handlebars.template(fn);}\n})();\n" % name
        open(js_path, "w").write(src)
    for fname in os.listdir(tmplc_dir):
        name, ext = os.path.splitext(fname)
        js_path = os.path.join(tmplc_dir, fname)
        path = os.path.join(tmpl_dir, name + ".hbs")
        if not os.path.exists(path) or os.path.getmtime(path) > os.path.getmtime(js_path):
            print("deleting " + fname)
            os.unlink(js_path)

##############################################################################


def _get_template_src(full_name):
    module, name = full_name.split(".")
    module = "netforce_" + module
    f = "templates/" + name + ".xml"
    if not pkg_resources.resource_exists(module, f):
        raise Exception("Template not found: %s" % full_name)
    tmpl_src = pkg_resources.resource_string(module, f).decode()
    return tmpl_src


class _Node(object):

    def generate(self, writer):
        raise NotImplementedError()


class _ChunkList(object):

    def __init__(self, chunks):
        self.chunks = chunks

    def generate(self, writer):
        for chunk in self.chunks:
            chunk.generate(writer)


class _File(_Node):

    def __init__(self, template_name, body):
        self.template_name = template_name
        self.body = body
        self.line = 0

    def generate(self, writer):
        writer.write_line("from netforce.template import _expr,_get_helper,xhtml_escape,_parse_attrs", self.line)
        writer.write_line("", self.line)
        writer.write_line("def render(data):", self.line)
        with writer.indent():
            writer.write_line("buf=[]", self.line)
            writer.write_line("_append=buf.append", self.line)
            self.body.generate(writer)
            writer.write_line("return ''.join(buf)", self.line)


class _Text(_Node):

    def __init__(self, value, line):
        self.value = value
        self.line = line

    def generate(self, writer):
        value = self.value
        value = re.sub(r"([\t ]+)", " ", value)
        value = re.sub(r"(\s*\n\s*)", "\n", value)
        if value:
            writer.write_line("_append(%r)" % value, self.line)


class _Expression(_Node):

    def __init__(self, expr, line, raw=False):
        self.expr = expr
        self.line = line
        self.raw = raw

    def generate(self, writer):
        if self.raw:
            writer.write_line("_append(str(_expr(%r,data)))" % self.expr, self.line)
        else:
            writer.write_line("_append(xhtml_escape(str(_expr(%r,data))))" % self.expr, self.line)


def _convert_expr(expr):
    if expr[0] in ("'", '"') or expr.isdigit():
        return "%s" % expr
    else:
        return "_expr(%r,data)" % expr

mus_args_re = re.compile(r"(\w+(\.\w+)*|'[^']*'|\"[^\"]*\")")
mus_kwargs_re = re.compile(r"(\w+)=(\w+(\.\w+)*|'.*?'|\".*?\")")


class _Helper(_Node):

    def __init__(self, name, line, args=None, kwargs=None, body=None, inv_body=None):
        self.name = name
        self.line = line
        self.args = args
        self.kwargs = kwargs
        self.body = body
        self.inv_body = inv_body

    def generate(self, writer):
        writer.write_line("helper=_get_helper(%r)" % self.name, self.line)
        writer.write_line("args=[]", self.line)
        if self.args:
            for m in mus_args_re.finditer(self.args):
                expr = m.group(0)
                writer.write_line("args.append(%s)" % _convert_expr(expr), self.line)
        writer.write_line("options={}", self.line)
        writer.write_line("options['hash']=kw={}", self.line)
        if self.kwargs:
            for m in mus_kwargs_re.finditer(self.kwargs):
                name = m.group(1)
                expr = m.group(2)
                writer.write_line("kw['%s']=%s" % (name, _convert_expr(expr)), self.line)
        if self.body:
            func = "_render_block%d" % writer.block_counter
            writer.block_counter += 1
            writer.write_line("def %s(data):" % func, self.line)
            with writer.indent():
                writer.write_line("buf=[]", self.line)
                writer.write_line("_append=buf.append", self.line)
                self.body.generate(writer)
                writer.write_line("return ''.join(buf)", self.line)
            writer.write_line("options['inner']=%s" % func, self.line)
        if self.inv_body:
            func = "_render_block%d" % writer.block_counter
            writer.block_counter += 1
            writer.write_line("def %s(data):" % func, self.line)
            with writer.indent():
                writer.write_line("buf=[]", self.line)
                writer.write_line("_append=buf.append", self.line)
                self.inv_body.generate(writer)
                writer.write_line("return ''.join(buf)", self.line)
            writer.write_line("options['inverse']=%s" % func, self.line)
        writer.write_line("_append(helper(data,*args,options=options))", self.line)


class _CodeWriter():

    def __init__(self, file, template_name):
        self.file = file
        self.template_name = template_name
        self._indent = 0
        self.block_counter = 0

    def indent(self):
        class Indenter(object):

            def __enter__(_):
                self._indent += 1
                return self

            def __exit__(_, *args):
                self._indent -= 1
        return Indenter()

    def write_line(self, line, line_no, indent=None):
        if indent == None:
            indent = self._indent
        line_comment = "  # %s:%d" % (self.template_name, line_no)
        print("    " * indent + line + line_comment, file=self.file)


class _Reader(object):

    def __init__(self, text):
        self.text = text
        self.line = 1
        self.pos = 0

    def find(self, needle, start=0, end=None):
        pos = self.pos
        start += pos
        if end is None:
            i = self.text.find(needle, start)
        else:
            end += pos
            i = self.text.find(needle, start, end)
        if i != -1:
            i -= pos
        return i

    def consume(self, count=None):
        if count is None:
            count = len(self.text) - self.pos
        newpos = self.pos + count
        self.line += self.text.count("\n", self.pos, newpos)
        s = self.text[self.pos:newpos]
        self.pos = newpos
        return s

    def remaining(self):
        return len(self.text) - self.pos

    def __len__(self):
        return self.remaining()

    def __getitem__(self, key):
        if type(key) is slice:
            size = len(self)
            start, stop, step = key.indices(size)
            if start is None:
                start = self.pos
            else:
                start += self.pos
            if stop is not None:
                stop += self.pos
            return self.text[slice(start, stop, step)]
        elif key < 0:
            return self.text[key]
        else:
            return self.text[self.pos + key]

    def __str__(self):
        return self.text[self.pos:]

mus_expr_re = re.compile(r"(\w+(\.\w*)*|'[^']*'|\"[^\"]*\")$")
mus_helper_re = re.compile(
    r"(\w+)((\s+(\w+(\.\w+)*|'[^']*'|\"[^\"]*\")(?!=))*)((\s+\w+=(\w+(\.\w+)*|'.*?'|\".*?\"))*)$")


def _parse(reader, in_block=None, in_view=None):
    body = _ChunkList([])
    while True:
        start = reader.find("{{")
        if start == -1:
            if in_block:
                raise Exception("Missing {{/%s}}" % in_block)
            line = reader.line
            cons = reader.consume()
            body.chunks.append(_Text(cons, line))
            return body
        line = reader.line
        cons = reader.consume(start)
        body.chunks.append(_Text(cons, line))
        line = reader.line
        reader.consume(2)
        c = reader[0]
        if c.isalpha() or c == "_" or c == " ":  # expression
            end = reader.find("}}")
            if end == -1:
                raise Exception("Missing }} on line %d" % reader.line)
            expr = reader.consume(end).strip()
            reader.consume(2)
            if expr == "else":
                if not in_block:
                    raise Exception("Extra {{else}} on line %d" % (reader.line))
                return (body, _parse(reader, in_block=in_block))
            m = mus_expr_re.match(expr)
            if m:
                body.chunks.append(_Expression(expr, line))
            else:
                m = mus_helper_re.match(expr)
                if m:
                    helper = m.group(1)
                    args = m.group(2)
                    kwargs = m.group(6)
                    body.chunks.append(_Helper(helper, line, args=args, kwargs=kwargs))
                else:
                    raise Exception("Invalid expression '%s' on line %s" % (expr, reader.line))
        elif c == "{":  # raw expression
            reader.consume(1)
            end = reader.find("}}}")
            if end == -1:
                raise Exception("Missing }}} on line %d" % reader.line)
            expr = reader.consume(end).strip()
            reader.consume(3)
            body.chunks.append(_Expression(expr, line, raw=True))
        elif c == "#":  # start block
            reader.consume(1)
            end = reader.find("}}")
            if end == -1:
                raise Exception("Missing }} on line %d" % reader.line)
            expr = reader.consume(end).strip()
            reader.consume(2)
            m = mus_helper_re.match(expr)
            if not m:
                raise Exception("Invalid block '%s' on line %d" % (expr, reader.line))
            block = m.group(1)
            args = m.group(2)
            kwargs = m.group(6)
            res = _parse(reader, in_block=block)
            if isinstance(res, tuple):
                block_body, inv_body = res
            else:
                block_body = res
                inv_body = None
            body.chunks.append(_Helper(block, line, args=args, kwargs=kwargs, body=block_body, inv_body=inv_body))
        elif c == "/":  # end block
            reader.consume(1)
            end = reader.find("}}")
            if end == -1:
                raise Exception("Missing }} on line %d" % reader.line)
            block = reader.consume(end).strip()
            reader.consume(2)
            if not in_block or block != in_block:
                raise Exception("Extra {{/%s}} on line %d" % (block, reader.line))
            return body
        else:
            raise Exception("Invalid expression on line %d" % reader.line)
