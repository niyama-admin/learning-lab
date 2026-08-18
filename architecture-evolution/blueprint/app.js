(function () {
  "use strict";

  const catalog = window.ARCHITECTURE_CATALOG;
  const layerContainer = document.getElementById("architecture-layers");
  const detailContainer = document.getElementById("component-detail");
  const scaleFilter = document.getElementById("scale-filter");
  const reliabilityFilter = document.getElementById("reliability-filter");
  const latencyFilter = document.getElementById("latency-filter");
  const resetButton = document.getElementById("reset-filters");
  const filterStatus = document.getElementById("filter-status");

  let selectedComponentId = "api-backend";

  const allComponents = catalog.layers.flatMap((layer) =>
    layer.components.map((component) => ({ ...component, layerName: layer.name }))
  );

  function selectedProfile() {
    return {
      scale: Number(scaleFilter.value),
      reliability: Number(reliabilityFilter.value),
      latency: Number(latencyFilter.value)
    };
  }

  function rejectionReasons(option, profile) {
    const reasons = [];
    if (option.scale < profile.scale) {
      reasons.push(`Scale band stops at ${catalog.profiles.scale[option.scale - 1]}`);
    }
    if (option.reliability < profile.reliability) {
      reasons.push(`Reliability band stops at ${catalog.profiles.reliability[option.reliability - 1]}`);
    }
    if (option.latency < profile.latency) {
      reasons.push(`Latency band stops at ${catalog.profiles.latency[option.latency - 1]}`);
    }
    return reasons;
  }

  function eligibleOptions(component, profile) {
    return component.options.filter((option) => rejectionReasons(option, profile).length === 0);
  }

  function renderBlueprint() {
    const profile = selectedProfile();
    layerContainer.replaceChildren();

    catalog.layers.forEach((layer) => {
      const layerElement = document.createElement("section");
      layerElement.className = "architecture-layer";
      layerElement.setAttribute("aria-labelledby", `layer-${layer.id}`);

      const label = document.createElement("div");
      label.className = "layer-label";
      label.innerHTML = `<strong id="layer-${layer.id}">${layer.name}</strong><span>${layer.description}</span>`;

      const components = document.createElement("div");
      components.className = "layer-components";

      layer.components.forEach((component) => {
        const eligible = eligibleOptions(component, profile);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "component-node";
        button.dataset.componentId = component.id;
        button.dataset.state = eligible.length ? "eligible" : "blocked";
        button.setAttribute("aria-pressed", String(component.id === selectedComponentId));
        button.setAttribute(
          "aria-label",
          `${component.name}: ${eligible.length} of ${component.options.length} options eligible`
        );
        button.innerHTML = `<span class="component-name">${component.name}</span><span class="component-count">${eligible.length} of ${component.options.length} eligible</span>`;
        button.addEventListener("click", () => {
          selectedComponentId = component.id;
          render();
        });
        components.appendChild(button);
      });

      layerElement.append(label, components);
      layerContainer.appendChild(layerElement);
    });

    const viableComponents = allComponents.filter((component) => eligibleOptions(component, profile).length > 0).length;
    filterStatus.textContent = `${viableComponents} of ${allComponents.length} components retain at least one option`;
  }

  function optionElement(option, profile) {
    const reasons = rejectionReasons(option, profile);
    const article = document.createElement("article");
    article.className = "technology-option";
    article.dataset.state = reasons.length ? "blocked" : "eligible";

    const reasonMarkup = reasons.length
      ? `<ul class="reasons">${reasons.map((reason) => `<li>${reason}</li>`).join("")}</ul>`
      : "";

    article.innerHTML = `
      <div class="option-topline">
        <div>
          <h3>${option.name}</h3>
          <p class="option-examples">${option.examples}</p>
        </div>
        <span class="status-tag">${reasons.length ? "Filtered out" : "Eligible"}</span>
      </div>
      <div class="capability-bands" aria-label="Illustrative maximum capability bands">
        <span>Scale: ${catalog.profiles.scale[option.scale - 1]}</span>
        <span>Reliability: ${catalog.profiles.reliability[option.reliability - 1]}</span>
        <span>Latency: ${catalog.profiles.latency[option.latency - 1]}</span>
      </div>
      <p class="option-note">${option.note}</p>
      ${reasonMarkup}
    `;
    return article;
  }

  function renderDetail() {
    const profile = selectedProfile();
    const component = allComponents.find((item) => item.id === selectedComponentId);

    if (!component) {
      detailContainer.innerHTML = `<div class="empty-state"><h2 id="detail-title">Select a component</h2><p>Inspect its eligible and filtered technology patterns.</p></div>`;
      return;
    }

    const eligible = eligibleOptions(component, profile);
    detailContainer.replaceChildren();

    const header = document.createElement("div");
    header.className = "detail-header";
    header.innerHTML = `
      <p class="eyebrow">${component.layerName}</p>
      <h2 id="detail-title">${component.name}</h2>
      <p class="component-summary">${component.summary}</p>
      <p class="eligibility-summary${eligible.length ? "" : " none"}">${eligible.length} of ${component.options.length} options pass the selected gates</p>
    `;

    const list = document.createElement("div");
    list.className = "option-list";
    component.options.forEach((option) => list.appendChild(optionElement(option, profile)));
    detailContainer.append(header, list);
  }

  function render() {
    renderBlueprint();
    renderDetail();
  }

  [scaleFilter, reliabilityFilter, latencyFilter].forEach((filter) => {
    filter.addEventListener("change", render);
  });

  resetButton.addEventListener("click", () => {
    scaleFilter.value = "2";
    reliabilityFilter.value = "2";
    latencyFilter.value = "2";
    render();
  });

  render();
})();
