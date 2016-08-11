from netforce.model import Model,fields,get_model
from netforce import database

class Contact(Model):
    _inherit="contact"
    _fields={
        "previous_sale_products": fields.Many2Many("product","Previously Ordered Products",function="get_previous_sale_products"),
    }

    def get_previous_sale_products(self,ids,context={}):
        db=database.get_connection()
        res=db.query("SELECT contact_id,product_id,COUNT(*) FROM sale_order_line l JOIN sale_order o ON o.id=l.order_id and plr_order_type='grocery' WHERE o.contact_id IN %s GROUP BY contact_id,product_id",tuple(ids))
        contact_prods={}
        for r in res:
            contact_prods.setdefault(r.contact_id,[]).append(r.product_id)
        vals={}
        for obj in self.browse(ids):
            vals[obj.id]=contact_prods.get(obj.id,[])[:5] # XXX
        return vals

Contact.register()
