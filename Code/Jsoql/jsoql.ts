﻿import Q = require('q')
import p = require('./parse')
import q = require('./query')
import m = require('./models')
import ds = require('./datasource')
import qh = require('./query-help')
import {InternalQueryContext} from "./query-context";

export class JsoqlEngineBase implements m.JsoqlEngine {
    private queryHelper: qh.QueryHelper;

    constructor(private datasources: ds.DataSourceSequencers) {
        this.queryHelper = new qh.QueryHelper(this);
    }

    public ExecuteQuery(statement: m.Statement|string,
        context?: m.QueryContext): m.QueryResult {

        var parsedStatement: m.Statement;

        try {
            if (typeof statement === 'string') parsedStatement = p.ParseFull(statement);
            else parsedStatement = statement;

            context = context || {};
            var query = new q.JsoqlQuery(parsedStatement, this.datasources, new InternalQueryContext(context.BaseDirectory, context.Data));
            var validationErrors = query.Validate();

            if (validationErrors.length) return new q.JsoqlQueryResult(null, query.GetDatasources(), validationErrors);
               
            return query.Execute();
        }
        catch (ex) {
            return new q.JsoqlQueryResult(null, [], [ex.message]);
        }

    }

    public GetQueryHelp(jsoql: string, cursorPositionOrIndex: m.Position|number, context?: m.QueryContext): Q.Promise<m.HelpResult> {
        try {
            return this.queryHelper.GetQueryHelp(jsoql, cursorPositionOrIndex, context);
        }
        catch (ex) {
            return Q.reject<any>(ex);
        }
        
    }
}

export class DesktopJsoqlEngine extends JsoqlEngineBase {
    constructor() {
        super({
            "var": new ds.VariableDataSourceSequencer(),
            "file": new ds.DesktopSmartFileSequencer(),
            "http": new ds.StreamingHttpSequencer()
        });
    }
}

export class OnlineJsoqlEngine extends JsoqlEngineBase {
    constructor(appBaseUrl : string, getFileStorageKey : (id : string) => string) {
        super({
            "var": new ds.VariableDataSourceSequencer(),
            "file": new ds.OnlineSmartFileSequencer(getFileStorageKey),
            "http": new ds.OnlineStreamingHttpSequencer('http://query.yahooapis.com/v1/public/yql', appBaseUrl)
        });
    }
}