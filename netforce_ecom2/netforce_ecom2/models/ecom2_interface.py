from netforce.model import Model,fields,get_model
from netforce import utils
from netforce import database

class EcomInterface(Model):
    _name="ecom2.interface"
    _store=False

    def sign_up(self,vals,context={}):
        print("EcomInterface.sign_up",vals,context)
        res=get_model("base.user").search([["email","=",vals["email"]]])
        if res:
            raise Exception("User already exists with same email")
        res=get_model("contact").search([["email","=",vals["email"]]])
        if res:
            raise Exception("Contact already exists with same email")
        cont_vals={
            "first_name": vals["first_name"],
            "last_name": vals["last_name"],
            "email": vals["email"],
        }
        contact_id=get_model("contact").create(cont_vals)
        res=get_model("profile").search([["code","=","ECOM_CUSTOMER"]])
        if not res:
            raise Exception("Customer user profile not found")
        profile_id=res[0]
        user_vals={
            "name": "%s %s"%(vals["first_name"],vals["last_name"]),
            "login": vals["email"],
            "profile_id": profile_id,
            "contact_id": contact_id,
            "password": vals["password"],
        }
        user_id=get_model("base.user").create(user_vals)
        addr_vals = {
            "first_name": vals["first_name"],
            "last_name": vals["last_name"],
            "province_id": vals["province_id"],
            "type": "billing",
            "postal_code" : vals["postal_code_id"], 
            "address": vals["address"],
            "contact_id": contact_id,
            "mobile": vals["mobile"],
            "instructions_messenger" :vals['messenger'],
        }
        if vals.get("subdistrict_id"):
            subdistrict_id = vals["subdistrict_id"]
            if subdistrict_id:
                addr_vals['subdistrict_id'] = subdistrict_id
        get_model("address").create(addr_vals)
        get_model("contact").trigger([contact_id],"ecom_sign_up")
        dbname=database.get_active_db()
        return {
            "user_id": user_id,
            "token": utils.new_token(dbname,user_id),
            "contact_id" : contact_id,
        }

    def login(self,email,password,context={}):
        print("EcomInterface.login",email,password)
        user_id=get_model("base.user").check_password(email,password)
        if not user_id:
            raise Exception("Invalid login")
        user=get_model("base.user").browse(user_id)
        contact=user.contact_id
        dbname=database.get_active_db()
        return {
            "user_id": user_id,
            "token": utils.new_token(dbname,user_id),
            "contact_id": contact.id,
        }

    def checkEmail(self,login,context={}):
        print("EcomInterface.CheckEmail",login)
        res = get_model("base.user").search_browse([['login','=',login]])
        if res:
            id = res[0].id
            reset_code = res.password_reset(id)
            vals = {
            "body":"Please click the link to reset the code: http://localhost/reset_password?code=%s"%reset_code,
            "from_addr":"demo@netforce.com",
            "subject" : "Reset Code",
            "type": "out",
            "state":"to_send",
            "to_addrs":login,
            "mailbox_id":1,
            }
            get_model('email.message').create(vals)            
        else: 
            raise Exception("Email Not Found");
        return 

    def check_reset_code_exist(self,reset_code,context={}):
        print("EcomInterface.checkResetCodeExist",reset_code)
        res = get_model("base.user").search([["password_reset_code","=",reset_code]])
        if not res:
            raise Exception("Invalid Code")

    def set_new_password(self,reset_code,new_password,context={}):
        print("EcomInterface.set_new_password",reset_code,new_password) 
        res = get_model("base.user").search([["password_reset_code","=",reset_code]])
        if not res:
            raise Exception("Can not find user")
        user = get_model("base.user").browse(res[0])
        user.write({"password": new_password})

    def add_request_product_groups(self,contact_id,prod_group_id,context={}):
        print("Ecom2Interface.add_request_product_group",contact_id,prod_group_id)
        #contact_id=context.get("contact_id")
        contact=get_model("contact").browse(contact_id)
        contact.write({"request_product_groups":[("add",[prod_group_id])]})

    def remove_request_product_groups(self,contact_id,prod_group_id,context={}):
        print("Ecom2Interface.remove_request_product_group",contact_id,prod_group_id)
        #contact_id=context.get("contact_id")
        contact=get_model("contact").browse(contact_id)
        contact.write({"request_product_groups":[("remove",[prod_group_id])]})

    def add_exclude_product_groups(self,contact_id,prod_group_id,context={}):
        print("Ecom2Interface.exclude_product_groups",contact_id,prod_group_id)
        #contact_id=context.get("contact_id")
        contact=get_model("contact").browse(contact_id)
        contact.write({"exclude_product_groups":[("add",[prod_group_id])]})

    def remove_exclude_product_groups(self,contact_id,prod_group_id,context={}):
        print("Ecom2Interface.remove_request_product_group",contact_id,prod_group_id)
        #contact_id=context.get("contact_id")
        contact=get_model("contact").browse(contact_id)
        contact.write({"exclude_product_groups":[("remove",[prod_group_id])]})

EcomInterface.register()
