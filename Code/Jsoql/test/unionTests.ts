import jsoql = require('../models')
import assert = require('assert');
import testBase = require('./testBase');

describe('unionTests', () => {
    it('Union of two', () => {
    
        var context: jsoql.QueryContext = {
            Data: {
                people1: [
                    { Name: 'Dave', FavouriteFoods: ['Chips', 'Doughnuts'] },
                    { Name: 'Jim', FavouriteFoods: ['Baked beans', 'Broccoli'] }
                ],
                people2: [
                    { Name: 'Mary', FavouriteFoods: ['Breadsticks'] },
                    { Name: 'Sue', FavouriteFoods: ['Carrots', 'Tiramisu','Cheese'] }
                ]
            }
        };
    
        var query = "SELECT * FROM 'var://people1' UNION SELECT * FROM 'var://people2'";
        var expected = context.Data['people1'].concat(context.Data['people2']);
    
        return testBase.ExecuteAndAssertDeepEqual(query, context, expected);
    })
    
    it('Union of three', () => {
    
        var context: jsoql.QueryContext = {
            Data: {
                people1: [
                    { Name: 'Dave', FavouriteFoods: ['Chips', 'Doughnuts'] },
                    { Name: 'Jim', FavouriteFoods: ['Baked beans', 'Broccoli'] }
                ],
                people2: [
                    { Name: 'Mary', FavouriteFoods: ['Breadsticks'] },
                    { Name: 'Sue', FavouriteFoods: ['Carrots', 'Tiramisu','Cheese'] }
                ],
                people3: [
                    { Name: 'Marvin', FavouriteFoods: ['Swordfish'] },
                ]
            }
        };
    
        var query = "SELECT * FROM 'var://people1' UNION SELECT * FROM 'var://people2' UNION SELECT * FROM 'var://people3'";
        var expected = context.Data['people1'].concat(context.Data['people2']).concat(context.Data['people3']);
    
        return testBase.ExecuteAndAssertDeepEqual(query, context, expected);
    })

})