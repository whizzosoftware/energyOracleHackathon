var moment = require('moment');

function ConversionUtil() {}

ConversionUtil.prototype.convertHardwareValue = function(s) {
    s = s.toString().trim();
    if (s.length > 4 && s.substring(0,4) === 'I = ') {
        var raw = parseInt(s.substring(4), 16);
        return Number((((raw - 8) * 3.10) / 1000).toFixed(2));
    }
};

ConversionUtil.prototype.calculateMonthToDateCost = function(now, rate) {
    var currentDay = now.format('D') - 1;
    return Number((currentDay * 0.4 * 24 * rate).toFixed(2));
};

ConversionUtil.prototype.calculateRemainingMonthCost = function(now, currentKwUsage, rate) {
    var remainingDays = now.daysInMonth() - now.format('D');
    return Number((remainingDays * currentKwUsage * 24 * rate).toFixed(2));
};

module.exports = ConversionUtil;