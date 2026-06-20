// Popup logic: build the form, assemble the prompt, ask the service worker to call Gemini.

const els = {
  idea: document.getElementById("idea"),
  model: document.getElementById("model"),
  dialogue: document.getElementById("dialogue"),
  music: document.getElementById("music"),
  output: document.getElementById("output"),
  aspect: document.getElementById("aspect"),
  duration: document.getElementById("duration"),
  negative: document.getElementById("negative"),
  modifier: document.getElementById("modifier"),
  generate: document.getElementById("generateBtn"),
  status: document.getElementById("status"),
  resultWrap: document.getElementById("resultWrap"),
  result: document.getElementById("result"),
  copy: document.getElementById("copyBtn"),
  settings: document.getElementById("settingsBtn")
};

function fillSelect(select, items, valueFn = x => x, labelFn = x => x) {
  select.innerHTML = "";
  for (const item of items) {
    const opt = document.createElement("option");
    opt.value = valueFn(item);
    opt.textContent = labelFn(item);
    select.appendChild(opt);
  }
}

fillSelect(els.model, STYLE_CATEGORIES, c => c.name, c => `${c.icon} ${c.name}`);
fillSelect(els.dialogue, DIALOGUE_OPTIONS);
fillSelect(els.music, MUSIC_OPTIONS);
fillSelect(els.output, OUTPUT_TYPE_OPTIONS);
fillSelect(els.aspect, ASPECT_RATIO_OPTIONS);
fillSelect(els.duration, DURATION_OPTIONS);
els.duration.value = DURATION_OPTIONS[2]; // default 8s

// Restore last-used form state.
chrome.storage.local.get(["lastForm"]).then(({ lastForm }) => {
  if (!lastForm) return;
  if (lastForm.idea) els.idea.value = lastForm.idea;
  if (lastForm.model) els.model.value = lastForm.model;
  if (lastForm.dialogue) els.dialogue.value = lastForm.dialogue;
  if (lastForm.music) els.music.value = lastForm.music;
  if (lastForm.output) els.output.value = lastForm.output;
  if (lastForm.aspect) els.aspect.value = lastForm.aspect;
  if (lastForm.duration) els.duration.value = lastForm.duration;
  if (lastForm.negative) els.negative.value = lastForm.negative;
  if (lastForm.modifier) els.modifier.value = lastForm.modifier;
});

function setStatus(message, kind) {
  if (!message) { els.status.hidden = true; return; }
  els.status.hidden = false;
  els.status.textContent = message;
  els.status.className = "status" + (kind ? ` ${kind}` : "");
}

els.settings.addEventListener("click", () => chrome.runtime.openOptionsPage());

els.copy.addEventListener("click", async () => {
  await navigator.clipboard.writeText(els.result.textContent);
  els.copy.textContent = "Copied!";
  setTimeout(() => { els.copy.textContent = "Copy"; }, 1400);
});

els.generate.addEventListener("click", async () => {
  const roughInput = els.idea.value.trim();
  if (!roughInput) {
    setStatus("Describe your idea first.", "error");
    return;
  }

  const form = {
    idea: roughInput,
    model: els.model.value,
    dialogue: els.dialogue.value,
    music: els.music.value,
    output: els.output.value,
    aspect: els.aspect.value,
    duration: els.duration.value,
    negative: els.negative.value.trim(),
    modifier: els.modifier.value.trim()
  };
  chrome.storage.local.set({ lastForm: form });

  const payload = buildPromptPayload({
    roughInput,
    visualModel: form.model,
    dialogueMode: form.dialogue,
    musicMode: form.music,
    outputType: form.output,
    aspectRatio: form.aspect,
    duration: form.duration,
    negativePrompt: form.negative,
    presetModifier: form.modifier
  });

  els.generate.disabled = true;
  els.resultWrap.hidden = true;
  setStatus("Directing your scene…");

  try {
    const res = await chrome.runtime.sendMessage({ type: "improve", payload });
    if (!res) throw new Error("No response from background worker.");
    if (!res.ok) {
      if (/^SAFETY:/.test(res.error)) {
        setStatus(res.error.replace(/^SAFETY:\s*/, "Safety notice: "), "safety");
      } else {
        setStatus(res.error, "error");
      }
      return;
    }
    setStatus(null);
    els.result.textContent = res.text;
    els.resultWrap.hidden = false;
  } catch (err) {
    setStatus(err.message || "Generation failed.", "error");
  } finally {
    els.generate.disabled = false;
  }
});
