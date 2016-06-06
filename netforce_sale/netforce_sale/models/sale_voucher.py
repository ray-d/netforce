from netforce.model import Model,fields,get_model
import time

class Voucher(Model):
    _name="sale.voucher"
    _string="Voucher"
    _name_field="code"
    _fields={
        "code": fields.Char("Voucher Code",required=True,search=True),
        "benefit_type": fields.Selection([["fixed_discount_order","Fixed Discount On Order"],["free_product","Free Product"],["percent_discount_product","Percent Discount On Product"],["credit","Credits"]],"Benefit For Customer",required=True),
        "refer_benefit_type": fields.Selection([["credit","Credits"]],"Benefit For Referring Customer"),
        "discount_amount": fields.Decimal("Discount Amount"),
        "discount_percent": fields.Decimal("Discount Percent"),
        "discount_product_groups": fields.Many2Many("product.group","Discount Product Groups",reltable="m2m_voucher_discount_product_groups",relfield="voucher_id",relfield_other="product_group_id"),
        "discount_product_id": fields.Many2One("product","Discount Product"),
        "discount_max_qty": fields.Integer("Discount Max Qty"),
        "credit_amount": fields.Decimal("Credit Amount"),
        "refer_credit_amount": fields.Decimal("Credit Amount For Referring Customer"),
        "min_order_amount": fields.Decimal("Min Order Amount"),
        "min_order_amount_msg": fields.Text("Error Message"),
        "state": fields.Selection([["active","Active"],["inactive","Inactive"]],"Status",required=True),
        "max_orders_per_customer": fields.Integer("Max Orders Per Customer"),
        "max_orders_per_customer_msg": fields.Text("Error Message"),
        "new_customer": fields.Boolean("New Customers Only"),
        "new_customer_msg": fields.Text("Error Message"),
        "contact_groups": fields.Many2Many("contact.group","Customer Groups"),
        "contact_groups_msg": fields.Text("Error Message"),
        "product_groups": fields.Many2Many("product.group","Critera Product Groups"), # XXX: rename
        "product_groups_msg": fields.Text("Error Message"),
        "cond_product_id": fields.Many2One("product","Criteria Product"),
        "cond_product_msg": fields.Text("Error Message"),
        "cond_product_categ_id": fields.Many2One("product.categ","Criteria Product Category"),
        "cond_product_categ_msg": fields.Text("Error Message"),
        "min_qty": fields.Decimal("Min Qty"),
        "min_qty_msg": fields.Text("Error Message"),
        "customer_id": fields.Many2One("contact","Customer"),
        "customer_msg": fields.Text("Error Message"),
        "description": fields.Text("Description"),
        "expire_date": fields.Date("Expiration Date"),
        "expire_date_msg": fields.Text("Error Message"),
        "carts": fields.One2Many("ecom2.cart","voucher_id","Carts"),
        "sale_orders": fields.One2Many("sale.order","voucher_id","Sales Orders"),
        "product_id": fields.Many2One("product","Configuration Product",required=True),
    }
    _defaults={
        "state": "active",
    }

    def apply_voucher(self,ids,context={}):
        print("$"*80)
        print("voucher.apply_coupon",ids)
        obj=self.browse(ids[0])
        contact_id=context.get("contact_id")
        print("contact_id",contact_id)
        amount_total=context.get("amount_total")
        print("amount_total",amount_total)
        products=context.get("products",[])
        print("products",products)
        date=time.strftime("%Y-%m-%d")
        try:
            if obj.expire_date and date>obj.expire_date:
                msg="This voucher is expired."
                if obj.expire_date_msg:
                    msg=obj.expire_date_msg
                raise Exception(msg)
            if obj.contact_id and contact_id!=obj.contact_id.id:
                msg="This voucher can not apply to this customer."
                if obj.contact_msg:
                    msg=obj.contact_msg
                raise Exception(msg)
            if obj.min_order_amount and (amount_total is None or amount_total<obj.min_order_amount):
                msg="Order total is insufficient to use this voucher."
                if obj.min_order_amount_msg:
                    msg=obj.min_order_amount_msg
                raise Exception(msg)
            if obj.new_customer:
                res=get_model("sale.order").search([["contact_id","=",contact_id]])
                if res:
                    msg="This voucher can only be used by new customers."
                    if obj.new_customer_msg:
                        msg=obj.new_customer_msg
                    raise Exception(msg)
            if obj.max_orders_per_customer:
                res=get_model("sale.order").search([["contact_id","=",contact_id],["voucher_id","=",obj.id]])
                if len(res)>=obj.max_orders_per_customer:
                    msg="The maximum usage limit has been reached for this voucher"
                    if obj.max_orders_per_customer_msg:
                        msg=obj.max_orders_per_customer_msg
                    raise Exception(msg)
            if obj.cond_product_categ_id:
                prod_ids=[]
                for line in products:
                    prod_id=line["product_id"]
                    prod_ids.append(prod_id)
                res=get_model("product").search([["id","in",prod_ids],["categ_id","child_of",obj.cond_product_categ_id.id]])
                if not res:
                    msg="Wrong product category"
                    if obj.cond_product_categ_msg:
                        msg=obj.cond_product_categ_msg
                    raise Exception(msg)
            disc_amt=0
            if obj.benefit_type=="fixed_discount_order":
                disc_amt=min(obj.discount_amount,amount_total or 0)
            return {
                "discount_amount": disc_amt,
            }
        except Exception as e:
            return {
                "discount_amount": 0,
                "error_message": str(e),
            }

Voucher.register()
