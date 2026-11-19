// Frontend direct-ads.js - Calls BACKEND via API_BASE
// direct-ads.js v3 - Full English Version
// Banner + Left + Right + Interstitial with Timing Settings

let convertCount = 0;
let currentAds = null;
let lastInterstitialShownAt = 0;
let autoTimer = null;

async function loadDirectAds() {
  try {
    const res = await fetch(API_BASE + '/api/ads');
    if (res.ok) currentAds = await res.json();
    showBannerAd();
    showSideAds();
    setupInterstitialAutoShow();
  } catch (e) { console.log('Ads failed to load', e); }
}

function showBannerAd() {
  if (!currentAds?.banner?.enabled) return;
  const ad = currentAds.banner;
  const old = document.getElementById('direct-ad-banner');
  if (old) old.remove();
  const div = document.createElement('div');
  div.id = 'direct-ad-banner';
  div.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #e5e7eb;padding:8px;z-index:9999;display:flex;align-items:center;gap:10px;';
  div.innerHTML = `
    <span style="font-size:10px;color:#94a3b8;position:absolute;top:2px;right:6px;">Ad • Sponsored</span>
    <img src="${ad.image}" style="width:80px;height:50px;object-fit:cover;border-radius:8px;" />
    <div style="flex:1;"><div style="font-size:13px;font-weight:700;">${ad.title}</div><div style="font-size:11px;color:#64748b;">${ad.advertiser}</div></div>
    <button style="background:#2563eb;color:#fff;border:0;padding:8px 14px;border-radius:8px;font-weight:700;">${ad.buttonText}</button>
    <button id="close-banner-ad" style="background:#f1f5f9;border:0;border-radius:50%;width:24px;height:24px;cursor:pointer;">✕</button>
  `;
  div.onclick = (e) => {
    if (e.target.id === 'close-banner-ad') { div.remove(); document.body.style.paddingBottom = '0'; return; }
    trackAdClick('banner', ad.id);
    window.open(ad.link, '_blank');
  };
  document.body.appendChild(div);
  document.body.style.paddingBottom = '70px';
  trackAdView('banner', ad.id);
}

function showSideAds() {
  ['direct-ad-left', 'direct-ad-right'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
  if (currentAds?.leftAd?.enabled) createSideAd('left', currentAds.leftAd);
  if (currentAds?.rightAd?.enabled) createSideAd('right', currentAds.rightAd);
}
function createSideAd(side, ad) {
  const div = document.createElement('div');
  div.id = side === 'left' ? 'direct-ad-left' : 'direct-ad-right';
  div.className = 'side-ad side-ad-' + side;
  div.style.cssText = side === 'left'
    ? 'position:fixed;left:10px;top:120px;width:170px;z-index:9998;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);'
    : 'position:fixed;right:10px;top:120px;width:170px;z-index:9998;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);';
  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;background:#f8fafc;">
      <span style="font-size:10px;color:#94a3b8;">Ad • Sponsored</span>
      <button class="close-side-ad" style="background:#f1f5f9;border:0;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:11px;">✕</button>
    </div>
    <img src="${ad.image}" style="width:100%;height:280px;object-fit:cover;display:block;cursor:pointer;" />
    <div style="padding:10px;">
      <div style="font-size:13px;font-weight:700;line-height:1.3;">${ad.title}</div>
      <div style="font-size:11px;color:#64748b;margin:4px 0 8px;">${ad.advertiser}</div>
      <button class="go-side-ad" style="width:100%;background:#2563eb;color:#fff;border:0;padding:9px;border-radius:8px;font-weight:700;cursor:pointer;">${ad.buttonText}</button>
    </div>
  `;
  div.querySelector('.close-side-ad').onclick = (e) => { e.stopPropagation(); div.remove(); };
  const openAd = () => { trackAdClick(side, ad.id); window.open(ad.link, '_blank'); };
  div.querySelector('img').onclick = openAd;
  div.querySelector('.go-side-ad').onclick = openAd;
  document.body.appendChild(div);
  trackAdView(side, ad.id);
}

function getInterstitialSettings() {
  const a = currentAds?.interstitial || {};
  return {
    enabled: a.enabled !== false,
    showAfterConverts: parseInt(a.showAfterConverts ?? 2, 10) || 1,
    autoShowAfterSeconds: parseInt(a.autoShowAfterSeconds ?? 0, 10) || 0,
    delaySeconds: parseFloat(a.delaySeconds ?? 0) || 0,
    cooldownSeconds: parseInt(a.cooldownSeconds ?? 60, 10) || 0
  };
}

function canShowInterstitialNow() {
  const s = getInterstitialSettings();
  if (!s.enabled) { console.log('Interstitial is OFF in Admin'); return false; }
  if (!currentAds?.interstitial?.image && !currentAds?.interstitial?.title) { console.log('Interstitial image/title is empty'); return false; }
  if (lastInterstitialShownAt) {
    const diff = (Date.now() - lastInterstitialShownAt) / 1000;
    if (diff < s.cooldownSeconds) { console.log(`Cooldown active - will show in ${Math.ceil(s.cooldownSeconds - diff)} sec`); return false; }
  }
  return true;
}

function showInterstitialAd(force = false) {
  if (!force && !canShowInterstitialNow()) return;
  if (!currentAds?.interstitial?.enabled && !force) return;
  const ad = currentAds.interstitial;
  if (document.getElementById('interstitial-overlay')) return;
  const doShow = () => {
    const overlay = document.createElement('div');
    overlay.id = 'interstitial-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:10000;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;overflow:hidden;max-width:340px;width:90%;position:relative;">
        <span style="position:absolute;top:8px;left:8px;background:#000;color:#fff;font-size:10px;padding:3px 8px;border-radius:999px;">Ad • Sponsored</span>
        <button id="close-direct-ad" style="position:absolute;top:8px;right:8px;background:#fff;border:0;border-radius:50%;width:28px;height:28px;cursor:pointer;">✕</button>
        <img src="${ad.image}" style="width:100%;display:block;" />
        <div style="padding:14px;"><div style="font-weight:800;">${ad.title}</div><div style="font-size:12px;color:#64748b;margin:4px 0 10px;">${ad.advertiser}</div><button id="go-direct-ad" style="width:100%;background:#16a34a;color:#fff;border:0;padding:11px;border-radius:10px;font-weight:700;">${ad.buttonText}</button></div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('close-direct-ad').onclick = () => overlay.remove();
    document.getElementById('go-direct-ad').onclick = () => { trackAdClick('interstitial', ad.id); window.open(ad.link, '_blank'); overlay.remove(); };
    lastInterstitialShownAt = Date.now();
    trackAdView('interstitial', ad.id);
  };
  const delay = getInterstitialSettings().delaySeconds;
  if (delay > 0 && !force) setTimeout(doShow, delay * 1000);
  else doShow();
}

function setupInterstitialAutoShow() {
  if (autoTimer) clearTimeout(autoTimer);
  const s = getInterstitialSettings();
  if (!s.enabled || !s.autoShowAfterSeconds) { console.log('Auto-show is OFF'); return; }
  console.log(`Full Ad will auto-show in ${s.autoShowAfterSeconds} seconds`);
  autoTimer = setTimeout(() => {
    console.log('Auto time reached, showing Full Ad');
    showInterstitialAd();
  }, s.autoShowAfterSeconds * 1000);
}

function onPdfConverted() {
  convertCount++;
  const s = getInterstitialSettings();
  console.log(`Conversion #${convertCount}, Full Ad shows every ${s.showAfterConverts} conversions`);
  if (convertCount % s.showAfterConverts === 0) {
    setTimeout(() => showInterstitialAd(), 500);
  }
}

async function trackAdView(type, adId) {
  try { await fetch(API_BASE + '/api/ads/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, adId }) }); } catch {}
}
async function trackAdClick(type, adId) {
  try { await fetch(API_BASE + '/api/ads/click', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, adId }) }); } catch {}
}

document.addEventListener('DOMContentLoaded', loadDirectAds);
window.DirectAds = { onPdfConverted, showInterstitialAd, loadDirectAds, showSideAds, testFullAd: () => showInterstitialAd(true) };
