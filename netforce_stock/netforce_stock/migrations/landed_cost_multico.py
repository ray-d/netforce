from netforce import migration
from netforce.model import get_model
from netforce.access import set_active_user

class Migration(migration.Migration):
    _name="landed.cost.multico"
    _version="3.2.3"

    def migrate(self):
        set_active_user(1)
        comp=get_model("company").search([],order="id")
        if comp:
            comp_id=comp[0]
            for lc in get_model("landed.cost").search_browse([]):
                lc.write({
                    'company_id': comp_id,
                })

Migration.register()
