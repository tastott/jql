﻿var lazy: LazyJS.LazyStatic = require('./Hacks/lazy.node')
import Q = require('q')
import ds = require('./datasource')
import parse = require('./parse')
import m = require('./models')
import qstring = require('./query-string')
import util = require('./utilities')
import query = require('./query')
import dateTime = require('./date-time')
var clone = require('clone')
var deepEqual : (a,b) => boolean = require('deep-equal')

export interface EvaluationContext {
    CurrentDate: Date
};

interface FunctionMappings {
    [key: string]: (items: any[], context? : EvaluationContext) => any;
}

var operators: FunctionMappings = {
    '=': args => deepEqual(args[0], args[1]),
    '!=': args => args[0] !== args[1],
    '>': args => args[0] > args[1],
    '>=': args => args[0] >= args[1],
    '<': args => args[0] < args[1],
    '<=': args => args[0] <= args[1],
    'and': args => args[0] && args[1],
    'or': args => args[0] || args[1],
    '+': args => args[0] + args[1],
    '-': args => args[0] - args[1],
    '*': args => args[0] * args[1],
    '/': args => args[0] / args[1]
};

var scalarFunctions: FunctionMappings = {
    'regexmatch': args => {
        if (args[0] && typeof args[0] === 'string') {
            var match = (<string>args[0]).match(new RegExp(args[1], args[2] || ''));
            if (match) return match[0];
            else return null;
        }
        else return null;
    },
    'length': args => {
        if (args[0] && typeof args[0] === 'string') {
            return (<string>args[0]).length;
        }
        else return null;
    },
    'isnull': args => args[0] === null,
    'isundefined': args => args[0] === undefined,
    'coalesce': args => lazy(args).filter(arg => arg != null).first() || null,
    'not': args => !args[0],
    'in': args => !!lazy(args[1]).some(item => deepEqual(args[0], item)),
    'datepart': args => dateTime.DatePart(args[0], args[1], args[2]),
    'datediff': args => dateTime.DateDiff(args[0], args[1], args[2], args[3]),
    'getdate': (args, context) => context.CurrentDate.toISOString(),
    'floor': args => Math.floor(args[0]),
    'trim': args => args[0] && typeof args[0] === 'string' ? args[0].trim() : null 
}

var aggregateFunctions: FunctionMappings = {
    'count': items => items.length,
    'max': items => lazy(items).max(),
    'min': items => lazy(items).min(),
    'sum': items => lazy(items).sum(),
    'avg': items => {
        var count = items.length;
        if (count) return lazy(items).sum() / count;
        else return null;
    },
    'first': items => items[0] || null,
    'items': items => items
};

var itemRef = '$';

export class Evaluator implements EvaluationContext {

    public CurrentDate: Date;

    constructor(private datasources: ds.DataSourceSequencers = null) {
        this.CurrentDate = new Date();
    }

    public Evaluate(expression: any, target: any) {
        if (expression.Operator) {
            var args = expression.Args.map(arg => this.Evaluate(arg, target));
            return this.DoOperation(expression.Operator, args);
        }
        else if (expression.Property) {
            
            if(expression.Property == itemRef) return target;
            
            var propTarget;

            if (target[expression.Property] === undefined) return undefined;
            if (target[expression.Property] === null) return null;

            if (expression.Index != undefined) {
                propTarget = target[expression.Property][expression.Index];
            } else propTarget = target[expression.Property];

            if (expression.Child) return this.Evaluate(expression.Child, propTarget);
            else return propTarget;
        }
        else if (expression.Quoted !== undefined) return expression.Quoted;
        else if (expression.Call) {
            var args = expression.Args.map(arg => this.Evaluate(arg, target));
            return this.DoScalarFunction(expression.Call, args);
        }
        else if (expression.KeyValues) {
            var keyValues: { Key: string; Value: any }[] = expression.KeyValues;
            return lazy(keyValues)
                .map(kv => [kv.Key, this.Evaluate(kv.Value, target)])
                .toObject();
        }
        else if (expression.SubQuery) {
            var context: m.QueryContext = {
                Data: target
            };
            var subquery = new query.JsoqlQuery(expression.SubQuery, this.datasources, context);
            var results = subquery.ExecuteSync();

            return util.MonoProp(results[0]);
        }
        else if (util.IsArray(expression))
        {
            return expression.map(e => this.Evaluate(e, target));
        }
        else if (expression.Case !== undefined) {
            var whens: { When: any; Then: any }[] = expression.Whens;
            var firstMatch: { When: any; Then: any };

            //First WHEN expression to match this expression
            if (expression.Case != null) {
                var matchWith = this.Evaluate(expression.Case, target);
                firstMatch = lazy(whens).find(when => deepEqual(this.Evaluate(when.When, target), matchWith));
            }
            //First WHEN expression to be true
            else {
                firstMatch= lazy(whens).find(when => !!this.Evaluate(when.When, target));
            }

            if (firstMatch) return this.Evaluate(firstMatch.Then, target);
            else if (expression.Else !== undefined) return this.Evaluate(expression.Else, target);
            else return null;
        }
        else return expression;
    }

    static Evaluate(expression: any, target: any) {
        return new Evaluator().Evaluate(expression, target);
    }

    private EvaluateSubQuery(statement: m.Statement, target: any, checkDatasources: boolean = true) {
        var context: m.QueryContext = {
            Data: target
        };
        var subquery = new query.JsoqlQuery(statement, this.datasources, context);

        //A variable datasource for the sub-query can legitimately not exist (i.e. this item doesn't have the referenced property)
        //To cater for this, we have to check for such a datasource now and return a null value
        var variableDatasources = subquery.GetDatasources().filter(ds => ds.Type === 'var');
        if (checkDatasources && variableDatasources.some(vds => {
            return !this.Evaluate(vds.Value, target);
        })) return null;
        else {
            var results = subquery.ExecuteSync();
            //Return either single value or array depending on cardinality of query
            var value:any;
            
            if(subquery.Cardinality() == query.Cardinality.One){
                //Wrap multi-field queries in object
                if(subquery.ColumnCount() == 1) value = util.MonoProp(results[0]);
                else value = results[0];
            }
            else {
                value = results;
            }
            
            return value;
        }
    }
    
    public EvaluateAliased(expression: any, target: any, alias?: string): { Alias: string; Value: any }[] {
        if (expression.Operator) {
            var args = expression.Args.map(arg => this.Evaluate(arg, target));
            return [{ Alias: '', Value: this.DoOperation(expression.Operator, args) }];
        }
        else if (expression.Property == '*') {
            if (!target) return [];
            else return Object.keys(target)
                .map(key => {
                return {
                    Alias: key,
                    Value: target[key]
                };
            });
        }
        else if (expression.Property) {
            
            if(expression.Property == itemRef) return [{Alias: alias || itemRef, Value: target}];
            
            var aliasPrefix = alias ? alias + '.' : '';
            var propAlias = expression.Index != undefined
                ? aliasPrefix + expression.Property + '[' + expression.Index + ']'
                : propAlias = aliasPrefix + expression.Property;


            var propTarget = target !== null && target !== undefined
                ? expression.Index != undefined
                    ? propTarget = target[expression.Property][expression.Index]
                    : propTarget = target[expression.Property]
                : null; //Keep passing nulls down to get full alias
           

            if (expression.Child) return this.EvaluateAliased(expression.Child, propTarget, propAlias);
            else return [{ Alias: propAlias, Value: propTarget }];
        }
        else if (expression.Quoted !== undefined) return [{ Alias: expression.Quoted, Value: expression.Quoted }];
        else if (expression.SubQuery) {
            var value = this.EvaluateSubQuery(expression.SubQuery, target);
            return [{Alias: alias, Value: value}];
        }
        else if (expression.Call) {
            var args = expression.Args.map(arg => this.Evaluate(arg, target));
            return [{ Alias: '', Value: this.DoScalarFunction(expression.Call, args) }];
        }
        else if (expression.KeyValues) {
            var keyValues: { Key: string; Value: any }[] = expression.KeyValues;
            return [{
                Alias: alias,
                Value: lazy(keyValues)
                    .map(kv => [kv.Key, this.Evaluate(kv.Value, target)])
                    .toObject()
            }];
        }
        else if (util.IsArray(expression)) {
            return [{ Alias: alias, Value: expression.map(e => this.Evaluate(e, target)) }];
        }
        else if (expression.Case !== undefined) {
            return [{ Alias: '', Value: this.Evaluate(expression, target) }];
        }
        else return [{ Alias: '', Value: expression }];
    }

    public EvaluateGroup(expression: any, group: m.Group) {

        var expressionKey = JSON.stringify(expression);
        if (group.Key[expressionKey] !== undefined) {
            return group.Key[expressionKey];
        }
        else if (Evaluator.IsAggregateFunction(expression)) {
            if (expression.Args && expression.Args.length > 1)
                throw new Error('Aggregate function expected zero or one arguments');

            var items = expression.Args[0]
                ? group.Items.map(item => this.Evaluate(expression.Args[0], item))
                : group.Items;

            return this.DoAggregateFunction(expression.Call, items);
        }
        //else if (expression.Property) {
        //    var key = Evaluator.Alias(expression);
        //    return group.Key[key];
        //}
        else if (expression.Call) {
            var args = expression.Args.map(arg => this.EvaluateGroup(arg, group));
            return this.DoScalarFunction(expression.Call, args);
        }
        else if (expression.Operator) {
            var args = expression.Args.map(arg => this.EvaluateGroup(arg, group));
            return this.DoOperation(expression.Operator, args);
        }
        else if (expression.KeyValues) {
            var keyValues: { Key: string; Value: any }[] = expression.KeyValues;
            return lazy(keyValues)
                .map(kv => [kv.Key, this.EvaluateGroup(kv.Value, group)])
                .toObject();
        }
        else if (expression.Quoted) return expression.Quoted;
        else if (util.IsArray(expression)) {
            return expression.map(e => this.EvaluateGroup(e, group));
        }
        else if (expression.Case !== undefined) {
            var whens: { When: any; Then: any }[] = expression.Whens;
            var firstMatch: { When: any; Then: any };
             
            //First WHEN expression to match this expression
            if (expression.Case != null) {
                var matchWith = this.EvaluateGroup(expression.Case, group);
                firstMatch = lazy(whens).find(when => deepEqual(this.EvaluateGroup(when.When, group), matchWith));
            }
            //First WHEN expression to be true
            else {
                firstMatch = lazy(whens).find(when => !!this.EvaluateGroup(when.When, group));
            }

            if (firstMatch) return this.EvaluateGroup(firstMatch.Then, group);
            else if (expression.Else !== undefined) return this.EvaluateGroup(expression.Else, group);
            else return null;
        }
        else if (expression.SubQuery) {
            var value = this.EvaluateSubQuery(expression.SubQuery, group, false);
            return value;
        }
        else return expression;
    }

    private DoScalarFunction(name: string, args: any[]) {

        var func = scalarFunctions[name.toLowerCase()];

        if (!func) throw 'Unrecognized function: ' + name;

        return func(args, this);
    }

    private DoOperation(operator: string, args: any[]) {
        var func = operators[operator.toLowerCase()];

        if (!func) throw 'Unrecognized operator: ' + operator;

        return func(args);
    }

    private DoAggregateFunction(name: string, items: any[]) {

        var func = aggregateFunctions[name.toLowerCase()];

        if (!func) throw 'Unrecognized function: ' + name;

        return func(items);
    }

    static IsAggregateFunction(expression: any) {
        return expression
            && expression.Call
            && aggregateFunctions[expression.Call.toLowerCase()];
    }

    static IsAggregate(expression: any): boolean {

        if (Evaluator.IsAggregateFunction(expression)) return true;

        else if (expression.Args) return lazy(expression.Args).some(arg => Evaluator.IsAggregate(arg));
        else return false;
    }

    static Alias(expression: any): string {
        if (expression.Property) {
            var propKey;
            if (expression.Index != undefined) {
                propKey = expression.Property + '[' + expression.Index + ']';
            } else propKey = expression.Property

            if (expression.Child) return propKey + '.' + this.Alias(expression.Child);
            else return propKey;
        }
        else if (expression.Call) {
            return expression.Call;
        }
        else return '';
    }

}
