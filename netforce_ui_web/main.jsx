var React = require('react');
var ReactDOM = require('react-dom');
var createStore = require("redux").createStore;
var applyMiddleware = require("redux").applyMiddleware;
var Provider = require("react-redux").Provider;
var thunkMiddleware = require("redux-thunk").default;
var reducer = require("./reducers");
var Root = require('./components/root');

require("bootstrap/dist/css/bootstrap.css");

var createStoreWithMiddleware=applyMiddleware(thunkMiddleware)(createStore);
var store=createStoreWithMiddleware(reducer);

rpc.set_base_url("http://localhost:9999");

ReactDOM.render(<Provider store={store}><Root/></Provider>,document.getElementById("content"));
