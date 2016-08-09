_views={}

module.exports.register=function(name,view_cls) {
    _views[name]=view_cls;
}


module.exports.get_view=function(name) {
    var view_cls=_views[name];
    if (!view_cls) throw "View not found: "+name;
    return view_cls;
}
