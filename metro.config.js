const { getDefaultConfig } = require('expo/metro-config');
const { totalmem } = require('node:os');

const config = getDefaultConfig(__dirname);

// Keep Metro's file-map and transform pools within this host's memory budget.
if (totalmem() <= 4 * 1024 ** 3) config.maxWorkers = 1;

module.exports = config;
