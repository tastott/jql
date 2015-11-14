﻿#!/usr/bin/env node

import jsoql = require('./jsoql')
import http = require('http');
import fs = require('fs')
import m = require('./models')
var yargs = require('yargs')
import path = require('path')

var argv = yargs
    .usage(GetUsageText())
    .command('query', 'execute a query and output the results as JSON', cmdArgs => {
        var cmdArgv = cmdArgs
            .option('q', {
                alias: 'query',
                required: true,
                description: 'JSOQL query to be executed',
                type: 'string'
            })
                .option('o', {
                alias: 'output',
                required: false,
                description: 'Output file (optional)',
                type: 'string'
            })
                .option('i', {
                alias: 'indent',
                required: false,
                description: 'Indent the JSON output',
                type: 'boolean'
            })
            .help('h')
            .alias('h', 'help')
            .argv;

        DoQueryCommand(cmdArgv);
    })
    .help('h')
    .alias('h', 'help')
    .example('jsoql query -q "SELECT * FROM \'file://path/to/file\'"', 'Query some data in a file and write the results to standard output')
    ;

if (!argv.argv._[0]) WriteHelp('Please enter a command');
else if (argv.argv._[0].toLowerCase() !== 'query') WriteHelp(`'${argv.argv._[0]}' is not a valid command`);

function WriteHelp(beforeText?: string) {
    if (beforeText) process.stdout.write(beforeText + '\n');
    process.stdout.write(argv.help());
}

function GetUsageText() : string{
    var asciiArt = fs.readFileSync(path.join(__dirname, 'sock.txt')).toString();
    return asciiArt;
}

function DoQueryCommand(argv: any) {

    var query = argv['query'];

    var engine = new jsoql.DesktopJsoqlEngine();
    //var engine = new eng.OnlineJsoqlEngine();

    var context: m.QueryContext = {
        BaseDirectory: process.cwd(),
        Data: {
            "Test": [
                { Name: 'Dave', FavouriteFood: 'Chips', Age: 42 },
                { Name: null, FavouriteFood: 'Baked beans', Age: 0 }
            ]
        }
    };

    //var pager = engine.ExecuteQueryPaged(query, context, err => console.log(err));

    //pager.GetPage(0, 3)
    //    .then(items => {
    //        var indent = argv['indent'] ? 4 : null;
    //        process.stdout.write(JSON.stringify(items, null, indent));
    //    });

    var results = engine.ExecuteQuery(query, context)
            .GetAll()
            .then(results => {
                var indent = argv['indent'] ? 4 : null;
                process.stdout.write(JSON.stringify(results, null, indent));
            })
            .fail(error => {
                var message = '\nError encountered while executing query.';
                message += `\n\nQuery: ${query } \n\nError: ${error}\n`;
                process.stderr.write(message);
            });
}


//Local http server for testing purposes

    //if (args['w']) {
    //    var data = [
    //        { Value: 1 },
    //        { Value: 2 }
    //    ];

    //    var server = http.createServer((req, res) => {
    //        res.write(JSON.stringify(data));
    //        res.end();
    //    });

    //    server.listen(parseInt(args['w']));

    //    process.on('exit',() => {
    //        server.close();
    //    });
    //}

//Help mode for testing purposes
   ////In "query help" mode, treat '@' as placeholder for cursor and get properties in scope at cursor
    //if (args['h']) {
    //    var cursor = query.indexOf('@');
    //    if (cursor < 0) throw new Error('Query must contain cursor placeholder @ in help mode');
    //    query = query.replace('@', '');


    //    engine.GetQueryHelp(query, cursor, context)
    //        .then(help => console.log(help))
    //        .fail(error => console.log(error));

    //} else {