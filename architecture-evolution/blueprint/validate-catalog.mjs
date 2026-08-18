import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("./catalog.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: "catalog.js" });

const catalog = sandbox.window.ARCHITECTURE_CATALOG;
assert.ok(catalog, "Catalog must be assigned to window.ARCHITECTURE_CATALOG");
assert.ok(Array.isArray(catalog.layers) && catalog.layers.length > 0, "Catalog must contain layers");

const componentIds = new Set();
let optionCount = 0;

for (const layer of catalog.layers) {
  assert.match(layer.id, /^[a-z0-9-]+$/, `Invalid layer id: ${layer.id}`);
  assert.ok(layer.name && layer.description, `Layer ${layer.id} needs a name and description`);
  assert.ok(Array.isArray(layer.components) && layer.components.length > 0, `Layer ${layer.id} has no components`);

  for (const component of layer.components) {
    assert.match(component.id, /^[a-z0-9-]+$/, `Invalid component id: ${component.id}`);
    assert.ok(!componentIds.has(component.id), `Duplicate component id: ${component.id}`);
    componentIds.add(component.id);
    assert.ok(component.name && component.summary, `Component ${component.id} needs a name and summary`);
    assert.ok(Array.isArray(component.options) && component.options.length > 0, `Component ${component.id} has no options`);

    for (const option of component.options) {
      optionCount += 1;
      assert.ok(option.name && option.examples && option.note, `Incomplete option in ${component.id}`);
      for (const dimension of ["scale", "reliability", "latency"]) {
        assert.ok(
          Number.isInteger(option[dimension]) && option[dimension] >= 1 && option[dimension] <= 3,
          `${component.id}/${option.name} has invalid ${dimension}`
        );
      }
    }
  }
}

function eligibleCount(component, profile) {
  return component.options.filter(
    (option) =>
      option.scale >= profile.scale &&
      option.reliability >= profile.reliability &&
      option.latency >= profile.latency
  ).length;
}

const components = catalog.layers.flatMap((layer) => layer.components);
const defaultProfile = { scale: 2, reliability: 2, latency: 2 };
const strictProfile = { scale: 3, reliability: 3, latency: 3 };
const defaultViable = components.filter((component) => eligibleCount(component, defaultProfile) > 0).length;
const strictBlocked = components.filter((component) => eligibleCount(component, strictProfile) === 0).length;

assert.ok(defaultViable > 0, "Default profile must retain eligible options");
assert.ok(strictBlocked > 0, "Strict profile must exercise the greyed-out component state");

console.log(
  `Validated ${catalog.layers.length} layers, ${componentIds.size} components, and ${optionCount} technology options. ` +
    `Default viable: ${defaultViable}; strict-profile blocked: ${strictBlocked}.`
);
