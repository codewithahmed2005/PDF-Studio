// Frontend app.js - Calls BACKEND via API_BASE from config.js
// app.js - PDF Studio - Full English Version
// Edit PDF Text + Zoom 50% - 300%

// ---------- TABS ----------
document.querySelectorAll('.tab').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('section.card').forEach(s => s.style.display = 'none');
    document.getElementById('tab-' + btn.dataset.tab).style.display = 'block';
  };
});

// ---------- WORD TO PDF ----------
let wordFile = null;
const wordInput = document.getElementById('wordFile');
if (wordInput) wordInput.onchange = e => {
  wordFile = e.target.files[0];
  document.getElementById('wordName').textContent = wordFile ? wordFile.name : '';
  document.getElementById('wordBtn').disabled = !wordFile;
};
const wordBtn = document.getElementById('wordBtn');
if (wordBtn) wordBtn.onclick = async () => {
  const fd = new FormData();
  fd.append('file', wordFile);
  fd.append('pageSize', document.getElementById('wordPageSize').value);
  fd.append('fontSize', document.getElementById('wordFont').value);
  document.getElementById('wordMsg').textContent = 'Converting...';
  const res = await fetch(API_BASE + '/api/word-to-pdf', { method: 'POST', body: fd });
  if (!res.ok) { document.getElementById('wordMsg').textContent = 'Error: ' + (await res.json()).error; return; }
  const blob = await res.blob();
  downloadBlob(blob, 'word-to-pdf.pdf');
  document.getElementById('wordMsg').textContent = '✅ Done!';
  if (window.DirectAds) DirectAds.onPdfConverted();
};

// ---------- IMAGE TO PDF ----------
let imgFiles = [];
const imgInput = document.getElementById('imgFiles');
if (imgInput) imgInput.onchange = e => {
  imgFiles = Array.from(e.target.files);
  const grid = document.getElementById('imgGrid'); grid.innerHTML = '';
  imgFiles.forEach(f => {
    const url = URL.createObjectURL(f);
    const img = document.createElement('img'); img.src = url; img.style.cssText = 'width:100px;height:100px;object-fit:cover;border-radius:8px;';
    grid.appendChild(img);
  });
  document.getElementById('imgBtn').disabled = !imgFiles.length;
};
const imgBtn = document.getElementById('imgBtn');
if (imgBtn) imgBtn.onclick = async () => {
  const fd = new FormData();
  imgFiles.forEach(f => fd.append('images', f));
  fd.append('orientation', document.getElementById('imgOrient').value);
  fd.append('fit', document.getElementById('imgFit').value);
  const res = await fetch(API_BASE + '/api/image-to-pdf', { method: 'POST', body: fd });
  if (!res.ok) { alert('Error'); return; }
  downloadBlob(await res.blob(), 'images-to-pdf.pdf');
  if (window.DirectAds) DirectAds.onPdfConverted();
};

// ---------- MERGE ----------
let mergeFiles = [];
const mergeInput = document.getElementById('mergeFiles');
if (mergeInput) mergeInput.onchange = e => {
  mergeFiles = Array.from(e.target.files);
  document.getElementById('mergeCount').textContent = mergeFiles.length + ' files';
  document.getElementById('mergeBtn').disabled = !mergeFiles.length;
  const list = document.getElementById('mergeList'); list.innerHTML = '';
  mergeFiles.forEach(f => { const d = document.createElement('div'); d.textContent = '📄 ' + f.name; list.appendChild(d); });
};
const mergeBtn = document.getElementById('mergeBtn');
if (mergeBtn) mergeBtn.onclick = async () => {
  const fd = new FormData();
  mergeFiles.forEach(f => fd.append('files', f));
  const res = await fetch(API_BASE + '/api/merge-pdf', { method: 'POST', body: fd });
  if (!res.ok) { alert('Merge error'); return; }
  downloadBlob(await res.blob(), 'merged.pdf');
};

// ---------- EDIT PDF TEXT + ZOOM ==========
let editFile = null;
let editPdfDoc = null;
let editPagesData = [];
let editZoom = 1.0;
const BASE_SCALE = 1.2;

const editInput = document.getElementById('editFile');
if (editInput) editInput.onchange = async e => {
  editFile = e.target.files[0];
  if (!editFile) return;
  document.getElementById('editMsg').textContent = 'Loading PDF...';
  const buf = await editFile.arrayBuffer();
  editPdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
  editPagesData = [];
  for (let i = 0; i < editPdfDoc.numPages; i++) {
    const page = await editPdfDoc.getPage(i + 1);
    const vp1 = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const items = [];
    for (const it of textContent.items) {
      if (!it.str || !it.str.trim()) continue;
      const tx = it.transform;
      const fontSize = Math.hypot(tx[2], tx[3]) || 12;
      const pdfX = tx[4];
      const pdfY = tx[5];
      const width = it.width || (it.str.length * fontSize * 0.6);
      const height = it.height || fontSize;
      items.push({ pdfX, pdfY, width, height, fontSize, original: it.str, newText: it.str });
    }
    editPagesData.push({ page, pdfWidth: vp1.width, pdfHeight: vp1.height, items });
  }
  await renderEditPages();
  document.getElementById('editBtn').disabled = false;
  document.getElementById('editMsg').textContent = `✅ ${editPdfDoc.numPages} page(s) loaded. Click any text to edit. Use Zoom + / - to enlarge or shrink the page.`;
  updateEditCount();
};

function getRenderScale() { return BASE_SCALE * editZoom; }

async function renderEditPages() {
  const container = document.getElementById('editPages');
  container.innerHTML = '';
  const scale = getRenderScale();
  for (let pi = 0; pi < editPagesData.length; pi++) {
    const data = editPagesData[pi];
    const viewport = data.page.getViewport({ scale });
    const wrap = document.createElement('div');
    wrap.className = 'pdf-page-wrap';
    wrap.style.width = viewport.width + 'px';
    wrap.style.height = viewport.height + 'px';
    wrap.innerHTML = `<span class="page-label">Page ${pi + 1} • Zoom ${Math.round(editZoom * 100)}%</span>`;
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width; canvas.height = viewport.height;
    wrap.appendChild(canvas);
    container.appendChild(wrap);
    const ctx = canvas.getContext('2d');
    await data.page.render({ canvasContext: ctx, viewport }).promise;
    for (const item of data.items) {
      const el = document.createElement('div');
      el.className = 'edit-text' + (item.newText !== item.original ? ' edited' : '');
      el.contentEditable = true;
      el.spellcheck = false;
      el.textContent = item.newText;
      const left = item.pdfX * scale;
      const top = (data.pdfHeight - item.pdfY - item.height) * scale;
      const w = item.width * scale;
      const h = item.height * scale;
      el.style.left = left + 'px';
      el.style.top = top + 'px';
      el.style.width = (w + 4) + 'px';
      el.style.height = (h + 4) + 'px';
      el.style.fontSize = (item.fontSize * scale) + 'px';
      el.addEventListener('input', () => {
        item.newText = el.textContent;
        el.classList.toggle('edited', item.newText !== item.original);
        updateEditCount();
      });
      el.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); el.blur(); } });
      wrap.appendChild(el);
      item.el = el;
    }
  }
}

function updateEditCount() {
  let count = 0;
  editPagesData.forEach(p => p.items.forEach(it => { if (it.newText !== it.original) count++; }));
  document.getElementById('editCount').textContent = count ? `✏️ ${count} text edited` : '';
}

function setZoom(newZoom, { rerender = true } = {}) {
  editZoom = Math.min(3, Math.max(0.5, newZoom));
  const pct = Math.round(editZoom * 100);
  const label = document.getElementById('zoomLabel');
  if (label) label.textContent = pct + '%';
  const slider = document.getElementById('zoomSlider');
  if (slider) slider.value = pct;
  const outBtn = document.getElementById('zoomOut');
  const inBtn = document.getElementById('zoomIn');
  if (outBtn) outBtn.disabled = editZoom <= 0.5;
  if (inBtn) inBtn.disabled = editZoom >= 3;
  if (rerender && editPdfDoc) renderEditPages();
}

document.getElementById('zoomIn').onclick = () => setZoom(editZoom + 0.25);
document.getElementById('zoomOut').onclick = () => setZoom(editZoom - 0.25);
document.getElementById('zoomReset').onclick = () => setZoom(1.0);
document.getElementById('zoomFit').onclick = () => {
  const container = document.getElementById('editPages');
  if (!editPagesData.length) return;
  const avail = container.clientWidth - 32;
  const pdfW = editPagesData[0].pdfWidth;
  const neededScale = avail / pdfW;
  const neededZoom = neededScale / BASE_SCALE;
  setZoom(neededZoom);
};
document.getElementById('zoomSlider').oninput = e => setZoom(parseInt(e.target.value, 10) / 100);

document.addEventListener('keydown', e => {
  if (!e.ctrlKey && !e.metaKey) return;
  if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom(editZoom + 0.25); }
  if (e.key === '-') { e.preventDefault(); setZoom(editZoom - 0.25); }
  if (e.key === '0') { e.preventDefault(); setZoom(1.0); }
});

const editPagesEl = document.getElementById('editPages');
if (editPagesEl) editPagesEl.addEventListener('wheel', e => {
  if (!e.ctrlKey && !e.metaKey) return;
  e.preventDefault();
  if (e.deltaY < 0) setZoom(editZoom + 0.1);
  else setZoom(editZoom - 0.1);
}, { passive: false });

setZoom(1.0, { rerender: false });

const editBtn = document.getElementById('editBtn');
if (editBtn) editBtn.onclick = async () => {
  const edits = [];
  editPagesData.forEach((p, pageIndex) => {
    p.items.forEach(item => {
      if (item.newText !== item.original) {
        edits.push({
          pageIndex,
          x: item.pdfX,
          yTop: p.pdfHeight - item.pdfY - item.height,
          width: item.width,
          height: item.height,
          newText: item.newText,
          fontSize: item.fontSize
        });
      }
    });
  });
  if (!edits.length) { alert('Please edit some text first!'); return; }
  const fd = new FormData();
  fd.append('file', editFile);
  fd.append('edits', JSON.stringify(edits));
  document.getElementById('editMsg').textContent = 'Saving edited PDF...';
  const res = await fetch(API_BASE + '/api/edit-pdf', { method: 'POST', body: fd });
  if (!res.ok) { document.getElementById('editMsg').textContent = 'Error: ' + (await res.json()).error; return; }
  downloadBlob(await res.blob(), 'edited.pdf');
  document.getElementById('editMsg').textContent = '✅ Edited PDF downloaded!';
  if (window.DirectAds) DirectAds.onPdfConverted();
};

function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
