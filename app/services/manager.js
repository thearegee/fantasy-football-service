var config = require('../../config/config');
var request = require('request');
var async = require('async');
var cheerio = require('cheerio');
var _ = require('lodash');


var service = {

    generateURL: function(locals) {
      switch(locals.request) {
        case 'transfers':
          // in and out -  include player ID in response, get from href
          url = _.template('http://fantasy.premierleague.com/entry/<%= managerId %>/transfers/history/');
          break;
        case  'overview':
          // historic data, data about manger, team supported, country etc
          url = _.template('http://fantasy.premierleague.com/entry/<%= managerId %>/history/');
          break;
        case  'gameweek':
          // all information about the week, link to players
          url = _.template('http://fantasy.premierleague.com/entry/<%= managerId %>/event-history/<%= gameweek %>');
          break;
        }
      return  url({ 'managerId': locals.managerId, 'gameweek':locals.gameweek });
    }
};

module.exports = {
    service: service
};


function buildManagerOverviewResponse (html,managerID) {
  $ = cheerio.load(html);
  var seasonHistoryLength = $('.ismPrimaryNarrow section:nth-of-type(1) table tr').length -1;
  var gameWeek = [];
  var weeklyPoints = [];
  var totalTransfers = [];
  var totalTransfersCosts = [];
  var collectOverview = collectManagerOverview($);
  var collectGameWeekData = collectGameWeekRelated($,managerID);
  return {
    manager: collectOverview.manager,
    team: collectOverview.team,
    averagePoints:collectGameWeekData.averagePoints,
    overall : {
      points:collectOverview.overallPoints,
      rank:collectOverview.overallRank,
      rankPosition:collectGameWeekData.thisSeason[seasonHistoryLength-1].positionMovement,
      teamValue:collectGameWeekData.thisSeason[seasonHistoryLength-1].teamValue,
    },
    transfers :{
      transfersMade:collectGameWeekData.transfersMade,
      transfersCost:collectGameWeekData.transfersCost,
      url: buildTransferHistoryURL(managerID)
    },
    thisSeason : collectGameWeekData.thisSeason,
    previousSeasons: collectCareerHistory($)
  }
}

function collectManagerOverview ($) {
  return {
    manager: $('.ismSection2').text(),
    team: $('.ismSection3').text(),  
    overallPoints: $('.ismDefList.ismRHSDefList dd:nth-of-type(1)').text(), 
    overallRank: $('.ismDefList.ismRHSDefList dd:nth-of-type(2)').text() 
  }
}

function collectGameWeekRelated ($,managerID) {
 var seasonHistoryLength = $('.ismPrimaryNarrow section:nth-of-type(1) table tr').length -1;
  var gameWeek = [];
  var weeklyPoints = 0;
  var totalTransfers = 0;
  var totalTransfersCosts = 0;
  var collectOverview = collectManagerOverview($);
  // map each team to an object
  for (i = 1; i <= seasonHistoryLength; i++) { 
    var element = '.ismPrimaryNarrow section:nth-of-type(1) table tr:nth-child(' + i +')';
    weeklyPoints = weeklyPoints + Number($(element + ' td.ismCol2').text());
    totalTransfers= totalTransfers + Number($(element + ' td.ismCol4').text());
    totalTransfersCosts= totalTransfersCosts +Number($(element + ' td.ismCol5').text());
    var obj = {
      title: $(element + ' td.ismCol1').text(),
      gameWeekPoints: Number($(element + ' td.ismCol2').text()),
      gameWeekRank: $(element + ' td.ismCol3').text(),
      transfersMade: Number($(element + ' td.ismCol4').text()),
      transfersCost: Number($(element + ' td.ismCol5').text()),
      teamValue: $(element + ' td.ismCol6').text(),
      overallPoints: Number($(element + ' td.ismCol7').text()),
      overallRank: $(element + ' td.ismCol8').text(),
      positionMovement: checkPositionMovement($(element + ' td.ismCol9 img').attr('src')),
      url: buildGameweekOverviewURL(managerID,i)
    }
    gameWeek.push(obj)
  }
  return {
    transfersMade: totalTransfers,
    transfersCost: totalTransfersCosts,
    averagePoints: (weeklyPoints/seasonHistoryLength).toFixed(0),
    overallPoints: gameWeek[seasonHistoryLength-1].overallPoints,
    overallRank: gameWeek[seasonHistoryLength-1].overallRank,
    positionMovement: gameWeek[seasonHistoryLength-1].positionMovement,
    teamValue:gameWeek[seasonHistoryLength-1].teamValue,
    thisSeason : gameWeek,
  }  
}

/**
 * @param  {string} managerID
 */
function buildTransferHistoryURL(managerID) {
  return config.URL + '/fantasy/manager/' + managerID + '/transfers';
}


function collectCareerHistory ($) {
  var careerHistory =[];
  var careerHistoryLength = $('.ismPrimaryNarrow section:nth-of-type(2) table tr').length -1;
  for (i = 1; i <= careerHistoryLength; i++) {
    var element = '.ismPrimaryNarrow section:nth-of-type(2) table tr:nth-child(' + i +')';
    var obj = {
        season: $(element + ' td.ismCol1').text(),
        points: $(element + ' td.ismCol2').text(),
        rank: $(element + ' td.ismCol3').text()
    }
    careerHistory.push(obj); 
  }
  return careerHistory;
}

/**
 * @param  {string} href
 */
function buildGameweekOverviewURL(managerID,gameweek) {
  return config.URL + '/fantasy/manager/' + managerID + '/gameweek/' + gameweek;
}


/**
 * @param  {string} imageURL
 */
function checkPositionMovement (imageURL) {

  switch (imageURL) {
    case "http://cdn.ismfg.net/static/img/new.png":
      return "-"
    case "http://cdn.ismfg.net/static/img/up.png":
      return "up"
    case "http://cdn.ismfg.net/static/img/down.png":
      return "down"
    default:
      return "-"
  }
}