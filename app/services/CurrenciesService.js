/* eslint no-multi-spaces: ["error", { exceptions: { "VariableDeclarator": true } }] */
const _ = require('lodash');
const async = require('async');
const util = require('util');
const BigNumber = require('bignumber.js');
const network = require('../../config/network');
const Const = require('../common/Const');
const helper = require('../common/Utils');
const Utils = require('sota-core').load('util/Utils');
const BaseService = require('sota-core').load('service/BaseService');
const LocalCache = require('sota-core').load('cache/foundation/LocalCache');
const logger = require('sota-core').getLogger('CurrenciesService');

const tokens = network.tokens;

module.exports = BaseService.extends({
  classname: 'CurrenciesService',

  getSupportedTokens: function (path, callback) {
    if(!tokens) return callback(null, []);

    const ret = [];
    Object.keys(tokens).forEach(symbol => {
      if (helper.shouldShowToken(symbol)) {
        const token = tokens[symbol];
        const id = token.cmcName || token.symbol || symbol;
        ret.push({
          symbol: id,
          name: token.name,
          decimals: token.decimal,
          contractAddress: token.address,
          iconID: id.toLowerCase();
        });
      }
    })

    callback(null, ret);
  },

  getConvertiblePairs: function (callback) {
    if(!tokens) return callback(null, {});

    let pairs = {}

    Object.keys(tokens).map(token => {
      // if((token.toUpperCase() !== "ETH") && !tokens[token].hidden){
      if((token.toUpperCase() !== "ETH") && helper.shouldShowToken(token)){
        const cmcName = tokens[token].cmcSymbol || token;
        pairs["ETH_" + cmcName] = (asyncCallback) => this._getCurrencyInfo({
          token: token,
          fromCurrencyCode: "ETH"
        }, asyncCallback)
      }
    })
    if(pairs && Object.keys(pairs).length){
      async.auto(
        pairs,
        (err, ret) => {
          //let arrayBaseVolume = Object.keys(ret).map( pairKey => ret[pairKey].baseVolume)
          //let sum = helper.sumBig(arrayBaseVolume, 0)
          return callback(null, ret);
        })
    } else {
      return callback(null, {});
    }
    
  },

  _getCurrencyInfo: function (options, callback) {
    if(!options.token || !tokens[options.token]){
      return callback("token not supported")
    }

    if(!options.fromCurrencyCode || !tokens[options.fromCurrencyCode]){
      return callback("base not supported")
    }

    let tokenSymbol = options.token
    let base = options.fromCurrencyCode
    let tokenData = tokens[tokenSymbol]
    let baseTokenData = tokens[base]

    const KyberTradeModel = this.getModel('KyberTradeModel');
    const CMCService = this.getService('CMCService');
    const nowInSeconds = Utils.nowInSeconds();
    const DAY_IN_SECONDS = 24 * 60 * 60;

    async.auto({
      // volumeBuy: (next) => {
      //   KyberTradeModel.sum('taker_total_usd', {
      //     where: 'taker_token_symbol = ? AND block_timestamp > ?',
      //     params: [tokenSymbol, nowInSeconds - DAY_IN_SECONDS],
      //   }, next);
      // },
      // volumeSell: (next) => {
      //   KyberTradeModel.sum('maker_total_usd', {
      //     where: 'maker_token_symbol = ? AND block_timestamp > ?',
      //     params: [tokenSymbol, nowInSeconds - DAY_IN_SECONDS],
      //   }, next);
      // },
      baseVolume: (next) => {
        KyberTradeModel.sum('volume_eth', {
          where: 'block_timestamp > ? AND ((maker_token_symbol = ? AND taker_token_symbol = ?) OR (maker_token_symbol = ? AND taker_token_symbol = ?))',
          params: [nowInSeconds - DAY_IN_SECONDS, tokenSymbol, base, base, tokenSymbol],
        }, next);
      },
      quoteVolumeTaker: (next) => {
        KyberTradeModel.sum('taker_token_amount', {
          where: 'block_timestamp > ? AND maker_token_symbol = ? AND taker_token_symbol = ?',
          params: [nowInSeconds - DAY_IN_SECONDS, base, tokenSymbol],
        }, next);
      },
      quoteVolumeMaker: (next) => {
        KyberTradeModel.sum('maker_token_amount', {
          where: 'block_timestamp > ? AND maker_token_symbol = ? AND taker_token_symbol = ?',
          params: [nowInSeconds - DAY_IN_SECONDS, tokenSymbol, base],
        }, next);
      },
      price: (next) => {
        CMCService.getCurrentRate(tokenSymbol, base, next);
      },
      lastTrade: (next) => {
        KyberTradeModel.findOne({
          where: '(taker_token_symbol = ? and maker_token_symbol = ?) or (taker_token_symbol = ? and maker_token_symbol = ?)',
          params: [tokenSymbol, base, base, tokenSymbol],
          orderBy: 'block_timestamp DESC',
        }, next)
      }
    }, (err, ret) => {
      if (err) {
        return callback(err);
      }

      let lastPrice = 0
      if(ret.lastTrade){
        let bigMakerAmount = ret.lastTrade.makerTokenAmount ? new BigNumber(ret.lastTrade.makerTokenAmount) : new BigNumber(0)
        let bigTakerAmount = ret.lastTrade.takerTokenAmount ? new BigNumber(ret.lastTrade.takerTokenAmount) : new BigNumber(0)

        if(ret.lastTrade.takerTokenSymbol == base && !bigMakerAmount.isZero()){
          let amountTaker = bigTakerAmount.div(Math.pow(10, baseTokenData.decimal))
          let amountMaker = bigMakerAmount.div(Math.pow(10, tokenData.decimal))
          lastPrice = amountTaker.div(amountMaker).toNumber()
        }
        else if(ret.lastTrade.makerTokenSymbol == base && !bigTakerAmount.isZero()){
          let amountMaker = bigMakerAmount.div(Math.pow(10, baseTokenData.decimal))
          let amountTaker = bigTakerAmount.div(Math.pow(10, tokenData.decimal))          
          lastPrice = amountMaker.div(amountTaker).toNumber()
        }

      }

      // const baseVolume = new BigNumber(ret.baseVolume.toString()).div(Math.pow(10, baseTokenData.decimal)).toNumber()
      let bigQuoteVolumeTaker = ret.quoteVolumeTaker ? new BigNumber(ret.quoteVolumeTaker.toString()) : new BigNumber(0)
      let bigQuoteVolumeMaker = ret.quoteVolumeMaker ? new BigNumber(ret.quoteVolumeMaker.toString()) : new BigNumber(0)
      const quoteVolume = bigQuoteVolumeTaker.plus(bigQuoteVolumeMaker).div(Math.pow(10, tokenData.decimal)).toNumber()
      const currentPrice = ret.price ? new BigNumber(ret.price.rate.toString()).div(Math.pow(10, baseTokenData.decimal)) : null
      return callback( null , {
        "symbol": tokenData.cmcSymbol || tokenData.symbol,
        "name": tokenData.name,
        // "code": tokenData.symbol,
        "contractAddress": tokenData.address,
        "decimals": tokenData.decimal,
        currentPrice: currentPrice.toNumber(),
        lastPrice: lastPrice,
        lastTimestamp: ret.lastTrade ? ret.lastTrade.blockTimestamp : null,
        baseVolume: ret.baseVolume,
        quoteVolume: quoteVolume
      })
    })
  },

});