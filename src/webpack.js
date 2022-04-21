"use strict";

const webpack = require("webpack");
const fs = require("fs");

function getModulesIterable(compilation, chunk) {
  return compilation.chunkGraph.getChunkModulesIterable(chunk);
}

function getModuleId(compilation, module) {
  return compilation.chunkGraph.getModuleId(module);
}

function buildManifest(_compiler, compilation) {
  let manifest = {};
  compilation.chunkGroups.forEach((chunkGroup) => {
    if (chunkGroup.isInitial()) {
      return;
    }

    chunkGroup.origins.forEach((chunkGroupOrigin) => {
      const { request } = chunkGroupOrigin;
      chunkGroup.chunks.forEach((chunk) => {
        chunk.files.forEach((file) => {
          if (
            !(
              (file.endsWith(".js") || file.endsWith(".css")) &&
              file.match(/^static\/(chunks|css)\//)
            )
          ) {
            return;
          }

          for (const module of getModulesIterable(compilation, chunk)) {
            let id = getModuleId(compilation, module);

            if (!manifest[request]) {
              manifest[request] = [];
            } // Avoid duplicate files

            if (
              manifest[request].some(
                (item) => item.id === id && item.file === file
              )
            ) {
              continue;
            }

            manifest[request].push({
              id,
              file,
            });
          }
        });
      });
    });
  });
  manifest = Object.keys(manifest)
    .sort() // eslint-disable-next-line no-sequences
    .reduce((a, c) => ((a[c] = manifest[c]), a), {});
  return manifest;
}

export class ReactLoadablePlugin {
  constructor(opts) {
    this.filename = opts.filename;
  }

  createAssets(compiler, compilation, assets) {
    const manifest = buildManifest(compiler, compilation); // @ts-ignore: TODO: remove when webpack 5 is stable

    fs.writeFile(this.filename, JSON.stringify(manifest), () => {});
    return assets;
  }

  apply(compiler) {
    compiler.hooks.make.tap("ReactLoadableManifest", (compilation) => {
      // @ts-ignore TODO: Remove ignore when webpack 5 is stable
      compilation.hooks.processAssets.tap(
        {
          name: "ReactLoadableManifest",
          // @ts-ignore TODO: Remove ignore when webpack 5 is stable
          stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        (assets) => {
          this.createAssets(compiler, compilation, assets);
        }
      );
    });
    return;
  }
}

function getBundles(manifest, moduleIds) {
  return moduleIds.reduce((bundles, moduleId) => {
    return bundles.concat(manifest[moduleId]);
  }, []);
}

exports.ReactLoadablePlugin = ReactLoadablePlugin;
exports.getBundles = getBundles;
