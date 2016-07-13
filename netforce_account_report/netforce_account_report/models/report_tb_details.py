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
from datetime import *
from dateutil.relativedelta import *
from pprint import pprint
from netforce.access import get_active_company
from netforce.database import get_connection


def get_totals(date_from=None, date_to=None, excl_date_to=False, track_id=None, track2_id=None, contact_id=None, acc_type=None, account_id=None ,hide_contact=None, hide_zero=None):
    pl_types = ("revenue", "other_income", "cost_sales", "expense", "other_expense")
    db = get_connection()
    q = "SELECT l.account_id,l.contact_id,l.track_id,l.track2_id,SUM(l.debit) AS total_debit,SUM(l.credit) AS total_credit FROM account_move_line l JOIN account_move m ON m.id=l.move_id JOIN account_account a ON a.id=l.account_id WHERE m.state='posted'"
    args = []
    if date_from:
        q += " AND m.date>=%s"
        args.append(date_from)
    if date_to:
        if excl_date_to:
            q += " AND m.date<%s"
        else:
            q += " AND m.date<=%s"
        args.append(date_to)
    if track_id:
        q += " AND l.track_id=%s"
        args.append(track_id)
    if track2_id:
        q += " AND l.track2_id=%s"
        args.append(track2_id)
    if contact_id:
        q += " AND l.contact_id=%s"
        args.append(contact_id)
    if account_id:
        q += " AND l.account_id=%s"
        args.append(account_id)
    if acc_type == "pl":
        q += " AND a.type IN %s"
        args.append(pl_types)
    elif acc_type == "bs":
        q += " AND a.type NOT IN %s"
        args.append(pl_types)
    q += " GROUP BY l.account_id,l.contact_id,l.track_id,l.track2_id"
    res = db.query(q, *args)
    totals = []
    for r in res:
        totals.append({
            "account_id": r.account_id,
            "contact_id": r.contact_id,
            "track_id": r.track_id,
            "track2_id": r.track2_id,
            "debit": r.total_debit,
            "credit": r.total_credit,
        })
    return totals

class ReportTBDetails(Model):
    _name = "report.tb.details"
    _transient = True
    _fields = {
        "date": fields.Date("Date", required=True),
        "track_id": fields.Many2One("account.track.categ", "Tracking"),
        "track2_id": fields.Many2One("account.track.categ", "Tracking-2"),
        "contact_id": fields.Many2One("contact", "Contact"),
        "account_id": fields.Many2One("account.account", "Account"),
        "hide_contact": fields.Boolean("Hide Contact"),
        "hide_zero": fields.Boolean("Hide Zero Lines"),
        "hide_zero_ytd": fields.Boolean("Hide Zero Lines YTD"),
        "show_net": fields.Boolean("Show Net"),
    }

    _defaults = {
        "date": lambda *a: date.today().strftime("%Y-%m-%d"),
    }

    def get_report_data(self, ids, context={}):
        company_id = get_active_company()
        is_show_contact=True
        comp = get_model("company").browse(company_id)
        if ids:
            params = self.read(ids, load_m2o=False)[0]
        else:
            params = self.default_get(load_m2o=False, context=context)
        settings = get_model("settings").browse(1)
        date_to = params.get("date")
        if not date_to:
            date_to = date.today().strftime("%Y-%m-%d")
        track_id = params.get("track_id")
        track2_id = params.get("track2_id")
        contact_id = params.get("contact_id")
        account_id = params.get("account_id")
        hide_contact = params.get("hide_contact")
        hide_zero = params.get("hide_zero")
        hide_zero_ytd = params.get("hide_zero_ytd")
        show_net = params.get("show_net")
        month_date_from = datetime.strptime(date_to, "%Y-%m-%d").strftime("%Y-%m-01")
        month_begin_date_to = (
            datetime.strptime(date_to, "%Y-%m-%d") + relativedelta(day=1) - timedelta(days=1)).strftime("%Y-%m-%d")
        year_date_from = get_model("settings").get_fiscal_year_start(date_to)
        totals_begin_bs = get_totals(date_from=None, date_to=month_begin_date_to,
                                     track_id=track_id, track2_id=track2_id, contact_id=contact_id, acc_type="bs",
                                     account_id=account_id, hide_contact=hide_contact, hide_zero=hide_zero)
        totals_begin_pl = get_totals(date_from=year_date_from, date_to=month_begin_date_to,
                                     track_id=track_id, track2_id=track2_id, contact_id=contact_id, acc_type="pl",
                                     account_id=account_id, hide_contact=hide_contact, hide_zero=hide_zero)
        totals_period = get_totals(
            date_from=month_date_from, date_to=date_to, track_id=track_id, track2_id=track2_id, contact_id=contact_id,
            account_id=account_id, hide_contact=hide_contact, hide_zero=hide_zero)
        totals_ytd_bs = get_totals(
            date_from=None, date_to=date_to, track_id=track_id, track2_id=track2_id, contact_id=contact_id, acc_type="bs",
            account_id=account_id, hide_contact=hide_contact, hide_zero=hide_zero)
        totals_ytd_pl = get_totals(
            date_from=year_date_from, date_to=date_to, track_id=track_id, track2_id=track2_id, contact_id=contact_id, acc_type="pl",
            account_id=account_id, hide_contact=hide_contact, hide_zero=hide_zero)
        totals_pl_prev = get_totals(date_from=None, date_to=year_date_from, excl_date_to=True,
                                    track_id=track_id, track2_id=track2_id, contact_id=contact_id, acc_type="pl",
                                    account_id=account_id, hide_contact=hide_contact, hide_zero=hide_zero)
        totals = {}
        for tot in totals_begin_bs:
            k = (tot["account_id"], tot["contact_id"], tot["track_id"], tot["track2_id"])
            vals = totals.setdefault(k, {})
            amt = tot["debit"] - tot["credit"]
            vals["begin_debit"] = amt > 0 and amt or 0
            vals["begin_credit"] = amt < 0 and -amt or 0
        for tot in totals_begin_pl:
            k = (tot["account_id"], tot["contact_id"], tot["track_id"], tot["track2_id"])
            vals = totals.setdefault(k, {})
            amt = tot["debit"] - tot["credit"]
            vals["begin_debit"] = amt > 0 and amt or 0
            vals["begin_credit"] = amt < 0 and -amt or 0
        for tot in totals_period:
            k = (tot["account_id"], tot["contact_id"], tot["track_id"], tot["track2_id"])
            vals = totals.setdefault(k, {})
            amt = tot["debit"] - tot["credit"]
            vals["period_debit"] = amt > 0 and amt or 0
            vals["period_credit"] = amt < 0 and -amt or 0
        for tot in totals_ytd_bs:
            k = (tot["account_id"], tot["contact_id"], tot["track_id"], tot["track2_id"])
            vals = totals.setdefault(k, {})
            amt = tot["debit"] - tot["credit"]
            vals["ytd_debit"] = amt > 0 and amt or 0
            vals["ytd_credit"] = amt < 0 and -amt or 0
        for tot in totals_ytd_pl:
            k = (tot["account_id"], tot["contact_id"], tot["track_id"], tot["track2_id"])
            vals = totals.setdefault(k, {})
            amt = tot["debit"] - tot["credit"]
            vals["ytd_debit"] = amt > 0 and amt or 0
            vals["ytd_credit"] = amt < 0 and -amt or 0
        settings = get_model("settings").browse(1)
        ret_acc_id = settings.retained_earnings_account_id.id
        #if ret_acc_id:
        if not params.get("account_id") and not params.get("contact_id") and not params.get("track_id") and not params.get("track2_id") and ret_acc_id: ##
            ret_amt = 0
            for tot in totals_pl_prev:
                ret_amt += tot["debit"] - tot["credit"]
            k = (ret_acc_id, None, None, None)
            vals = totals.setdefault(k, {})
            amt = vals.get("begin_debit", 0) - vals.get("begin_credit", 0)
            amt += ret_amt
            vals["begin_debit"] = amt > 0 and amt or 0
            vals["begin_credit"] = amt < 0 and -amt or 0
            amt = vals.get("ytd_debit", 0) - vals.get("ytd_credit", 0)
            amt += ret_amt
            vals["ytd_debit"] = amt > 0 and amt or 0
            vals["ytd_credit"] = amt < 0 and -amt or 0
            vals["no_link"] = True
        lines = []
        for (account_id, contact_id, track_id, track2_id), vals in totals.items():
            ## check zero line
            if hide_zero and vals.get("begin_debit", 0) == 0 and vals.get("begin_credit", 0) == 0 and vals.get("period_debit", 0) == 0 and vals.get("period_credit", 0) == 0 and vals.get("ytd_debit", 0) == 0 and vals.get("ytd_credit", 0) == 0:
                continue
            if hide_zero_ytd and vals.get("ytd_debit", 0) == 0 and vals.get("ytd_credit", 0) == 0:
                continue
            lines.append({
                "account_id": account_id,
                "contact_id": contact_id,
                "track_id": track_id,
                "track2_id": track2_id,
                "begin_debit": vals.get("begin_debit", 0),
                "begin_credit": vals.get("begin_credit", 0),
                "period_debit": vals.get("period_debit", 0),
                "period_credit": vals.get("period_credit", 0),
                "ytd_debit": vals.get("ytd_debit", 0),
                "ytd_credit": vals.get("ytd_credit", 0),
                "no_link": vals.get("no_link"),
            })
        account_ids = list(set([l["account_id"] for l in lines]))
        contact_ids = list(set([l["contact_id"] for l in lines if l["contact_id"]]))
        track_ids = list(set([l["track_id"] for l in lines if l["track_id"]] + [l["track2_id"]
                                                                                for l in lines if l["track2_id"]]))
        accounts = {}
        for acc in get_model("account.account").browse(account_ids):
            accounts[acc.id] = acc
        contacts = {}
        for contact in get_model("contact").browse(contact_ids):
            contacts[contact.id] = contact
        tracks = {}
        for track in get_model("account.track.categ").browse(track_ids):
            tracks[track.id] = track
        for line in lines:
            account = accounts[line["account_id"]]
            contact = contacts[line["contact_id"]] if line["contact_id"] else None
            track = tracks[line["track_id"]] if line["track_id"] else None
            track2 = tracks[line["track2_id"]] if line["track2_id"] else None
            line["account_code"] = account.code
            line["account_name"] = account.name
            line["contact_name"] = contact.name if contact else None
            line["track_code"] = track.code if track else None
            line["track2_code"] = track2.code if track2 else None
        ## group line contact
        if hide_contact:
            group={}
            lines_con=[]
            for line_con in lines:
                key=(line_con["account_id"],line_con["track_id"])
                if not group.get(key):
                    group[key]=[]
                group[key].append({
                      'account_code': line_con["account_code"],
                      'account_id': line_con["account_id"],
                      'account_name': line_con["account_name"],
                      'begin_credit': line_con["begin_credit"],
                      'begin_debit': line_con["begin_debit"],
                      'contact_id': line_con["contact_id"],
                      'contact_name': line_con["contact_name"],
                      'no_link': line_con["no_link"],
                      'period_credit': line_con["period_credit"],
                      'period_debit': line_con["period_debit"],
                      'track2_code': line_con["track2_code"],
                      'track2_id': line_con["track2_id"],
                      'track_code': line_con["track_code"],
                      'track_id': line_con["track_id"],
                      'ytd_credit': line_con["ytd_credit"],
                      'ytd_debit': line_con["ytd_debit"],
                })
            for key,vals in group.items():
                begin_credit=0
                begin_debit=0
                period_credit=0
                period_debit=0
                ytd_credit=0
                ytd_debit=0
                for qty in vals:
                    begin_credit+=qty["begin_credit"]
                    begin_debit+=qty["begin_debit"]
                    period_credit+=qty["period_credit"]
                    period_debit+=qty["period_debit"]
                    ytd_credit+=qty["ytd_credit"]
                    ytd_debit+=qty["ytd_debit"]
                if show_net:
                    sum_begin = abs(begin_credit - begin_debit)
                    sum_period = abs(period_credit - period_debit)
                    sum_ytd = abs(ytd_credit - ytd_debit)
                    begin_credit = sum_begin if begin_credit > begin_debit else 0
                    begin_debit = sum_begin if begin_credit < begin_debit else 0
                    period_credit= sum_period if period_credit > period_debit else 0
                    period_debit= sum_period if period_credit < period_debit else 0
                    ytd_credit= sum_ytd if ytd_credit > ytd_debit else 0
                    ytd_debit= sum_ytd if ytd_credit < ytd_debit else 0
                    if hide_zero and begin_credit == 0 and begin_debit == 0 and period_credit == 0 and period_debit == 0 and ytd_credit == 0 and ytd_debit == 0:
                        continue
                    if hide_zero_ytd and ytd_credit == 0 and ytd_debit == 0:
                        continue
                line_vals={
                      'account_code': vals[0]["account_code"],
                      'account_id': vals[0]["account_id"],
                      'account_name': vals[0]["account_name"],
                      'begin_credit': begin_credit,
                      'begin_debit': begin_debit,
                      'contact_id': None,
                      'contact_name': None,
                      'no_link': vals[0]["no_link"],
                      'period_credit': period_credit,
                      'period_debit': period_debit,
                      'track2_code': vals[0]["track2_code"],
                      'track2_id': vals[0]["track2_id"],
                      'track_code': vals[0]["track_code"],
                      'track_id': vals[0]["track_id"],
                      'ytd_credit': ytd_credit,
                      'ytd_debit': ytd_debit,
                }
                lines_con.append(line_vals)
            lines=lines_con
            is_show_contact = False
        lines.sort(
            key=lambda l: (l["account_code"], l["contact_name"] or "", l["track_code"] or "", l["track2_code"] or ""))
        totals = {
            "begin_debit": sum(l["begin_debit"] for l in lines),
            "begin_credit": sum(l["begin_credit"] for l in lines),
            "period_debit": sum(l["period_debit"] for l in lines),
            "period_credit": sum(l["period_credit"] for l in lines),
            "ytd_debit": sum(l["ytd_debit"] for l in lines),
            "ytd_credit": sum(l["ytd_credit"] for l in lines),
        }
        data = {
            "company_name": comp.name,
            "date": date_to,
            "month_date_from": month_date_from,
            "month_begin_date_to": month_begin_date_to,
            "lines": lines,
            "totals": totals,
            "show_contact" : is_show_contact,
        }
        return data

    def get_report_data_custom(self, ids, context={}):
        return self.get_report_data(ids, context=context)

ReportTBDetails.register()
