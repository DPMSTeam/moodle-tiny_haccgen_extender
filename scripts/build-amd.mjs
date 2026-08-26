/**
 * Build Moodle AMD modules from amd/src → amd/build without a full Moodle install.
 *
 * Usage (from plugin root):
 *   npm run build-amd
 *   npm run build-amd -- steps/videoGenerationTemplate.js
 */
import { rollup } from 'rollup';
import babel from '@rollup/plugin-babel';
import { minify } from 'terser';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(pluginRoot, 'amd', 'src');
const buildRoot = path.join(pluginRoot, 'amd', 'build');
const component = 'tiny_haccgen_extender';

const collectJsFiles = (dir, base = dir) => {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectJsFiles(full, base));
    } else if (entry.name.endsWith('.js')) {
      out.push(path.relative(base, full).replace(/\\/g, '/'));
    }
  }
  return out;
};

const toModuleName = (relativePath) => {
  const withoutExt = relativePath.replace(/\.js$/, '');
  return `${component}/${withoutExt}`;
};

const isExternal = (id) => {
  if (id.startsWith('core/')) {
    return true;
  }
  if (id.startsWith(`${component}/`)) {
    return true;
  }
  return false;
};

const toModuleNameFromSrcPath = (absoluteOrRelativePath) => {
  const normalized = absoluteOrRelativePath.replace(/\\/g, '/');
  const marker = '/amd/src/';
  const idx = normalized.indexOf(marker);
  const relative = idx !== -1
    ? normalized.slice(idx + marker.length)
    : normalized.replace(/^\.\//, '');
  return `${component}/${relative.replace(/\.js$/, '')}`;
};

const resolveAmdPath = (relativePath, importId) => {
  if (!importId.startsWith('.')) {
    if (importId.includes('/amd/src/') || importId.includes('\\amd\\src\\')) {
      return toModuleNameFromSrcPath(importId);
    }
    return importId;
  }
  const dir = path.posix.dirname(relativePath.replace(/\\/g, '/'));
  const joined = dir === '.'
    ? importId
    : path.posix.join(dir, importId);
  const normalized = path.posix.normalize(joined).replace(/\.js$/, '');
  return `${component}/${normalized}`;
};

const buildOne = async (relativePath) => {
  const moduleName = toModuleName(relativePath);
  const inputFile = path.join(srcRoot, relativePath);
  const outputFile = path.join(buildRoot, relativePath.replace(/\.js$/, '.min.js'));
  const outputDir = path.dirname(outputFile);

  fs.mkdirSync(outputDir, { recursive: true });

  const source = fs.readFileSync(inputFile, 'utf8');
  if (/\bdefine\s*\(/.test(source) && !source.includes('export ')) {
    throw new Error(
      `${relativePath} uses legacy define() in amd/src. Convert to ES modules (import/export) before building.`
    );
  }

  const bundle = await rollup({
    input: inputFile,
    external: (id) => isExternal(id) || id.startsWith('.'),
    plugins: [
      babel({
        babelHelpers: 'bundled',
        presets: [['@babel/preset-env', { modules: false }]],
      }),
    ],
  });

  // Moodle's Tiny loader does import('tiny_haccgen_extender/plugin') and expects the AMD
  // factory to *return* a Promise that resolves to [pluginName, Configuration].
  // Named exports compile to { default: Promise }, so Moodle drops the plugin from the
  // toolbar (module still loads, which is why [haccgen-blob] appears with no icon).
  const { output } = await bundle.generate({
    format: 'amd',
    amd: { id: moduleName },
    exports: relativePath === 'plugin.js' ? 'default' : 'named',
    sourcemap: true,
    paths: (id) => resolveAmdPath(relativePath, id),
  });

  let code = output[0].code;
  if (/(^|[^a-zA-Z0-9_])define\s*\(\s*\[/.test(code) || /define\s*\(\s*function/.test(code.replace(/^define\([^)]+\),/, ''))) {
    throw new Error(`${relativePath} produced a nested/anonymous define() in ${path.basename(outputFile)}`);
  }

  const minified = await minify(code, {
    sourceMap: {
      filename: path.basename(outputFile),
      url: path.basename(outputFile) + '.map',
    },
  });

  // Rollup may emit "./tiny_haccgen_extender/foo" — RequireJS needs bare module ids.
  minified.code = minified.code.replace(/"\.\/(tiny_haccgen_extender\/[^"]+)"/g, '"$1"');

  fs.writeFileSync(outputFile, minified.code);
  if (minified.map) {
    fs.writeFileSync(outputFile + '.map', minified.map);
  }

  console.log(`Built ${relativePath} → amd/build/${relativePath.replace(/\.js$/, '.min.js')}`);
};

const main = async () => {
  const args = process.argv.slice(2);
  const targets = args.length
    ? args.map((p) => p.replace(/^amd\/src\//, ''))
    : collectJsFiles(srcRoot);

  for (const relativePath of targets) {
    await buildOne(relativePath);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
