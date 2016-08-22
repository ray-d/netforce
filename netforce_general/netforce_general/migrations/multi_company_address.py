from netforce.model import get_model
from netforce.migration import Migration

class Migration(Migration):
    _name="update.company.setting"
    _version="3.2.2"

    def migrate(self):
        companies=get_model("company").search_read([]) 
        lines=[]
        if companies:
            companies=sorted(companies, key=lambda c: c['id']) # looking for the first company
            default_company_id=companies[0]['id']
            comp_vals={}
            for addr in get_model("address").search_browse([]):
                company_id=default_company_id

                #XXX: move to hr module

                emp=addr.employee_id
                if emp and emp.company_id:
                    company_id=emp.company_id.id
                addr.write({
                    'company_id': company_id,
                })
                # copy address setting to another company
                if addr.settings_id:
                    comp_vals={
                        "type": addr.type,
                        "first_name":  addr.firt_name,
                        "last_name": addr.last_name,
                        "company":  addr.company,
                        "unit_no":  addr.unit_no,
                        "floor": addr.floor,
                        "bldg_name": addr.bldg_name,
                        "bldg_no": addr.bldg_no,
                        "village": addr.village,
                        "soi": addr.soi,
                        "moo": addr.moo,
                        "street": addr.street,
                        "sub_district": addr.sub_district,
                        "district": addr.district,
                        "address": addr.address,
                        "address2": addr.address2,
                        "city": addr.city,
                        "postal_code":  addr.postal_code,
                        "province": addr.province,
                        "province_id":  addr.province_id.id,
                        "district_id": addr.district_id.id,
                        "subdistrict_id": addr.subdistrict_id.id,
                        "country_id":  addr.country_id.id,
                        "phone": addr.phone,
                        "fax": addr.fax,
                        "settings_id":  addr.settings_id.id,
                        "sequence": addr.sequence,
                    }
                    lines.append(comp_vals)
            for vals in companies:
                company_id=vals['id']
                if company_id!=default_company_id:
                    for line_vals in lines:
                        line_vals['company_id']=company_id
                        id=get_model("address").create(line_vals)
                        print(line_vals['company_id'], " copy address setting ==>", id)

Migration.register()
