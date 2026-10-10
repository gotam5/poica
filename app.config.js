// Adds the known point-card apps' URL schemes so Poica may check which ones are installed.
const catalog = require('./src/appCatalog.json');

module.exports = ({ config }) => {
  const schemes = [...new Set(catalog.apps.flatMap((a) => a.schemes.map((sc) => sc.split('://')[0])))].slice(0, 50);
  return {
    ...config,
    ios: {
      ...config.ios,
      infoPlist: { ...(config.ios?.infoPlist || {}), LSApplicationQueriesSchemes: ['shortcuts', ...schemes].slice(0, 50) },
    },
  };
};
