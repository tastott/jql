﻿import moment = require('moment')

export function DatePart(part: string, dateString: string, keepOffset?: boolean) {

    var date = new Date(dateString);

    if (!date.valueOf()) return null;

    var timezone = dateString.match(/(-|\+)([0-2][0-9]):([0-6][0-9])$/);

    if (keepOffset && timezone) {
        var offsetMinutes = parseInt(timezone[1] + timezone[2]) * 60 + parseInt(timezone[3]);
        date = new Date(date.valueOf() + offsetMinutes * 60000);
    }

    switch (part.toLowerCase()) {
        case 'year': return date.getUTCFullYear();
        case 'month': return date.getUTCMonth() + 1;
        case 'day': return date.getUTCDate();
        case 'hour': return date.getUTCHours();
        case 'minute': return date.getUTCMinutes();
        case 'second': return date.getUTCSeconds();
        default:
            throw new Error(`Unrecognized date part: '${part}'`);
    }
}

export function DateDiff(part: string, dateStringA: string, dateStringB: string, elapsedTime : boolean) {

    var dateA = moment(dateStringA);
    var dateB = moment(dateStringB);

    if (!dateA.isValid() || !dateB.isValid()) return null;

    //var timezone = dateString.match(/(-|\+)([0-2][0-9]):([0-6][0-9])$/);

    //if (keepOffset && timezone) {
    //    var offsetMinutes = parseInt(timezone[1] + timezone[2]) * 60 + parseInt(timezone[3]);
    //    date = new Date(date.valueOf() + offsetMinutes * 60000);
    //}

    //if (elapsedTime) {
        let unit: moment.unitOfTime.Diff;
        switch (part.toLowerCase()) {
            case 'year': unit = "year"; break;
            case 'month': unit = "month"; break;
            case 'day': unit = "day"; break;
            case 'hour': unit = "hour"; break;
            case 'minute': unit = "minute"; break;
            case 'second': unit = "second"; break;
            default:
                throw new Error(`Unrecognized date part: '${part}'`);
        }

        var result = dateB.diff(dateA, unit);
        if (elapsedTime) return result;
        else if (dateA.isBefore(dateB) && dateA.clone().add(result, unit).get(unit) < dateB.get(unit)) return result + 1;
        else if (dateA.isAfter(dateB) && dateA.clone().add(result, unit).get(unit) > dateB.get(unit)) return result - 1;
        else return result;

    //}
    //else {
    //    switch (part.toLowerCase()) {
    //        case 'year':
    //            return dateB.year() - dateA.year();
    //            break;
    //        case 'month':
    //            return (dateB.year() - dateA.year()) * 12 + dateB.month() - dateA.month();
    //            break;
    //        case 'day': unit = 'days'; break;
    //        case 'hour': unit = 'hours'; break;
    //        case 'minute': unit = 'minutes'; break;
    //        case 'second': unit = 'seconds'; break;
    //        default:
    //            throw new Error(`Unrecognized date part: '${part}'`);
    //    }
    //}
}
