var express=require("express");
var bodyParser=require("body-parser");
var fs=require("fs");
var babel=require("babel-core");
var React=require("react");
var ReactDOMServer=require("react-dom/server");
var exec = require('child_process').exec;

var app=express();
app.use(bodyParser.urlencoded({ extended: false ,limit:"10mb"}));

const PORT=9991;

app.post("/",function(req,res) {
    console.log("render report");
    try {
        console.log("body",req.body);
        if (!req.body.template) throw "Missing template";
        var template=req.body.template;
        console.log("template: "+template);
        if (!req.body.data) throw "Missing data";
        var data=JSON.parse(req.body.data);
        var orient=req.body.orientation||"portrait";
        //console.log("data: "+data);
        fs.readFile(template,"utf8",function(err,tmpl_jsx) {
            if (err) {
                console.log("Failed to read template");
                return;
            }
            console.log("tmpl_jsx",tmpl_jsx);
            var opts={
                plugins: ["transform-react-jsx"],
            };
            try {
                var tmpl_js=babel.transform(tmpl_jsx,opts).code;
                console.log("tmpl_js",tmpl_js);
            } catch (err) {
                console.log("ERROR: "+err);
                res.status(500).send("Failed to compile jsx template");
                return;
            }
            var ctx=Object.assign({React:React},data);
            try {
                var el=new Function("with (this) { return "+tmpl_js+"; }").call(ctx);
            } catch (err) {
                console.log("ERROR: "+err);
                res.status(500).send("Failed to evaluate js template");
                return;
            }
            var html=ReactDOMServer.renderToString(el);
            //console.log("html",html);
            fs.writeFile("/tmp/report.html",html,function(err) {
                if (err) {
                    console.log("Failed to write html");
                }
                var cmd='xvfb-run --server-args="-screen 0, 1024x768x24" wkhtmltopdf --encoding utf-8 -O '+orient+' /tmp/report.html /tmp/report.pdf';
                exec(cmd,function(error,stdout,stderr) {
                    fs.readFile("/tmp/report.pdf",function(err,pdf_data) {
                        res.setHeader('Content-type', 'application/pdf');
                        res.setHeader('Content-disposition', 'attachment; filename=report.pdf');
                        res.send(pdf_data);
                    });
                });
            });
        });
    } catch (err) {
        console.log("Failed to render report: "+err);
        res.status(500).send("Failed to render report: "+err);
    }
});

app.post("/compile",function(req,res) {
    console.log("compile jsx");
    try {
        console.log("body",req.body);
        if (!req.body.source) throw "Missing source jsx";
        var source=req.body.source;
        console.log("source"+source);
        try {
            var opts={
                plugins: ["transform-react-jsx"],
            };
            var js=babel.transform(source,opts).code;
            console.log("js",source);
        } catch (err) {
            console.log("ERROR: "+err);
            res.status(500).send("Failed to compile JSX: "+err);
            return;
        }
        res.setHeader('Content-type', 'text/javascript');
        res.send(js);
    } catch (err) {
        console.log("Failed to render report: "+err);
        res.status(500).send("Failed to render report: "+err);
    }
});

app.listen(PORT,function() {
    console.log("Listening on port "+PORT+"...");
});
