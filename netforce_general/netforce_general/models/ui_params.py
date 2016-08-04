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

from netforce.model import Model, fields
from netforce import action
from netforce import layout
from netforce import model
from netforce import get_module_version_name,get_module_version_code
from netforce import template

class UIParams(Model):
    _name = "ui.params"
    _store = False

    def get_version(self,context={}):
        return {
            "version_name": get_module_version_name(),
            "version_code": get_module_version_code(),
        }
    
    def load_ui_params(self,context={}):
        actions=action.actions_to_json(modules=context.get("modules"))
        layouts=layout.layouts_to_json(modules=context.get("modules"),mobile_only=context.get("mobile_only"))
        models=model.models_to_json()
        templates=template.templates_to_json(modules=context.get("modules"))
        return {
            "version_name": get_module_version_name(),
            "version_code": get_module_version_code(),
            "actions": actions,
            "layouts": layouts,
            "models": models,
            "templates": templates,
        }

UIParams.register()
