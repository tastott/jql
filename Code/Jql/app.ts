﻿
import fs = require('fs')
import lazy = require('lazy.js')
import Q = require('q')
import _parse = require('./Scripts/parse')
import _query = require('./Scripts/query')


//var jql = "SELECT Order.ShipCountry AS Country, COUNT() AS Orders FROM './data/orders.jsons' GROUP BY Order.ShipCountry";
var jql = "SELECT OrderDetails[0].Quantity FROM './data/orders.jsons'";
//var jql = "SELECT COUNT() FROM 'Test'";
var stmt = _parse.Parse(jql);

console.log('\n\nQuery:');
console.log(jql);
console.log('\n\nParsed:');
console.log(stmt);
console.log('\n\nResults:');

var query = new _query.JqlQuery(stmt); //, new _query.ArrayDataSource([{}, {}]));
query.Execute()
    .then(results => {
        results.forEach(result => {
            console.log(result);
        });
    });

process.stdin.read();

//WARNING: There is apparently a bug at Line 5527 of \node_modules\lazy.js\lazy.js (not in source control)
//         Remove/comment that line and things should work