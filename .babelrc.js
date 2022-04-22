module.exports = function (api) {
  api.cache(true);

  const presets = [
    [
      "@babel/preset-env",
      {
        loose: true,
      },
    ],
    "@babel/preset-react",
  ];

  return {
    presets,
  };
};
