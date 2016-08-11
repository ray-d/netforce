/*
 * JavaScript Pretty Date
 * Copyright (c) 2011 John Resig (ejohn.org)
 * Licensed under the MIT and GPL licenses.
 */

// Takes an ISO time and returns a string representing how
// long ago the date represents.
function prettyDate(time, postfix){
    if (typeof(postfix) === "undefined") postfix = "ago"
	var date = new Date((time || "").replace(/-/g,"/").replace(/[TZ]/g," ")),
        diff = (((new Date()).getTime() - date.getTime()) / 1000),
		day_diff = Math.floor(diff / 86400);

    if (postfix == "left") {
        diff = (diff * -1) - 1;
        day_diff = (day_diff * -1) -1;
    }
			
	if ( diff < 0 || isNaN(day_diff) || day_diff < 0 || day_diff >= 31 )
		return;
			
	return day_diff == 0 && (
			diff < 60 && "just now" ||
			diff < 120 && "1 minute " + postfix ||
			diff < 3600 && Math.floor( diff / 60 ) + " minutes " + postfix ||
			diff < 7200 && "1 hour ago" ||
			diff < 86400 && Math.floor( diff / 3600 ) + " hours " + postfix) ||
		day_diff == 1 && "Tomorrow" ||
		day_diff < 7 && day_diff + " days " + postfix ||
		day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks " + postfix;
}

// If jQuery is included in the page, adds a jQuery plugin to handle it as well
if ( typeof jQuery != "undefined" )
	jQuery.fn.prettyDate = function(){
		return this.each(function(){
			var date = prettyDate(this.title);
			if ( date )
				jQuery(this).text( date );
		});
	};
