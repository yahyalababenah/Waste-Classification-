// Waste Sorter Web App (COCO-SSD) + Web Serial (Arduino)
// Outputs: O = Organic, I = Inorganic, E = Empty

const $ = (id) => document.getElementById(id);

const video = $("video");
const overlay = $("overlay");
const ctx = overlay.getContext("2d");

const btnStart = $("btnStart");
const btnConnect = $("btnConnect");
const btnStop = $("btnStop");

const objLabelEl = $("objLabel");
const objConfEl  = $("objConf");
const decisionEl = $("decision");
const sentEl     = $("sent");

const detThr = $("detThr");
const detThrVal = $("detThrVal");
const stableN = $("stableN");
const cooldown = $("cooldown");
const unknownAsInorg = $("unknownAsInorg");

// ---------- Mapping ----------
// COCO-SSD labels are generic (bottle, banana, apple...)
// We'll map some obvious food-ish items to Organic, and common packaging items to Inorganic.
// Anything else: either treat as Inorganic (default) or treat as Empty (if you uncheck).

const ORGANIC_LABELS = new Set([
  "banana","apple","orange","broccoli","carrot","hot dog","pizza","donut","cake",
  "sandwich"
]);

const INORGANIC_LABELS = new Set([
  "bottle","cup","fork","knife","spoon","bowl","chair","laptop","cell phone",
  "remote","keyboard","mouse","tv","book","backpack","handbag","suitcase",
  "umbrella","sports ball","vase","scissors","toothbrush","tie"
]);

function mapLabelToOIE(label) {
  if (!label) return "E";
  if (ORGANIC_LABELS.has(label)) return "O";
  if (INORGANIC_LABELS.has(label)) return "I";
  return unknownAsInorg.checked ? "I" : "E";
}

// ---------- Smoothing / Stability ----------
let history = []; // array of "E|O|I"
let lastSent = null;
let lastSentAt = 0;

function majorityVote(arr) {
  const counts = {E:0,O:0,I:0};
  for (const x of arr) counts[x] = (counts[x]||0)+1;
  // pick max; prefer E when tie? We'll prefer non-empty to avoid missing objects.
  const order = ["I","O","E"];
  return order.sort((a,b)=>counts[b]-counts[a])[0];
}

function setDecisionUI(dec) {
  decisionEl.textContent = (dec === "O") ? "ORGANIC (O)" :
                           (dec === "I") ? "INORGANIC (I)" : "EMPTY (E)";
}

// ---------- Web Serial ----------
let port = null;
let writer = null;

async function connectSerial() {
  if (!("serial" in navigator)) {
    alert("Web Serial غير مدعوم في هذا المتصفح. استخدم Chrome/Edge على الكمبيوتر.");
    return;
  }
  port = await navigator.serial.requestPort();
  await port.open({ baudRate: 115200 });

  const textEncoder = new TextEncoderStream();
  textEncoder.readable.pipeTo(port.writable);
  writer = textEncoder.writable.getWriter();

  btnConnect.disabled = true;
  console.log("Serial connected");
}

async function sendToArduino(charOIE) {
  if (!writer) return;
  const now = Date.now();
  const cd = Number(cooldown.value) || 600;
  if (now - lastSentAt < cd) return;
  if (charOIE === lastSent) return;

  // send single char + newline
  await writer.write(charOIE + "\n");
  lastSent = charOIE;
  lastSentAt = now;
  sentEl.textContent = `${charOIE} @ ${new Date().toLocaleTimeString()}`;
}

// ---------- Camera + Model ----------
let stream = null;
let model = null;
let running = false;

async function startCamera() {
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment", width: {ideal: 640}, height: {ideal: 480} },
    audio: false
  });
  video.srcObject = stream;
  await video.play();

  // size canvas to video
  overlay.width = video.videoWidth || 640;
  overlay.height = video.videoHeight || 480;
}

async function loadModel() {
  // cocoSsd is a global loaded from CDN
  model = await cocoSsd.load({ base: "lite_mobilenet_v2" }); // lighter & faster
  console.log("Model loaded");
}

function drawDet(det) {
  ctx.clearRect(0,0,overlay.width,overlay.height);
  if (!det) return;

  const [x,y,w,h] = det.bbox;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(43,108,255,0.95)";
  ctx.strokeRect(x,y,w,h);

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x, y-24, Math.min(w, 260), 24);
  ctx.fillStyle = "#fff";
  ctx.font = "14px system-ui";
  ctx.fillText(`${det.class} ${(det.score*100).toFixed(1)}%`, x+6, y-7);
}

async function tick() {
  if (!running) return;

  const thr = Number(detThr.value);
  detThrVal.textContent = thr.toFixed(2);

  let best = null;
  try {
    const preds = await model.detect(video);
    for (const p of preds) {
      if (p.score >= thr && (!best || p.score > best.score)) best = p;
    }
  } catch (e) {
    console.warn("detect error", e);
  }

  if (best) {
    objLabelEl.textContent = best.class;
    objConfEl.textContent = best.score.toFixed(3);
    drawDet(best);
  } else {
    objLabelEl.textContent = "-";
    objConfEl.textContent = "-";
    drawDet(null);
  }

  const dec = mapLabelToOIE(best ? best.class : null);

  // Update history and decide stable output
  const N = Math.max(3, Math.min(30, Number(stableN.value) || 10));
  history.push(dec);
  if (history.length > N) history.shift();

  const stable = majorityVote(history);
  setDecisionUI(stable);

  await sendToArduino(stable);

  // run again
  requestAnimationFrame(tick);
}

async function startAll() {
  btnStart.disabled = true;
  btnStop.disabled = false;

  await startCamera();
  await loadModel();

  btnConnect.disabled = false;

  running = true;
  history = [];
  lastSent = null;
  lastSentAt = 0;

  requestAnimationFrame(tick);
}

async function stopAll() {
  running = false;
  btnStart.disabled = false;
  btnStop.disabled = true;
  btnConnect.disabled = true;

  ctx.clearRect(0,0,overlay.width,overlay.height);

  if (writer) {
    try { await writer.releaseLock(); } catch {}
    writer = null;
  }
  if (port) {
    try { await port.close(); } catch {}
    port = null;
  }
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
}

btnStart.addEventListener("click", startAll);
btnStop.addEventListener("click", stopAll);
btnConnect.addEventListener("click", connectSerial);

detThr.addEventListener("input", () => detThrVal.textContent = Number(detThr.value).toFixed(2));
detThrVal.textContent = Number(detThr.value).toFixed(2);

// Helpful message
if (!navigator.mediaDevices?.getUserMedia) {
  alert("المتصفح لا يدعم تشغيل الكاميرا. استخدم Chrome/Edge على كمبيوتر.");
}
