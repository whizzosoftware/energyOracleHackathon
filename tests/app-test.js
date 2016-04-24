var chai = require('chai');
var expect = chai.expect;
var ConversionUtil = require('../conversion');
var moment = require('moment');

describe('ConversionTest', function() {
    it('real-time conversion test', function() {
        var conversionUtil = new ConversionUtil();
        console.log(conversionUtil);
        expect(conversionUtil.convertHardwareValue('I = 01DC\r\n')).to.equal(1.45);
    });
    it('month to date cost test', function() {
        var conversionUtil = new ConversionUtil();
        expect(conversionUtil.calculateMonthToDateCost(moment('2016-04-24'), 0.13)).to.equal(28.70);
    });
    it('remaining month cost test', function() {
        var conversionUtil = new ConversionUtil();
        expect(conversionUtil.calculateRemainingMonthCost(moment('2016-04-24'), 0.12, 0.13)).to.equal(2.25);
    });
});