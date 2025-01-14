import webpack, { sources } from "webpack";

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
    const manifest = buildManifest(compiler, compilation);

    assets[this.filename] = new sources.RawSource(
      JSON.stringify(manifest, null, 2)
    );
    return assets;
  }

  apply(compiler) {
    compiler.hooks.make.tap("ReactLoadableManifest", (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: "ReactLoadableManifest",
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

export function getBundles(manifest, moduleIds) {
  return moduleIds.reduce((bundles, moduleId) => {
    return bundles.concat(manifest[moduleId]);
  }, []);
}
