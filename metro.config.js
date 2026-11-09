const { getDefaultConfig } = require('expo/metro-config');
const { totalmem } = require('node:os');

const config = getDefaultConfig(__dirname);

// Keep Metro's file-map and transform pools within this host's memory budget.
if (process.env.HW_PROFILE === 'LAPTOP_4GB_HDD' || totalmem() <= 6 * 1024 ** 3)
  config.maxWorkers = 1;

module.exports = config;
