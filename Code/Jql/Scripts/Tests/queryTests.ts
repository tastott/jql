﻿import assert = require('assert');
import qry = require('../query')
import parse = require('../parse')
import lazy = require('lazy.js')
import Q = require('q')
import util = require('../utilities')

//Have to assert inside setTimeout to get the async test to work
//https://nodejstools.codeplex.com/discussions/550545

function ExecuteArrayQuery(jql: string, values: any[]| qry.NamedArrays): Q.Promise<any[]> {

    var namedArrays: qry.NamedArrays = util.IsArray(values)
        ? { "Test": <any[]>values }
        : <qry.NamedArrays>values;

    var stmt = parse.Parse(jql);
    var data = new qry.ArrayDataSource(namedArrays);
    var query = new qry.JqlQuery(stmt, data);
    return query.Execute();
}

export function ExpressionAlias() {
    var data = [
        { Value: 1 }
    ];
    var expected = [{ Blah: 1}];
    return ExecuteArrayQuery("SELECT Value AS Blah FROM 'Test'", data)
        .then(results => {
            setTimeout(() => assert.deepEqual(results, expected));
        }); 
}

export function NestedProperty() {
    var data = [1, 2, 3].map(i => {
        return {
            Thing: {
                Value: i
            }
        };
    });
    var expected = [
        { "Thing.Value": 1 },
        { "Thing.Value": 2 },
        { "Thing.Value": 3 }
    ];
    return ExecuteArrayQuery("SELECT Thing.Value FROM 'Test'", data)
        .then(results => {
        setTimeout(() => assert.deepEqual(results, expected));
    });
}

export function ArrayProperty() {
    var data = [1, 2, 3].map(i => {
        return {
            Thing: {
                Value: [i, i + 0.1, i + 0.2]
            }
        };
    });
    var expected = [
        { "Thing.Value[1]": 1.1 },
        { "Thing.Value[1]": 2.1 },
        { "Thing.Value[1]": 3.1 }
    ];
    return ExecuteArrayQuery("SELECT Thing.Value[1] FROM 'Test'", data)
        .then(results => {
        setTimeout(() => assert.deepEqual(results, expected));
    });
}

export function Count() {
    var data = [
        { Value: 1 },
        { Value: 2 },
        { Value: 3 }
    ];
    var expected = [{ COUNT: 3 }];
    return ExecuteArrayQuery("SELECT COUNT() FROM 'Test'", data)
        .then(results => {
            setTimeout(() => assert.deepEqual(results, expected));
        }); 
}

export function Sum() {
    var data = [
        { Value: 1 },
        { Value: 2 },
        { Value: 3 }
    ];
    var expected = [{ SUM: 6 }];
    return ExecuteArrayQuery("SELECT SUM(Value) FROM 'Test'", data)
        .then(results => {
        setTimeout(() => assert.deepEqual(results, expected));
    });
}

export function Avg() {
    var data = [
        { Value: 1 },
        { Value: 2 },
        { Value: 3 }
    ];
    var expected = [{ AVG: 2 }];
    return ExecuteArrayQuery("SELECT AVG(Value) FROM 'Test'", data)
        .then(results => {
        setTimeout(() => assert.deepEqual(results, expected));
    });
}

export function GroupBy() {
    var data = [
        { Value: 1, Thing: true },
        { Value: 2, Thing: true },
        { Value: 3, Thing: false}
    ];
    var expected = [
        { Thing: true },
        { Thing: false }
    ];
    return ExecuteArrayQuery("SELECT Thing FROM 'Test' GROUP BY Thing", data)
        .then(results => {
        setTimeout(() => assert.deepEqual(results, expected));
    });
}

export function GroupByWithAggregate() {
    var data = [
        { Value: 1, Thing: true },
        { Value: 2, Thing: true },
        { Value: 3, Thing: false }
    ];
    var expected = [
        { Thing: true , Count: 2},
        { Thing: false, Count: 1}
    ];
    return ExecuteArrayQuery("SELECT Thing, COUNT() AS Count FROM 'Test' GROUP BY Thing", data)
        .then(results => {
        setTimeout(() => assert.deepEqual(results, expected));
    });
}

export function WhereEquals() {
    var data = [
        { Value: 'A' },
        { Value: 'B' },
        { Value: 'A'  }
    ];
    var expected = [
        { Value: 'B' }
    ];
    return ExecuteArrayQuery("SELECT Value FROM 'Test' WHERE Value = 'B'", data)
        .then(results => {
        setTimeout(() => assert.deepEqual(results, expected));
    });
}

export function WhereEqualsAnd() {
    var data = [
        { Value: 'A', Something: 1 },
        { Value: 'B', Something: 1 },
        { Value: 'A', Something: 2 }
    ];
    var expected = [
        { Value: 'A' }
    ];
    return ExecuteArrayQuery("SELECT Value FROM 'Test' WHERE Value = 'A' AND Something = 1", data)
        .then(results => {
        setTimeout(() => assert.deepEqual(results, expected));
    });
}

export function WhereGreaterThan() {
    var data = [
        { Value: 1 },
        { Value: 2 },
        { Value: 3 }
    ];
    var expected = [
        { Value: 3 }
    ];
    return ExecuteArrayQuery("SELECT Value FROM 'Test' WHERE Value > 2", data)
        .then(results => {
        setTimeout(() => assert.deepEqual(results, expected));
    });
}

export function WhereLessThan() {
    var data = [
        { Value: 1 },
        { Value: 2 },
        { Value: -3 }
    ];
    var expected = [
        { Value: 1 },
        { Value: -3 }
    ];
    return ExecuteArrayQuery("SELECT Value FROM 'Test' WHERE Value < 2", data)
        .then(results => {
        setTimeout(() => assert.deepEqual(results, expected));
    });
}

export function WhereNotEqual() {
    var data = [
        { Value: 'A' },
        { Value: 'B' },
        { Value: 'A' }
    ];
    var expected = [
        { Value: 'A' },
        { Value: 'A' }
    ];
    return ExecuteArrayQuery("SELECT Value FROM 'Test' WHERE Value != 'B'", data)
        .then(results => {
        setTimeout(() => assert.deepEqual(results, expected));
    });
}

export function WhereOr() {
    var data = [
        { Value: 'A' },
        { Value: 'B' },
        { Value: 'C' }
    ];
    var expected = [
        { Value: 'A' },
        { Value: 'C' }
    ];
    return ExecuteArrayQuery("SELECT Value FROM 'Test' WHERE Value = 'A' OR Value = 'C'", data)
        .then(results => {
        setTimeout(() => assert.deepEqual(results, expected));
    });
}

export function Join() {
    var dataA = [
        { Order: 'A', CustomerId: 1 },
        { Order: 'B', CustomerId: 1 },
        { Order: 'B', CustomerId: 2  }
    ];

    var dataB = [
        { CustomerId: 1, Name: 'Tim' },
        { CustomerId: 2, Name: 'Bob' },
    ];

    var expected = [
        { CustomerId: 1, Name: 'Tim', Order: 'A' },
        { CustomerId: 1, Name: 'Tim', Order: 'B' },
        { CustomerId: 2, Name: 'Bob', Order: 'B' }
    ];

    var data : qry.NamedArrays = {
        "Orders": dataA,
        "Customers": dataB
    };

    return ExecuteArrayQuery("SELECT c.CustomerId AS CustomerId, c.Name AS Name, o.Order AS Order FROM 'Orders' AS o JOIN 'Customers' AS c ON o.CustomerId = c.CustomerId", data)
        .then(results => {
            setTimeout(() => assert.deepEqual(results, expected));
        });
}