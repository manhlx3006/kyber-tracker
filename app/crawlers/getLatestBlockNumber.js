const _               = require('lodash');
const async           = require('async');
const network         = require('../../config/network');
const ExSession       = require('sota-core').load('common/ExSession');
const logger          = require('sota-core').getLogger('getLatestBlockNumber');

module.exports = (callback, modelName = 'KyberTradeModel', startName = "BLOCK_START") => {
  const exSession = new ExSession();
  const model = exSession.getModel(modelName);

  model.findOne({
    orderBy: 'block_number DESC'
  }, (err, ret) => {
    exSession.destroy();
    if (err) {
      return callback(err);
    }

    const startBlock = process.env[startName];
    if(startBlock){
      logger.info(`Crawler start with custom block number ${startName}: ${startBlock}`);
      return callback(null, +startBlock)
    }

    if (!ret) {
      return callback(null, network.startBlockNumber);
    }

    return callback(null, ret.blockNumber);
  });
}
