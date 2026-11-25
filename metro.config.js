const { getDefaultConfig } = require('expo/metro-config');
const { totalmem } = require('node:os');

const path = require('node:path');

const config = getDefaultConfig(__dirname);
const backendPath = path
  .resolve(__dirname, 'backend')
  .split(path.sep)
  .map((part) => part.replace(/[.*+?^\u0024{}()|[\]\\]/g, '\\$&'))
  .join('[/\\\\]');
config.resolver.blockList = [
  ...[config.resolver.blockList].flat().filter(Boolean),
  new RegExp('^' + backendPath + '(?:[/\\\\]|$)'),
];

// Keep Metro's file-map and transform pools within this host's memory budget.
if (process.env.HW_PROFILE === 'LAPTOP_4GB_HDD' || totalmem() <= 6 * 1024 ** 3)
  config.maxWorkers = 1;

module.exports = config;
