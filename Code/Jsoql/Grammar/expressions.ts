﻿import tokens = require('./tokens')
import utils = require('../utilities')
var lazy: LazyJS.LazyStatic = require('../Hacks/lazy.js')

var val = tokens.values;
var keywords = tokens.keywords;

var operators = [
    keywords.AND,
    keywords.OR,
    '=',
    '!=',
    '<',
    '>',
    '<=',
    '>=',
    '+',
    '-',
    '/',
    '*',
    //'**'
];

var exp = {
    Quoted: () => [
        [
            val.Quotation,
            "{ Quoted: $1.replace(/'/g, \"\")}"
        ],
        [
            val.DoubleQuotation,
            "{ Quoted: $1.replace(/\"/g, \"\")}"
        ]
    ],
    Boolean: () => [
        [
            val.True,
            "true"
        ],
        [
            val.False,
            "false"
        ]
    ],
    Identifier: () => [
        val.PlainIdentifier
    ],
    Index: () => [
        val.Number,
        [
            exp.Quoted,
            "$1.Quoted"
        ]
    ],
    Property: () => [
        [
            '*',
            "{ Property : '*' }"
        ],
        [
            exp.Identifier,
            "{ Property: $1}"
        ],
        [
            exp.Identifier + ' [ ' + exp.Index + ' ]',
            "{ Property: $1, Index: $3}"
        ],
        [
            exp.Identifier + " . " + exp.Property,
            "{ Property: $1, Child: $3}"
        ],
        [
            exp.Identifier + " [ " + exp.Index + " ] . " + exp.Property,
            "{ Property: $1, Index: $3, Child: $6}"
        ]
    ],
    WhenThenList: () => [
        [
            keywords.WHEN + " " + exp.Expression + " " + keywords.THEN + " " + exp.Expression,
            "[{ When: $2, Then: $4 }]"
        ],
        [
            exp.WhenThenList + " " + keywords.WHEN + " " + exp.Expression + " " + keywords.THEN + " " + exp.Expression,
            "$1.concat([{ When: $3, Then: $5 }])"
        ]
    ],
    CaseExpression: () => [
        [
            keywords.CASE + " " + exp.Expression + " " + exp.WhenThenList + " " + keywords.END,
            { Case: "$2", Whens: "$3" }
        ],
        [
            keywords.CASE + " " + exp.WhenThenList + " " + keywords.END,
            { Case: null, Whens: "$2" }
        ],
        [
            keywords.CASE + " " + exp.Expression + " " + exp.WhenThenList + " " + keywords.ELSE + " " + exp.Expression + " " + keywords.END,
            { Case: "$2", Whens: "$3", Else: "$5" }
        ],
        [
            keywords.CASE + " " + exp.WhenThenList + " " + keywords.ELSE + " " + exp.Expression + " " + keywords.END,
            { Case: null, Whens: "$2", Else: "$4" }
        ]
    ],

    Expression: () => [
        //[
        //    '*',
        //    "{ Property : '*' }"
        //],
        [
            exp.Identifier + " ( )",
            "{ Call: $1, Args: []}"
        ],
        [
            exp.Identifier + " ( " + exp.ExpressionList + " )",
            "{ Call: $1, Args: $3}"
        ],
        [
            '[ ]',
            "[]"
        ],
        [
            '[ ' + exp.ExpressionList + ' ]',
            "$2"
        ],
        exp.Property,
        exp.Quoted,
        exp.Boolean,
        exp.Object,
        exp.CaseExpression,
        [
            val.Number,
            "parseFloat($1)"
        ],
        [
            "( " + exp.Stmt + " )",
            "{SubQuery: $2}"
        ],
        [
            exp.Expression + " " + keywords.IS + " " + val.Null,
            "{ Call: \"IsNull\", Args: [$1] }"
        ],
        [
            exp.Expression + " " + keywords.IS + " " + val.Undefined,
            "{ Call: \"IsUndefined\", Args: [$1] }"
        ],
        [
            keywords.NOT + " " + exp.Expression,
            "{ Call: \"Not\", Args: [$2] }"
        ],
        [
            exp.Expression + " " + keywords.IN + " " + "( " + exp.ExpressionList + " )",
            "{ Call: \"In\", Args: [$1, $4]}"
        ]
        //[
        //    exp.Expression + " " + exp.Operator + " " + exp.Expression,
        //    { Operator: "$2", Args: ["$1", "$3"] }
        //]
    ]
        .concat(<any>operators.map(op =>
        [
            exp.Expression + " " + op + " " + exp.Expression,
            { Operator: "$2", Args: ["$1", "$3"] }
        ]
        ))
        .concat([
        [
            "- Expression", // %prec UMINUS",
            "$$ = -$2"
        ]
    ])

    ,

    KeyValue: () => [
        [
            exp.Identifier + " : " + exp.Expression,
            "{Key: $1, Value: $3}"
        ],
        [
            exp.Quoted + " : " + exp.Expression,
            "{Key: $1.Quoted, Value: $3}"
        ]
    ],
    KeyValueList: () => [
        [
            exp.KeyValue,
            "[$1]"
        ],
        [
            exp.KeyValueList + " , " + exp.KeyValue,
            "$1.concat([$3])"
        ]
    ],
    Object: () => [
        [
            "{ " + exp.KeyValueList + " }",
            "{KeyValues: $2}"
        ]
    ],
    ExpressionList: () => [
        [
            exp.Expression,
            "[$1]"
        ],
        [
            exp.ExpressionList + " , " + exp.Expression,
            "$1.concat([$3])"
        ]
    ],
    Selectable: () => [
        [
            exp.Expression,
            "{Expression: $1}"
        ],
        [
            exp.Expression + " " + keywords.AS + " " + exp.Identifier,
            "{ Expression: $1, Alias: $3}"
        ],
        [
            exp.Expression + " " + keywords.AS + " " + exp.Quoted,
            "{ Expression: $1, Alias: $3.Quoted}"
        ],
        [
            exp.KeyValue,
            "{ Expression: $1.Value, Alias: $1.Key}"
        ]
    ],
    SelectList: () => [
        [
            exp.Selectable,
            "[$1]"
        ],
        [
            exp.SelectList + " , " + exp.Selectable,
            "$1.concat([$3])"
        ]
    ],
    FromTarget: () => [
        [
            exp.Property,
            "{ Target: $1 }"
        ],
        [
            exp.Quoted,
            "{ Target: $1.Quoted }"
        ],
        exp.Object,
        [
            '( ' + exp.Stmt + ' )',
            "{ SubQuery: $2 }"
        ] 
    ],
    AliasedFromTarget: () => [
        [
            exp.FromTarget + " " + keywords.AS + " " + exp.Identifier,
            "$$ = $1; $$.Alias = $3"
        ]
    ],
    FromTargets: () => [
        exp.FromTarget,
        exp.AliasedFromTarget,
        [
            exp.FromTargets + " " + keywords.JOIN + " " + exp.AliasedFromTarget + " " + keywords.ON + " " + exp.Expression,
            "{ Join: { Type: 'Inner', Left: $1, Right: $3, Condition: $5}}"
        ],
        [
            exp.FromTargets + " " + keywords.INNER + " " + keywords.JOIN + " " + exp.AliasedFromTarget + " " + keywords.ON + " " + exp.Expression,
            "{ Join: {Type: 'Inner', Left: $1, Right: $4, Condition: $6}}"
        ],
        [
            exp.FromTargets + " " + keywords.LEFT + " " + keywords.JOIN + " " + exp.AliasedFromTarget + " " + keywords.ON + " " + exp.Expression,
            "{ Join: {Type: 'Left', Left: $1, Right: $4, Condition: $6}}",
            { "prec": "JOIN" }
        ],
        [
            exp.FromTargets + " " + keywords.LEFT + " " + keywords.OUTER + " " + keywords.JOIN + " " + exp.AliasedFromTarget + " " + keywords.ON + " " + exp.Expression,
            "{ Join: {Type: 'Left', Left: $1, Right: $5, Condition: $7}}"
        ],
        [
            exp.FromTargets + " " + keywords.RIGHT + " " + keywords.JOIN + " " + exp.AliasedFromTarget + " " + keywords.ON + " " + exp.Expression,
            "{ Join: {Type: 'Right', Left: $1, Right: $4, Condition: $6}}"
        ],
        [
            exp.FromTargets + " " + keywords.RIGHT + " " + keywords.OUTER + " " + keywords.JOIN + " " + exp.AliasedFromTarget + " " + keywords.ON + " " + exp.Expression,
            "{ Join: {Type: 'Right', Left: $1, Right: $5, Condition: $7}}"
        ],
        [
            exp.FromTargets + " " + keywords.FULL + " " + keywords.OUTER + " " + keywords.JOIN + " " + exp.AliasedFromTarget + " " + keywords.ON + " " + exp.Expression,
            "{ Join: {Type: 'Full', Left: $1, Right: $5, Condition: $7}}"
        ],
        [
            exp.FromTargets + " " + keywords.CROSS + " " + keywords.JOIN + " " + exp.AliasedFromTarget,
            "{ Join: {Type: 'Cross', Left: $1, Right: $4}}"
        ],
        [
            exp.FromTargets + " " + keywords.OVER + " " + exp.Property + " " + keywords.AS + " " + val.PlainIdentifier,
            "{ Over: { Left: $1, Right: $3, Alias: $5}}"
        ]
    ],
    OrderByExpression: () => [
        [
            exp.Expression,
            " $$ = {Expression: $1, Asc: true}"
        ],
        [
            exp.Expression + " " + keywords.ASC,
            "{Expression: $1, Asc: true}"
        ],
        [
            exp.Expression + " " + keywords.DESC,
            "{Expression: $1, Asc: false}"
        ]
    ],
    OrderByList: () => [
        [
            exp.OrderByList + " , " + exp.OrderByExpression,
            "$1.concat([$3])"
        ],
        [
            exp.OrderByExpression,
            "[$1]"
        ]
    ],
    OrderByClause: () => [
        [
            keywords.ORDERBY + ' ' + exp.OrderByList,
            "$2"
        ]
    ],
    WhereClause: () => [
        [
            keywords.WHERE + " " + exp.Expression,
            "$2"
        ]
    ],
    FromClause: () => [
        [
            keywords.FROM + " " + exp.FromTargets,
            "$2"
        ]
    ],
    SelectClause: () => [
        [
            keywords.SELECTTOP + " " + val.Number + " " + exp.SelectList,
            "{ SelectList: $3, Limit: $2}"
        ],
        [
            keywords.SELECT + " " + exp.SelectList,
            "{ SelectList: $2}"
        ],
        [
            keywords.SELECT + " " + keywords.PROMOTE + " " + exp.SelectList,
            { SelectList: "$3", Promote: true}
        ]
    ],
    GroupByClause: () => [
        [
            keywords.GROUPBY + " " + exp.ExpressionList,
            "{ Groupings: $2}"
        ],
        [
            keywords.GROUPBY + " " + exp.ExpressionList + " " + keywords.HAVING + " " + exp.Expression,
            "{ Groupings: $2, Having: $4}"
        ]
    ],
    Stmt: () => [
        [
            exp.SelectClause + " " + exp.FromClause,
            { Select: "$1", From: "$2", Positions: { Select: "@1", From: "@2" } }
        ],
        [
            exp.SelectClause + " " + exp.FromClause + " " + exp.WhereClause,
            { Select: "$1", From: "$2", Where: "$3", Positions: { Select: "@1", From: "@2", Where: "@3" } }
        ],
        [
            exp.SelectClause + " " + exp.FromClause + " " + exp.OrderByClause,
            { Select: "$1", From: "$2", OrderBy: "$3", Positions: { Select: "@1", From: "@2", OrderBy: "@3" } }
        ],
        [
            exp.SelectClause + " " + exp.FromClause + " " + exp.WhereClause + " " + exp.OrderByClause,
            { Select: "$1", From: "$2", Where: "$3", OrderBy: "$4", Positions: { Select: "@1", From: "@2", Where: "@3", OrderBy: "@4" } }
        ],
        [
            exp.SelectClause + " " + exp.FromClause + " " + exp.GroupByClause,
            { Select: "$1", From: "$2", GroupBy: "$3", Positions: { Select: "@1", From: "@2", GroupBy: "@3" } }
        ],
        [
            exp.SelectClause + " " + exp.FromClause + " " + exp.WhereClause + " " + exp.GroupByClause,
            { Select: "$1", From: "$2", Where: "$3", GroupBy: "$4", Positions: { Select: "@1", From: "@2", Where: "@3", GroupBy: "@4" } }
        ],
        [
            exp.SelectClause + " " + exp.FromClause + " " + exp.GroupByClause + " " + exp.OrderByClause,
            { Select: "$1", From: "$2", GroupBy: "$3", OrderBy: "$4", Positions: { Select: "@1", FromWhere: "@2", GroupBy: "@3", OrderBy: "@4" } }
        ],
        [
            exp.SelectClause + " " + exp.FromClause + " " + exp.WhereClause + " " + exp.GroupByClause + " " + exp.OrderByClause,
            { Select: "$1", From: "$2", Where: "$3", GroupBy: "$4", OrderBy: "$5", Positions: { Select: "@1", From: "@2", Where: "@3", GroupBy: "@4", OrderBy: "@5" } }
        ],
        [
            exp.Stmt + " " + keywords.UNION + " " + exp.Stmt,
            "{ $1.Union = $3; $$ = $1 }"
        ]
    ]
}


var expressionDefs = {};
exp = tokens.keyValueSwitcheroo(exp, expressionDefs);

export function GetJisonExpressionsFull() {

    return lazy(exp)
        .pairs()
        .map(kv => [kv[0], expressionDefs[kv[0]]()
            .map(def => {
                if (utils.IsArray(def)) {
                    var output = def[1];
                    if (typeof output !== 'string') output = JSON.stringify(output).replace(/"/g, '');
                    output = output.match(/\s*\$\$\s=/) ? output : '$$ = ' + output;
                    return [def[0], output];
                }
                else return def;
            })
        ])
        .toObject();

}

export function GetJisonExpressionsHelpful() {

    var expressions = GetJisonExpressionsFull();
    
    //Allow items in select clause to have a trailing dot or comma
    expressions['SelectList'].push(
        [
            exp.Property + ' TrailingDot',
            "$$ = $1"
        ]
        );
    expressions['SelectList'].push(
        [
            exp.SelectList + ' ,',
            "$$ = $1"
        ]
        );
  
    //Allow empty select list
    expressions['SelectClause'].push(
        [
            keywords.SELECT,
            "$$ = { SelectList: []}"
        ]
        );

    //Allow empty where clause
    expressions['WhereClause'].push(
        [
            keywords.WHERE,
            "$$ = null"
        ]
    );

    //Allow trailing dot in where clause
    expressions['WhereClause'].push(
        [
            keywords.WHERE + " " + exp.Expression + " TrailingDot",
            "$$ = $2"
        ],
        [
            keywords.WHERE + " " + exp.Expression + " FinalDot",
            "$$ = $2"
        ]
    );


    //Allow incomplete binary operations
    expressions['Expression'] = expressions['Expression'].concat(
        <any>operators.map(op =>
            [
                exp.Expression + " " + op,
                "$$ = { Operator: $2, Args: [$1] }"
            ]
        )
        );

    //expressions['Expression'].push(
    //    [
    //        exp.Expression + " FinalDot",
    //        "$
    //    ]
    //);

    //Allow items in ORDER BY clause to have a trailing dot or comma
    expressions['OrderByList'].push(
        [
            exp.OrderByList + ' TrailingDot',
            "$$ = $1"
        ]
        );
    expressions['OrderByList'].push(
        [
            exp.OrderByList + ' FinalDot',
            "$$ = $1"
        ]
        );
    expressions['OrderByList'].push(
        [
            exp.OrderByList + ' ,',
            "$$ = $1"
        ]
        );
  
    //Allow empty ORDER BY clause
    expressions['OrderByClause'].push(
        [
            keywords.ORDERBY,
            "$$ = []"
        ]
        );

    //Allow empty ON condition
    //Allow trailing dot in ON condition
    expressions['FromTargets'] = expressions['FromTargets'].concat([
        [
            exp.FromTargets + " " + keywords.JOIN + " " + exp.AliasedFromTarget + " " + keywords.ON,
            "$$ = { Join: {Type: 'Inner', Left: $1, Right: $3, Condition: null}}"
        ],
        [
            exp.FromTargets + " " + keywords.JOIN + " " + exp.AliasedFromTarget + " " + keywords.ON + " " + exp.Expression + " TrailingDot",
            "$$ = { Join: {Type: 'Inner', Left: $1, Right: $3, Condition: null}}"
        ],
        [
            exp.FromTargets + " " + keywords.JOIN + " " + exp.AliasedFromTarget + " " + keywords.ON + " " + exp.Expression + " FinalDot",
            "$$ = { Join: {Type: 'Inner', Left: $1, Right: $3, Condition: null}}"
        ]
    ]);

    //Allow items in GROUP BY clause to have a trailing dot or comma
    expressions['ExpressionList'].push(
        [
            exp.ExpressionList + ' TrailingDot',
            "$$ = $1"
        ]
        );
    expressions['ExpressionList'].push(
        [
            exp.ExpressionList + ' FinalDot',
            "$$ = $1"
        ]
        );
    expressions['ExpressionList'].push(
        [
            exp.ExpressionList + ' ,',
            "$$ = $1"
        ]
        );

    //Allow empty GROUP BY clause
    expressions['GroupByClause'].push(
        [
            keywords.GROUPBY + " ",
            "$$ = { Groupings: []}"
        ]
        );

    //Allow empty or incomplete OVER clause
    //Basically pretend the OVER isn't there at all
    expressions['FromTargets'] = expressions['FromTargets'].concat([
        [
            exp.FromTargets + " " + keywords.OVER + " " + exp.Property + " FinalDot",
            "$$ = $1"
        ],
        [
            exp.FromTargets + " " + keywords.OVER + " " + exp.Property + " TrailingDot",
            "$$ = $1"
        ],
        [
            exp.FromTargets + " " + keywords.OVER,
            "$$ = $1"
        ]
    ]);

    return expressions;
}