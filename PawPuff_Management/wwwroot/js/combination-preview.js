(() => {
  "use strict";

  const layerOrder = ["body", "accessory1", "accessory2", "accessory3"];
  const layerLabels = {
    body: "底圖",
    accessory1: "配件1",
    accessory2: "配件2",
    accessory3: "配件3"
  };

  function getOptionData(select) {
    const option = select?.selectedOptions?.[0];
    if (!option || !select.value) return null;
    return {
      value: select.value,
      name: option.dataset.name || option.textContent.trim(),
      image: option.dataset.image || option.dataset.line || select.value,
      mask: option.dataset.mask || "",
      sort: Number(option.dataset.sort) || 0
    };
  }

  function getColorData(select) {
    const option = select?.selectedOptions?.[0];
    if (!option || !select.value) return null;
    return {
      value: select.value,
      name: option.dataset.name || option.textContent.trim()
    };
  }

  function getLayerData(slot) {
    const itemSelect = document.querySelector('[data-preview-item="' + slot + '"]');
    const colorSelect = document.querySelector('[data-preview-color="' + slot + '"]');
    const item = getOptionData(itemSelect);
    if (!item) return null;

    return {
      slot,
      label: layerLabels[slot],
      item,
      color: getColorData(colorSelect),
      sort: slot === "body" ? 0 : item.sort
    };
  }

  function syncColorSelect(slot) {
    const itemSelect = document.querySelector('[data-preview-item="' + slot + '"]');
    const colorSelect = document.querySelector('[data-preview-color="' + slot + '"]');
    if (!itemSelect || !colorSelect) return;

    const enabled = Boolean(itemSelect.value);
    colorSelect.disabled = !enabled;
    if (!enabled) colorSelect.value = "";
  }

  function getSelectedLayers() {
    return layerOrder.map(getLayerData).filter(Boolean).sort((layerA, layerB) => layerA.sort - layerB.sort);
  }

  function createPreviewLayer(layer, index) {
    const element = document.createElement("div");
    const color = layer.color?.value || "rgba(255, 255, 255, .34)";
    element.className = "combination-preview-layer";
    element.dataset.layerKind = layer.slot === "body" ? "body" : "accessory";
    element.style.zIndex = String(index + 1);
    element.style.setProperty("--layer-offset", (index * 38 - 40) + "px");
    element.style.setProperty("--layer-color", color);
    element.innerHTML = [
      layer.label + "：" + layer.item.name,
      "<small>" + layer.item.image + (layer.color ? " / " + layer.color.name + " " + layer.color.value : "") + "</small>"
    ].join("");
    return element;
  }

  function createLayerChip(layer) {
    const chip = document.createElement("span");
    chip.className = "combination-layer-chip";

    const dot = document.createElement("span");
    dot.className = "combination-color-dot";
    if (layer.color) dot.style.setProperty("--dot-color", layer.color.value);

    const text = document.createElement("span");
    text.textContent = layer.label + " " + layer.item.image + (layer.color ? " / " + layer.color.name : "");

    chip.appendChild(dot);
    chip.appendChild(text);
    return chip;
  }

  function renderPreview() {
    const stack = document.getElementById("combinationLayerStack");
    const list = document.getElementById("combinationLayerList");
    const empty = document.getElementById("combinationPreviewEmpty");
    if (!stack || !list || !empty) return;

    const layers = getSelectedLayers();
    stack.innerHTML = "";
    list.innerHTML = "";
    empty.classList.toggle("d-none", layers.length > 0);

    layers.forEach((layer, index) => {
      stack.appendChild(createPreviewLayer(layer, index));
      list.appendChild(createLayerChip(layer));
    });
  }

  function bindEvents() {
    document.querySelectorAll("[data-preview-item]").forEach((select) => {
      select.addEventListener("change", () => {
        syncColorSelect(select.dataset.previewItem);
        renderPreview();
      });
    });

    document.querySelectorAll("[data-preview-color]").forEach((select) => {
      select.addEventListener("change", renderPreview);
    });
  }

  function init() {
    if (!document.getElementById("combinationPreviewView")) return;
    layerOrder.forEach(syncColorSelect);
    bindEvents();
    renderPreview();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
