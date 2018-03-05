
/**
 * This file is auto-generated
 * Please don't update it manually
 * Run command `npm run schema` to re-generate this
 */

 module.exports = { KyberTradeModel: 
   { block_number: { type: 'number', length: 11 },
     block_hash: { type: 'string', length: 300 },
     block_timestamp: { type: 'number', length: 20 },
     tx: { type: 'string', length: 300 },
     maker_address: { type: 'string', length: 765 },
     maker_token_address: { type: 'string', length: 765 },
     maker_token_symbol: { type: 'string', length: 30 },
     maker_token_amount: { type: 'string', length: 300 },
     taker_address: { type: 'string', length: 765 },
     taker_token_address: { type: 'string', length: 765 },
     taker_token_symbol: { type: 'string', length: 30 },
     taker_token_amount: { type: 'string', length: 300 },
     gas_limit: { type: 'number', length: 20 },
     gas_price: { type: 'number', length: 20 },
     gas_used: { type: 'number', length: 20 },
     maker_fee: { type: 'string', length: 765 },
     taker_fee: { type: 'string', length: 765 },
     burn_fees: { type: 'string', length: 765 },
     reserve_address: { type: 'string', length: 765 },
     minute_seq: { type: 'number', length: 11 },
     hour_seq: { type: 'number', length: 11 },
     day_seq: { type: 'number', length: 11 },
     volume_eth: { type: 'string', length: 150 },
     volume_usd: { type: 'string', length: 150 },
     token_symbol: { type: 'string', length: 150 },
     token_amount: { type: 'string', length: 150 } },
  UserModel: 
   { username: { type: 'string', length: 120 },
     avatar_url: { type: 'string', length: 768 },
     email: { type: 'string', length: 120 },
     password: { type: 'string', length: 384 },
     full_name: { type: 'string', length: 135 } },
  VolumeHourModel: 
   { timestamp: { type: 'number', length: 20 },
     value_eth: { type: 'number', length: 20 },
     value_usd: { type: 'number', length: 20 } } }