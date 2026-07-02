/* =========================================================
   Perlahomes Guest Guide — hub & spoke renderer
   Loads data/<slug>.json (?p=<slug>) and renders a home hub
   plus per-category pages. No build step. Plain JS.
   ========================================================= */
(() => {
  "use strict";
  const app = document.getElementById("app");
  const toastEl = document.getElementById("toast");
  const params = new URLSearchParams(location.search);
  const slug = (params.get("p") || "villa-aurora").replace(/[^a-z0-9_-]/gi, "");

  // Optional personal touch: ?name=Giorgo on the guest link (generator.html can add this).
  const guestNameRaw = params.get("name") || params.get("guest") || "";
  const guestName = guestNameRaw.replace(/[^\p{L}\p{N} '-]/gu, "").trim().slice(0, 40);

  let DATA = null, LANG = "en", waHidden = false;
  let WX = null, WXfetched = false, reviewGiven = 0;

  // Soft expiry: a link like ?p=slug&until=2026-07-05 stops working after that day.
  const until = params.get("until");
  function isExpired(u){ if(!u) return false; const d = new Date(u + "T23:59:59"); if (isNaN(d.getTime())) return false; return Date.now() > d.getTime(); }
  const EXPIRED = isExpired(until);

  const t = (v) => v == null ? "" : (typeof v === "string" ? v : (v[LANG] ?? v.en ?? Object.values(v)[0] ?? ""));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
  const digits = (s) => String(s).replace(/[^\d]/g, "");

  const FLAGS = {
    en: '<svg viewBox="0 0 60 40"><rect width="60" height="40" fill="#012169"/><path d="M0 0l60 40M60 0L0 40" stroke="#fff" stroke-width="8"/><path d="M0 0l60 40M60 0L0 40" stroke="#C8102E" stroke-width="4"/><path d="M30 0v40M0 20h60" stroke="#fff" stroke-width="13"/><path d="M30 0v40M0 20h60" stroke="#C8102E" stroke-width="8"/></svg>',
    el: '<svg viewBox="0 0 60 40"><rect width="60" height="40" fill="#0d5eaf"/><g fill="#fff"><rect y="4.4" width="60" height="4.4"/><rect y="13.3" width="60" height="4.4"/><rect y="22.2" width="60" height="4.4"/><rect y="31.1" width="60" height="4.4"/></g><rect width="22.2" height="22.2" fill="#0d5eaf"/><g fill="#fff"><rect x="8.9" width="4.4" height="22.2"/><rect y="8.9" width="22.2" height="4.4"/></g></svg>',
    fr: '<svg viewBox="0 0 60 40"><rect width="20" height="40" fill="#0055A4"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#EF4135"/></svg>',
    de: '<svg viewBox="0 0 60 40"><rect width="60" height="13.3" fill="#000"/><rect y="13.3" width="60" height="13.3" fill="#D00"/><rect y="26.6" width="60" height="13.4" fill="#FFCE00"/></svg>',
    it: '<svg viewBox="0 0 60 40"><rect width="20" height="40" fill="#009246"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#CE2B37"/></svg>'
  };
  const LANGNAME = { en: "English", el: "Ελληνικά", fr: "Français", de: "Deutsch", it: "Italiano" };

  const I = {
    arrival:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Z"/><path d="m9.5 10.5 1.8 1.8 3.2-3.4"/></svg>',
    property:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m14 7 5-5 3 3-5 5"/><path d="m17 5 2 2"/><circle cx="8.5" cy="15.5" r="5"/><path d="m11.5 12 3.5-3.5"/></svg>',
    neighborhood:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="7" r="3"/><path d="M6 21v-2a6 6 0 0 1 12 0v2"/><path d="M4 13l-2 2M20 13l2 2"/></svg>',
    beaches:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="17" cy="6" r="3"/><path d="M3 20h18M5 20c2-6 9-9 13-7M12 13c-1-3 1-6 4-7"/></svg>',
    sights:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="14" height="11" rx="2"/><path d="M17 10l4-2v8l-4-2"/><circle cx="9" cy="12" r="2.2"/></svg>',
    restaurants:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 3v8a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 2-3 5s1 4 3 4m0 0v9"/></svg>',
    activities:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l6-2 6 2 6-2v12l-6 2-6-2-6 2z"/><path d="M9 5v12M15 7v12"/></svg>',
    transfers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11"/><path d="M4 11h16v6H4zM7 17v2M17 17v2"/><circle cx="7.5" cy="14" r="1"/><circle cx="16.5" cy="14" r="1"/></svg>',
    spa:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 21c-4-2-7-5-7-9 3 0 6 2 7 5 1-3 4-5 7-5 0 4-3 7-7 9Z"/><path d="M12 17V9"/></svg>',
    shopping:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l1 13H5L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>',
    info:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    neighbourhood: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V8l5-3 5 3v13M9 21v-4h2v4M19 21V11l-4-2.4"/></svg>',
    wellness:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21c5-2 8-6 8-10 0-2-3 0-4 2 0-3-2-6-4-8-2 2-4 5-4 8-1-2-4-4-4-2 0 4 3 8 8 10Z"/></svg>',
    rateus:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l2.3 4.7 5.2.8-3.8 3.7.9 5.1L12 16l-4.6 2.4.9-5.1L4.5 9.5l5.2-.8L12 4Z"/></svg>',
    checkin:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M9 15l2 2 4-4"/></svg>',
    massage:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="8" cy="6" r="2"/><path d="M3 19c1-3 4-5 8-5h3a4 4 0 0 1 4 4M11 14l3-2"/></svg>',
    back:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    right:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    expand:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5"/></svg>',
    swipe:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 7l-4 5 4 5M15 7l4 5-4 5"/></svg>',
    chev:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>',
    map:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m9 4 6 2 5-2v14l-5 2-6-2-5 2V6l5-2Z"/><path d="M9 4v14M15 6v14"/></svg>',
    pin:       '<svg viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"><path d="M12 2a7 7 0 0 0-7 7c0 4.9 5.4 11.4 6.6 12.8a.6.6 0 0 0 .9 0C13.6 20.4 19 13.9 19 9a7 7 0 0 0-7-7Zm0 4.4A2.6 2.6 0 1 0 12 11.6 2.6 2.6 0 0 0 12 6.4Z"/></svg>',
    copy:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    mic:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    x:         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    wa:        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.4A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.7-1.2-4.5-4-4.6-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 .9-2.2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5.2.5.7 1.8.8 1.9.1.1.1.3 0 .5-.3.5-.4.6-.6.9-.2.2-.3.4-.1.7.2.3.9 1.4 1.9 2.3 1.3 1.1 2.3 1.5 2.6 1.6.3.1.5.1.7-.1.2-.2.7-.9.9-1.1.2-.3.4-.2.7-.1.3.1 1.7.8 1.9.9.3.2.5.2.5.4.1.1.1.7-.1 1.3Z"/></svg>',
    viber:     '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2c-5 0-8.7 3.2-8.7 7.4 0 2.2 1 4.1 2.8 5.5l-.6 3.3c-.05.27.24.48.48.34l3.1-1.7c.95.2 1.9.2 2.9.2 5 0 8.7-3.2 8.7-7.4S17 2.2 12 2.2Zm3.9 10.2c-.2.5-.9 1-1.5 1.1-.4.05-.9.1-2.7-.7-2.3-1-3.7-3.3-3.8-3.5-.1-.15-.9-1.2-.9-2.3 0-1.1.6-1.6.8-1.85.2-.2.45-.27.6-.27h.45c.15 0 .33-.03.5.4.2.5.65 1.7.7 1.8.05.1.08.25.02.4-.27.55-.55.6-.75.85-.1.12-.2.25-.1.45.1.2.55.95 1.2 1.5.85.7 1.5.95 1.7 1.05.15.08.3.06.42-.08.17-.18.62-.72.79-.97.12-.18.27-.13.45-.07.2.07 1.25.6 1.45.7.2.1.34.15.4.23.05.1.05.6-.15 1.07Z"/></svg>',
    phone:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></svg>',
    search:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    bell:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z"/><path d="M9.5 17a2.5 2.5 0 0 0 5 0"/></svg>',
    star:      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.1 6.5L12 17.6l-5.8 3 1.1-6.5-4.8-4.6 6.6-.9L12 2.5Z"/></svg>',
    shield:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
    wxsun:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M4.2 12H1.8M22.2 12h-2.4M5.4 5.4l1.7 1.7M16.9 16.9l1.7 1.7M18.6 5.4l-1.7 1.7M7.1 16.9l-1.7 1.7"/></svg>',
    wxcloud:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.6A3.5 3.5 0 0 0 7 18Z"/></svg>',
    wxrain:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 15h9a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.9A3.5 3.5 0 0 0 6 15h1Z"/><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2"/></svg>',
    navhome:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9"/></svg>',
    navguide:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5c2-1 5-1 8 .5V19c-3-1.5-6-1.5-8-.5V5Z"/><path d="M21 5c-2-1-5-1-8 .5V19c3-1.5 6-1.5 8-.5V5Z"/></svg>',
    navarea:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-7.6 7-13a7 7 0 1 0-14 0c0 5.4 7 13 7 13Z"/><circle cx="12" cy="8" r="2.6"/></svg>',
    navcontact:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 1 3 6.2L4 20l1.2-3.6A7.96 7.96 0 0 1 4 12Z"/><path d="M9 12h6"/></svg>',
    wifi:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5a15 15 0 0 1 18 0"/><path d="M6.5 12.2a10 10 0 0 1 11 0"/><path d="M10 15.8a5 5 0 0 1 4 0"/><circle cx="12" cy="19" r="1.1" fill="currentColor" stroke="none"/></svg>',
    rules:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>',
    checkout:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2"/><path d="M10 12h11M17 8l4 4-4 4"/></svg>',
  };

  let toastTimer;
  function toast(msg){ toastEl.textContent = msg; toastEl.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(()=>toastEl.classList.remove("show"),1600); }
  async function copy(text, what){ try{ await navigator.clipboard.writeText(text); toast((LANG==="el"?"Αντιγράφηκε: ":"Copied: ")+what); }catch{ toast(LANG==="el"?"Δεν ήταν δυνατή η αντιγραφή":"Couldn’t copy"); } }

  /* ---- shared chrome ---- */
  function langPicker(){
    const langs = (DATA.meta && DATA.meta.languages) || ["en"];
    if (langs.length < 2) return "";
    return `<div class="lang">
      <button class="lang__btn" id="langBtn" aria-haspopup="true" aria-expanded="false">
        <span class="flag">${FLAGS[LANG]||""}</span>${I.chev}
      </button>
      <div class="lang__menu" id="langMenu" role="menu">
        ${langs.map(l=>`<button data-setlang="${l}" role="menuitem"><span class="flag">${FLAGS[l]||""}</span>${esc(LANGNAME[l]||l.toUpperCase())}</button>`).join("")}
      </div>
    </div>`;
  }
  function waButton(){
    const c = DATA.contact || {};
    if (waHidden || (!c.whatsapp && !c.viber)) return "";
    let items = "";
    if (c.viber) items += `<a class="fab fab--viber" href="viber://chat?number=${encodeURIComponent("+"+digits(c.viber))}" aria-label="Viber">${I.viber}</a>`;
    if (c.whatsapp) items += `<a class="fab fab--wa" href="https://wa.me/${digits(c.whatsapp)}" target="_blank" rel="noopener" aria-label="WhatsApp">${I.wa}</a>`;
    return `<div class="fabs"><button class="fab__x" id="waX" aria-label="Hide">✕</button>${items}</div>`;
  }

  /* ---- bottom tab navigation ---- */
  function navBar(active){
    const tabs = [
      { id:"home",    href:"#",         label: LANG==="el"?"Αρχική":"Home",       icon:"navhome"   },
      { id:"guide",   href:"#__guide",  label: LANG==="el"?"Οδηγός":"Guide",      icon:"navguide"  },
      { id:"area",    href:"#__area",   label: LANG==="el"?"Περιοχή":"Area",      icon:"navarea"   },
      { id:"contact", href:"#__contact",label: LANG==="el"?"Επικοινωνία":"Contact", icon:"navcontact" }
    ];
    return `<nav class="navbar"><div class="navbar__inner">${tabs.map(tb=>
      `<a class="navbar__tab${tb.id===active?" active":""}" href="${tb.href}">${I[tb.icon]}<span>${esc(tb.label)}</span></a>`).join("")}</div></nav>`;
  }

  /* ---- weather (optional, only if meta.coords is set) ---- */
  function weatherIcon(code){
    if (code === 0) return I.wxsun;
    if ([1,2,3,45,48].includes(code)) return I.wxcloud;
    return I.wxrain;
  }
  function wxPillInner(){
    if (!WX) return `<span class="wx-load">…</span>`;
    return `${weatherIcon(WX.code)}<span>${WX.temp}°C</span>`;
  }
  function ensureWeather(){
    const c = DATA.meta && DATA.meta.coords;
    if (!c || c.lat == null || c.lng == null || WXfetched) return;
    WXfetched = true;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lng}&current=temperature_2m,weather_code&timezone=auto`)
      .then(r=>r.json())
      .then(d=>{
        if (d && d.current){
          WX = { temp: Math.round(d.current.temperature_2m), code: d.current.weather_code };
          const el = document.getElementById("wxPill");
          if (el) el.innerHTML = wxPillInner();
        }
      })
      .catch(()=>{});
  }

  /* ---- "how was your stay" review widget ---- */
  function reviewWidgetHTML(){
    const stars = [1,2,3,4,5].map(i=>`<button type="button" class="star${i<=reviewGiven?" filled":""}" data-star="${i}" aria-label="${i} star">${I.star}</button>`).join("");
    const sub = reviewGiven
      ? (LANG==="el" ? "Ευχαριστούμε! Η αξιολόγησή σας παραμένει ανώνυμη." : "Thank you! Your rating stays anonymous.")
      : (LANG==="el" ? "Η γνώμη σας μας βοηθά να γινόμαστε καλύτεροι!" : "Your feedback helps us do better!");
    return `<div class="reviewcard">
      <div class="reviewcard__main">
        <span class="reviewcard__icn">${I.star}</span>
        <div>
          <h3>${LANG==="el"?"Πώς ήταν η διαμονή σας;":"How was your stay?"}</h3>
          <p>${sub}</p>
          <div class="stars">${stars}</div>
        </div>
      </div>
      <div class="reviewcard__note">${I.shield}<p>${LANG==="el"?"Αν αξιολογήσετε με 5 αστέρια, θα εμφανιστεί δημόσια. Ευχαριστούμε!":"Rating 5 stars will also post publicly. Thank you!"}</p></div>
    </div>`;
  }
  function wireStars(){
    app.querySelectorAll(".star").forEach(b=>{
      b.addEventListener("click", ()=>{
        reviewGiven = +b.dataset.star;
        const slot = app.querySelector("#reviewSlot");
        if (slot) slot.innerHTML = reviewWidgetHTML();
        wireStars();
        const grUrl = DATA.meta && DATA.meta.googleReviewUrl;
        if (reviewGiven === 5 && grUrl){
          toast(LANG==="el" ? "Ευχαριστούμε! Άνοιγμα σελίδας αξιολόγησης…" : "Thank you! Opening review page…");
          setTimeout(()=>window.open(grUrl, "_blank"), 650);
        } else {
          toast(LANG==="el" ? "Ευχαριστούμε για την αξιολόγηση!" : "Thanks for your rating!");
        }
      });
    });
  }

  /* ---- greeting ---- */
  function greetWord(){
    const h = new Date().getHours();
    if (LANG === "el") return h < 12 ? "Καλημέρα" : "Καλησπέρα";
    return h < 12 ? "Good morning" : "Good evening";
  }
  function heroImages(){
    const m = DATA.meta || {};
    if (Array.isArray(m.heroImages) && m.heroImages.length) return m.heroImages.filter(Boolean);
    return m.heroImage ? [m.heroImage] : [];
  }

  /* ---- home grid tiles: use DATA.home if provided, else fall back to one tile per section ---- */
  function homeTiles(){
    if (Array.isArray(DATA.home) && DATA.home.length) return DATA.home;
    return (DATA.sections||[]).map(s => ({ icon: s.icon, title: s.title, subtitle: s.subtitle, section: s.id, link: s.link }));
  }
  // find a card by its stable "key" (preferred) or, failing that, by matching its title text.
  // matches group keys too, jumping to the first card of that group.
  function findCardIndex(sec, matchKey){
    if (!sec || !matchKey) return -1;
    const q = String(matchKey).toLowerCase();
    const norm = s => String(s||"").toLowerCase().replace(/[\s-]+/g,"");
    let flatIdx = 0;
    const groups = (sec.groups && sec.groups.length) ? sec.groups : [{ cards: sec.cards||[] }];
    for (const g of groups){
      if (g.key && g.key.toLowerCase() === q) return flatIdx;
      for (const c of (g.cards||[])){
        if ((c.key && c.key.toLowerCase() === q) || norm(t(c.title)) === norm(q)) return flatIdx;
        flatIdx++;
      }
    }
    return -1;
  }

  /* ---- full-content search ---------------------------------------------
     Builds a flat index of every card across every section, so the home
     search bar can find content by title, body, wifi, code, checklist —
     not just the tile labels. Synonyms map common words (internet→wifi)
     to what's actually in the guide. Add property-specific terms via
     meta.searchAliases in the JSON, e.g. {"internet":["wifi"]}.            */
  const SYNONYMS = {
    internet: ["wifi","wi-fi","wireless","network","σύνδεση","ίντερνετ","διαδίκτυο"],
    wifi:     ["internet","wireless","password","κωδικός","σύνδεση"],
    password: ["wifi","code","κωδικός","pin"],
    code:     ["password","pin","lockbox","κωδικός","κλειδί"],
    key:      ["code","lockbox","keybox","κλειδί","κουτί"],
    ac:       ["air conditioning","aircon","climate","κλιματισμός","air"],
    "air conditioning": ["ac","aircon","κλιματισμός"],
    pool:     ["swim","swimming","πισίνα","κολύμπι"],
    beach:    ["sea","swim","παραλία","θάλασσα"],
    eat:      ["restaurant","food","dinner","lunch","φαγητό","εστιατόριο"],
    food:     ["restaurant","eat","εστιατόριο","φαγητό"],
    checkout: ["check-out","leave","departure","αναχώρηση","φεύγω"],
    checkin:  ["check-in","arrival","άφιξη"],
    parking:  ["car","garage","πάρκινγκ","αυτοκίνητο","γκαράζ"],
    taxi:     ["transfer","transport","cab","ταξί","μεταφορά"],
    trash:    ["garbage","rubbish","σκουπίδια","απορρίμματα"],
    hotwater: ["hot water","boiler","heater","ζεστό νερό","θερμοσίφωνας"],
    smoke:    ["smoking","cigarette","κάπνισμα","τσιγάρο"],
    towel:    ["towels","πετσέτα","πετσέτες"],
    contact:  ["call","phone","help","επικοινωνία","τηλέφωνο","βοήθεια"],
  };
  const stripAccents = (s)=> String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const searchNorm = (s)=> stripAccents(String(s||"").toLowerCase()).replace(/[^a-z0-9α-ω\s]/gi," ").replace(/\s+/g," ").trim();

  function aliasMap(){
    const m = {};
    for (const k in SYNONYMS) m[searchNorm(k)] = SYNONYMS[k].map(searchNorm);
    const custom = (DATA.meta && DATA.meta.searchAliases) || {};
    for (const k in custom){
      const key = searchNorm(k);
      const vals = (Array.isArray(custom[k]) ? custom[k] : [custom[k]]).map(searchNorm);
      m[key] = (m[key]||[]).concat(vals);
    }
    return m;
  }
  // expand a query into itself + any synonym terms it contains
  function expandQuery(q){
    const nq = searchNorm(q);
    const terms = new Set(nq.split(" ").filter(Boolean));
    const am = aliasMap();
    if (am[nq]) am[nq].forEach(v=>v.split(" ").forEach(w=>terms.add(w)));
    nq.split(" ").forEach(w=>{ if (am[w]) am[w].forEach(v=>v.split(" ").forEach(x=>terms.add(x))); });
    return [...terms].filter(Boolean);
  }

  let SEARCH_INDEX = null;
  function buildSearchIndex(){
    const idx = [];
    (DATA.sections||[]).forEach(sec=>{
      const groups = (sec.groups && sec.groups.length) ? sec.groups : [{ cards: sec.cards||[] }];
      let flat = 0;
      groups.forEach(g=>{
        (g.cards||[]).forEach(c=>{
          const parts = [ t(c.title), t(c.body), t(sec.title), t(g.label) ];
          if (c.wifi){ parts.push("wifi","internet",c.wifi.network); }
          if (c.code){ parts.push("code", t(c.codeLabel)); }
          if (Array.isArray(c.checklist)) c.checklist.forEach(it=>parts.push(t(it)));
          if (c.distance) parts.push(t(c.distance));
          idx.push({
            secId: sec.id,
            cardIdx: flat,
            title: t(c.title) || t(sec.title),
            sub: t(sec.title),
            hay: searchNorm(parts.join(" ")),
            icon: sec.icon
          });
          flat++;
        });
      });
    });
    return idx;
  }
  function runSearch(q){
    if (!SEARCH_INDEX) SEARCH_INDEX = buildSearchIndex();
    const terms = expandQuery(q);
    if (!terms.length) return [];
    const results = [];
    SEARCH_INDEX.forEach(row=>{
      let score = 0;
      terms.forEach(term=>{
        if (!term) return;
        const i = row.hay.indexOf(term);
        if (i >= 0){ score += 2; if (searchNorm(row.title).indexOf(term) >= 0) score += 3; }
      });
      if (score > 0) results.push({ row, score });
    });
    results.sort((a,b)=> b.score - a.score);
    // drop weak single-term body-only matches (noise); keep title hits and multi-term matches
    const strong = results.filter(r=> r.score >= 4);
    return (strong.length ? strong : results).slice(0, 12).map(r=>r.row);
  }
  function searchResultsHTML(q){
    const rows = runSearch(q);
    if (!rows.length){
      return `<div class="searchres"><p class="searchres__none">${LANG==="el"?"Δεν βρέθηκαν αποτελέσματα για ":"No results for "}“${esc(q)}”.</p></div>`;
    }
    return `<div class="searchres">${rows.map(r=>
      `<button class="sres" data-sres="${esc(r.secId)}/${r.cardIdx}">
        <span class="sres__icn">${I[r.icon]||I.info}</span>
        <span class="sres__txt"><span class="sres__t">${esc(r.title)}</span><span class="sres__s">${esc(r.sub)}</span></span>
        ${I.right}
      </button>`).join("")}</div>`;
  }

  /* ---- views ---- */
  function homeView(){
    const m = DATA.meta || {};
    const heroImgs = heroImages();
    const coords = m.coords;
    return `
      <div class="homehead">
        <div class="homehead__top">
          <div class="greetcol">
            <h1 class="greet">${esc(greetWord())}${guestName?", "+esc(guestName):""}! <span class="wave">👋</span></h1>
            <p class="greet__sub">${LANG==="el" ? `Καλώς ήρθες στο κατάλυμα «${esc(m.name||"")}»` : `Welcome to ${esc(m.name||"")}`}</p>
          </div>
          ${m.brandLogo ? `<img class="homehead__logo" src="${esc(m.brandLogo)}" alt="">` : ""}
        </div>
        <div class="searchbar">
          <span class="searchbar__icn">${I.search}</span>
          <input type="text" id="homeSearch" autocomplete="off" placeholder="${LANG==="el"?"Αναζητήστε οδηγίες, παροχές, πληροφορίες…":"Search guides, amenities, info…"}">
          <button class="searchbar__clear" id="searchClear" aria-label="${LANG==="el"?"Καθαρισμός":"Clear"}" hidden>${I.x}</button>
          <button class="searchbar__mic" id="searchMic" aria-label="${LANG==="el"?"Φωνητική αναζήτηση":"Voice search"}" hidden>${I.mic}</button>
          ${langPicker()}
        </div>
        <div id="searchResults"></div>
      </div>
      ${heroImgs.length ? `
      <div class="herocard">
        <div class="heroslider" id="heroSlider">
          ${heroImgs.map(src=>`<div class="heroslide" style="background-image:url('${esc(src)}')"></div>`).join("")}
        </div>
        <div class="herocard__scrim"></div>
        <div class="herocard__top">
          <span class="herocard__loc">${I.pin}${esc(m.name||"")}</span>
          ${(coords && coords.lat != null) ? `<span class="wxpill" id="wxPill">${wxPillInner()}</span>` : ""}
        </div>
        <div class="herocard__bottom">
          <h2>${esc(t(m.welcomeTitle)||(LANG==="el"?"Καλή διαμονή!":"Enjoy your stay!"))}</h2>
          ${m.welcomeMessage ? `<p class="clamp" id="welcomeMsg">${esc(t(m.welcomeMessage))}</p><button class="readmore readmore--light" id="readmore">${LANG==="el"?"Περισσότερα":"Read more"} ${I.chev}</button>` : ""}
        </div>
        ${heroImgs.length>1 ? `<div class="herodots" id="heroDots">${heroImgs.map((_,i)=>`<span class="hdot${i===0?" active":""}"></span>`).join("")}</div>` : ""}
      </div>` : ""}
      <div class="guide-label">${LANG==="el"?"Οδηγός διαμονής":"Stay guide"}</div>
      <div class="grid" id="homeGrid">
        ${homeTiles().map((tl,i)=>{
          const label = t(tl.title), sub = tl.subtitle ? t(tl.subtitle) : "";
          const dt = esc((label||"").toLowerCase());
          const inner = `${I[tl.icon]||I.info}<span class="tile__t">${esc(label)}</span>${sub?`<span class="tile__s">${esc(sub)}</span>`:""}`;
          return tl.link
            ? `<a class="tile" data-title="${dt}" href="${esc(t(tl.link))}" target="_blank" rel="noopener">${inner}</a>`
            : `<button class="tile" data-title="${dt}" data-hometile="${i}">${inner}</button>`;
        }).join("")}
      </div>
      <a class="needbanner" href="#__contact">
        <span class="needbanner__icn">${I.bell}</span>
        <span class="needbanner__t">
          <strong>${LANG==="el"?"Χρειάζεστε κάτι;":"Need something?"}</strong>
          <span>${LANG==="el"?"Υπηρεσίες, μεταφορές, extra καθαρισμός και άλλα":"Services, transfers, extra cleaning and more"}</span>
        </span>
        ${I.right}
      </a>
      <div id="reviewSlot">${reviewWidgetHTML()}</div>
      ${navBar("home")}
      ${waButton()}`;
  }

  function imgs(c){
    if (Array.isArray(c.images)) return c.images.filter(Boolean);
    return [c.image, c.image2].filter(Boolean);
  }
  function checklistHTML(c){
    if (!Array.isArray(c.checklist) || !c.checklist.length) return "";
    return `<ul class="checklist">` + c.checklist.map(it =>
      `<li><button type="button" class="chk"><span class="box"></span><span class="chk__t">${esc(t(it))}</span></button></li>`
    ).join("") + `</ul>`;
  }
  function chipsHTML(c){
    if (c.wifi){
      return `<div class="wifirow">
        <button class="codebox" data-copy="${esc(c.wifi.network)}" data-what="WiFi"><span><span class="codebox__l">WiFi</span><span class="codebox__v">${esc(c.wifi.network)}</span></span><span class="codebox__c">${I.copy}</span></button>
        <button class="codebox" data-copy="${esc(c.wifi.password)}" data-what="${LANG==="el"?"Κωδικός":"Password"}"><span><span class="codebox__l">${LANG==="el"?"Κωδικός":"Password"}</span><span class="codebox__v">${esc(c.wifi.password)}</span></span><span class="codebox__c">${I.copy}</span></button>
      </div>`;
    }
    if (c.code){
      return `<button class="codebox" data-copy="${esc(digits(c.code)||c.code)}" data-what="${esc(t(c.codeLabel)||t(c.title))}">
        <span><span class="codebox__l">${esc(t(c.codeLabel)||(LANG==="el"?"Κωδικός":"Code"))}</span><span class="codebox__v">${esc(c.code)}</span></span><span class="codebox__c">${I.copy}</span></button>`;
    }
    return "";
  }

  function cardHTML(c, idx){
    const list = imgs(c);
    const mapb = c.mapUrl ? `<a class="mapbtn" href="${esc(c.mapUrl)}" target="_blank" rel="noopener">${I.pin}${esc(t(c.mapLabel)||(LANG==="el"?"Άνοιγμα στον χάρτη":"Open in Maps"))}</a>` : "";
    const open = (idx==null) ? "" : ` data-open="${idx}" role="button" tabindex="0"`;
    return `<article class="card${idx==null?"":" card--tap"}"${open}>
      ${list[0] ? `<div class="card__imgwrap"><img class="card__img" src="${esc(list[0])}" alt="" loading="lazy">${idx==null?"":`<span class="card__expand">${I.expand}</span>`}${list.length>1?`<span class="card__multi">+${list.length-1}</span>`:""}</div>` : ""}
      <div class="card__pad">
        ${c.distance ? `<span class="distpill">${I.pin}${esc(t(c.distance))}</span>` : ""}
        ${c.title ? `<h2 class="card__title">${esc(t(c.title))}</h2>` : ""}
        ${c.body ? `<p class="card__body card__body--clamp">${esc(t(c.body))}</p>` : ""}
        ${checklistHTML(c)}
        ${chipsHTML(c)}
        ${mapb}
      </div>
    </article>`;
  }

  // flatten a section's cards (across groups) so the carousel can page through all of them
  function flatCards(sec){
    if (sec.groups && sec.groups.length) return sec.groups.reduce((a,g)=>a.concat(g.cards||[]),[]);
    return sec.cards || [];
  }

  function detailCardHTML(c){
    const list = imgs(c);
    const mapb = c.mapUrl ? `<a class="mapbtn" href="${esc(c.mapUrl)}" target="_blank" rel="noopener">${I.pin}${esc(t(c.mapLabel)||(LANG==="el"?"Άνοιγμα στον χάρτη":"Open in Maps"))}</a>` : "";
    return `<div class="slide">
      <div class="slide__card">
        ${list.map(src=>`<img class="slide__img" src="${esc(src)}" alt="">`).join("")}
        <div class="slide__pad">
          ${c.distance ? `<span class="distpill">${I.pin}${esc(t(c.distance))}</span>` : ""}
          ${c.title ? `<h2 class="slide__title">${esc(t(c.title))}</h2>` : ""}
          ${c.body ? `<p class="slide__body">${esc(t(c.body))}</p>` : ""}
          ${checklistHTML(c)}${chipsHTML(c)}${mapb}
        </div>
      </div>
    </div>`;
  }

  function detailView(sec, idx){
    const cards = flatCards(sec);
    idx = Math.max(0, Math.min(idx, cards.length - 1));
    const indicator = cards.length <= 10
      ? `<div class="dots" id="dots">${cards.map((_,i)=>`<button class="dot${i===idx?" active":""}" data-dot="${i}" aria-label="Card ${i+1}"></button>`).join("")}</div>`
      : `<div class="swbar"><span class="swbar__fill" id="swfill"></span></div>`;
    return `
      <div class="detail" id="detail" data-section="${esc(sec.id)}">
        <div class="detail__bar">
          <button class="iconbtn" id="dback" aria-label="Back">${I.back}</button>
          <span class="detail__count"><span id="dcur">${idx+1}</span> / ${cards.length}</span>
          <span class="spacer"></span>
        </div>
        <div class="swiper" id="swiper">
          ${cards.map(detailCardHTML).join("")}
        </div>
        <div class="swipehint hide" id="swipehint">${I.swipe}<span>${LANG==="el"?"Σύρετε":"Swipe"}</span></div>
        ${indicator}
        <button class="navarrow navarrow--l" id="dprev" aria-label="Previous">${I.back}</button>
        <button class="navarrow navarrow--r" id="dnext" aria-label="Next">${I.right}</button>
      </div>`;
  }

  function categoryView(sec){
    const intro = sec.intro ? `<p class="page-intro">${esc(t(sec.intro))}</p>` : "";
    let body;
    if (sec.groups && sec.groups.length){
      let n = 0;
      body = `<h1 class="page-title">${esc(t(sec.title))}</h1>${intro}` + sec.groups.map(g=>
        `<div class="group-label">${esc(t(g.label))}</div>
         <div class="cards">${(g.cards||[]).map(c=>cardHTML(c, n++)).join("")}</div>`).join("");
    } else {
      body = `<h1 class="page-title">${esc(t(sec.title))}</h1>${intro}
        <div class="cards">${(sec.cards||[]).map((c,i)=>cardHTML(c, i)).join("")}</div>`;
    }
    return `
      <div class="topbar"><button class="iconbtn" id="back" aria-label="Back">${I.back}</button>
        <span style="flex:1"></span>
        ${langPicker()||'<span class="spacer"></span>'}</div>
      ${body}
      ${navBar(sec.area ? "area" : "guide")}${waButton()}`;
  }

  /* ---- simple list-style pages: Guide index / Area / Contact & requests ---- */
  function rowHTML(icon, label, href, external){
    return `<a class="listrow" href="${esc(href)}"${external?' target="_blank" rel="noopener"':""}>${I[icon]||I.info}<span class="listrow__t">${esc(label)}</span>${I.right}</a>`;
  }
  function listPageView(title, intro, rows, active){
    return `
      <div class="topbar"><span style="flex:1"></span>${langPicker()||'<span class="spacer"></span>'}</div>
      <h1 class="page-title">${esc(title)}</h1>
      ${intro ? `<p class="page-intro">${esc(intro)}</p>` : ""}
      <div class="listcol">${rows.length ? rows.join("") : `<p class="page-intro">${LANG==="el"?"Δεν υπάρχουν ακόμη στοιχεία.":"Nothing here yet."}</p>`}</div>
      ${navBar(active)}${waButton()}`;
  }
  function guideView(){
    const rows = (DATA.sections||[]).map(s=>rowHTML(s.icon, t(s.title), s.link ? t(s.link) : ("#"+s.id), !!s.link));
    return listPageView(LANG==="el"?"Οδηγός":"Guide", "", rows, "guide");
  }
  function areaSections(){
    const secs = DATA.sections || [];
    const tagged = secs.filter(s=>s.area);
    if (tagged.length) return tagged;
    const fallback = ["neighborhood","neighbourhood","beaches","sights","restaurants","activities","shopping","transfers"];
    return secs.filter(s=>fallback.includes(s.id));
  }
  function areaView(){
    const rows = areaSections().map(s=>rowHTML(s.icon, t(s.title), s.link ? t(s.link) : ("#"+s.id), !!s.link));
    return listPageView(LANG==="el"?"Περιοχή":"Area", "", rows, "area");
  }
  function contactPageView(){
    const c = DATA.contact || {};
    const rows = [];
    if (c.phone) rows.push(rowHTML("phone", LANG==="el"?"Κλήση":"Call", "tel:"+c.phone, false));
    if (c.whatsapp) rows.push(rowHTML("wa", "WhatsApp", "https://wa.me/"+digits(c.whatsapp), true));
    if (c.viber) rows.push(rowHTML("viber", "Viber", "viber://chat?number="+encodeURIComponent("+"+digits(c.viber)), true));
    (DATA.actions||[]).forEach(a=> rows.push(rowHTML(a.icon, t(a.label), a.url||"#", true)));
    const intro = LANG==="el" ? "Υπηρεσίες, μεταφορές, extra καθαρισμός — ή επικοινωνήστε απευθείας." : "Services, transfers, extra cleaning — or reach us directly.";
    return listPageView(LANG==="el"?"Επικοινωνία":"Contact", intro, rows, "contact");
  }

  /* ---- routing ---- */
  function parseHash(){
    const raw = location.hash.replace(/^#/, "");
    if (!raw) return { id: null, idx: null };
    const parts = raw.split("/");
    return { id: parts[0], idx: parts[1] != null ? parseInt(parts[1], 10) : null };
  }
  function sectionById(id){ return (DATA.sections||[]).find(s => s.id === id); }

  function expiredView(){
    const m = (DATA && DATA.meta) || {}, c = (DATA && DATA.contact) || {};
    const phone = c.phone ? `<a class="exp-btn exp-call" href="tel:${esc(c.phone)}">${I.phone}${LANG==="el"?"Κλήση":"Call"}</a>` : "";
    const wa = c.whatsapp ? `<a class="exp-btn exp-wa" href="https://wa.me/${digits(c.whatsapp)}" target="_blank" rel="noopener">${I.wa}WhatsApp</a>` : "";
    const vb = c.viber ? `<a class="exp-btn exp-vb" href="viber://chat?number=${encodeURIComponent("+"+digits(c.viber))}">${I.viber}Viber</a>` : "";
    return `<div class="expired">
      ${m.brandLogo ? `<img class="expired__logo" src="${esc(m.brandLogo)}" alt="">` : ""}
      <h1>${LANG==="el" ? "Ο οδηγός δεν είναι πλέον ενεργός" : "This guide is no longer active"}</h1>
      <p>${LANG==="el" ? "Η διαμονή σας έχει ολοκληρωθεί. Αν χρειάζεστε οτιδήποτε, επικοινωνήστε μαζί μας." : "Your stay has ended. If you need anything, please get in touch."}</p>
      ${(phone||wa||vb) ? `<div class="expired__btns">${phone}${wa}${vb}</div>` : ""}
    </div>`;
  }

  function render(){
    if (EXPIRED){ app.innerHTML = expiredView(); window.scrollTo(0,0); return; }
    const { id, idx } = parseHash();
    if (id === "__guide") app.innerHTML = guideView();
    else if (id === "__area") app.innerHTML = areaView();
    else if (id === "__contact") app.innerHTML = contactPageView();
    else {
      const sec = id ? sectionById(id) : null;
      if (sec && idx != null && !Number.isNaN(idx)) app.innerHTML = detailView(sec, idx);
      else if (sec) app.innerHTML = categoryView(sec);
      else app.innerHTML = homeView();
    }
    window.scrollTo(0, 0);
    wire();
  }
  function wire(){
    app.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>{
      const s = DATA.sections[+b.dataset.go]; if (s){ location.hash = s.id; }
    }));
    app.querySelectorAll("[data-hometile]").forEach(b=>b.addEventListener("click",()=>{
      const tl = homeTiles()[+b.dataset.hometile]; if (!tl) return;
      if (tl.tab){ location.hash = "__" + tl.tab; return; }
      if (!tl.section) return;
      const sec = sectionById(tl.section);
      if (!sec) return;
      if (tl.cardMatch){
        const idx = findCardIndex(sec, tl.cardMatch);
        location.hash = idx >= 0 ? `${tl.section}/${idx}` : tl.section;
      } else {
        location.hash = tl.section;
      }
    }));
    const back = app.querySelector("#back"); if (back) back.addEventListener("click",()=>{ location.hash = ""; });

    app.querySelectorAll(".chk").forEach(b=>{
      b.addEventListener("click",(e)=>{ e.stopPropagation(); b.classList.toggle("done"); });
    });
    app.querySelectorAll("[data-open]").forEach(el=>{
      const go = (e)=>{
        if (e.target.closest("a,button")) return;
        const id = parseHash().id;
        location.hash = `${id}/${el.dataset.open}`;
      };
      el.addEventListener("click", go);
      el.addEventListener("keydown", e=>{ if (e.key==="Enter"||e.key===" "){ e.preventDefault(); go(e); } });
    });

    const detail = app.querySelector("#detail");
    if (detail){
      const swiper = app.querySelector("#swiper");
      const slides = Array.from(swiper.querySelectorAll(".slide"));
      const cur = app.querySelector("#dcur");
      const dotsWrap = app.querySelector("#dots");
      const fill = app.querySelector("#swfill");
      const startIdx = Math.max(0, Math.min(parseHash().idx||0, slides.length-1));
      const centerOf = (i)=> slides[i].offsetLeft + slides[i].offsetWidth/2 - swiper.clientWidth/2;
      const goTo = (i)=>{ i=Math.max(0,Math.min(i,slides.length-1)); swiper.scrollTo({ left: centerOf(i), behavior:"smooth" }); };
      const indexNow = ()=>{ const c = swiper.scrollLeft + swiper.clientWidth/2; let best=0,bd=Infinity;
        slides.forEach((s,i)=>{ const d=Math.abs((s.offsetLeft+s.offsetWidth/2)-c); if(d<bd){bd=d;best=i;} }); return best; };
      requestAnimationFrame(()=>{ swiper.scrollLeft = centerOf(startIdx); });

      app.querySelector("#dback").addEventListener("click",()=>{ location.hash = detail.dataset.section; });
      app.querySelector("#dprev").addEventListener("click",()=>goTo(indexNow()-1));
      app.querySelector("#dnext").addEventListener("click",()=>goTo(indexNow()+1));
      if (dotsWrap) dotsWrap.querySelectorAll("[data-dot]").forEach(d=>d.addEventListener("click",()=>goTo(+d.dataset.dot)));

      let raf;
      swiper.addEventListener("scroll",()=>{ cancelAnimationFrame(raf); raf = requestAnimationFrame(()=>{
        const i = indexNow();
        if (cur) cur.textContent = i+1;
        if (dotsWrap) dotsWrap.querySelectorAll(".dot").forEach((d,j)=>d.classList.toggle("active", j===i));
        if (fill){ const max = swiper.scrollWidth - swiper.clientWidth; fill.style.width = (max>0 ? (swiper.scrollLeft/max*100) : 100) + "%"; }
      }); });

      const hint = app.querySelector("#swipehint");
      let seen = false; try{ seen = !!localStorage.getItem("perla_swipehint"); }catch{}
      if (hint && slides.length > 1 && !seen){
        hint.classList.remove("hide");
        const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!reduce){
          setTimeout(()=>swiper.scrollBy({ left: 64, behavior:"smooth" }), 450);
          setTimeout(()=>swiper.scrollBy({ left: -64, behavior:"smooth" }), 950);
        }
        setTimeout(()=>hint.classList.add("hide"), 2800);
        try{ localStorage.setItem("perla_swipehint","1"); }catch{}
      }
    }

    app.querySelectorAll(".codebox[data-copy]").forEach(b=>b.addEventListener("click",()=>copy(b.dataset.copy,b.dataset.what)));

    const rm = app.querySelector("#readmore"), msg = app.querySelector("#welcomeMsg");
    if (rm && msg) rm.addEventListener("click",()=>{ msg.classList.toggle("clamp"); rm.classList.toggle("open");
      rm.firstChild.textContent = (msg.classList.contains("clamp") ? (LANG==="el"?"Περισσότερα ":"Read more ") : (LANG==="el"?"Λιγότερα ":"Show less ")); });

    const lb = app.querySelector("#langBtn"), lm = app.querySelector("#langMenu");
    if (lb && lm){
      lb.addEventListener("click",e=>{ e.stopPropagation(); lm.classList.toggle("open"); lb.setAttribute("aria-expanded", lm.classList.contains("open")); });
      document.addEventListener("click",()=>lm.classList.remove("open"), { once:true });
      lm.querySelectorAll("[data-setlang]").forEach(b=>b.addEventListener("click",()=>{
        LANG = b.dataset.setlang; SEARCH_INDEX = null; try{ localStorage.setItem("perla_lang",LANG); }catch{} render();
      }));
    }
    const wx = app.querySelector("#waX");
    if (wx) wx.addEventListener("click",(e)=>{ e.preventDefault(); e.stopPropagation(); waHidden = true; render(); });

    const search = app.querySelector("#homeSearch");
    if (search){
      const grid = app.querySelector("#homeGrid");
      const resultsBox = app.querySelector("#searchResults");
      const clearBtn = app.querySelector("#searchClear");
      const guideLabel = app.querySelector(".guide-label");
      const needBanner = app.querySelector(".needbanner");
      const reviewSlot = app.querySelector("#reviewSlot");

      const showBrowse = (on)=>{
        // hide the home browse UI while showing search results, and vice versa
        [grid, guideLabel, needBanner, reviewSlot].forEach(el=>{ if (el) el.style.display = on ? "" : "none"; });
      };
      const doSearch = ()=>{
        const q = search.value.trim();
        if (clearBtn) clearBtn.hidden = !q;
        if (!q){ resultsBox.innerHTML = ""; showBrowse(true); return; }
        resultsBox.innerHTML = searchResultsHTML(q);
        showBrowse(false);
        resultsBox.querySelectorAll("[data-sres]").forEach(b=>{
          b.addEventListener("click", ()=>{ location.hash = b.dataset.sres; });
        });
      };
      search.addEventListener("input", doSearch);
      if (clearBtn) clearBtn.addEventListener("click", ()=>{ search.value = ""; search.focus(); doSearch(); });

      // ---- voice input (Web Speech API; shown only where supported) ----
      const micBtn = app.querySelector("#searchMic");
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (micBtn && SR){
        micBtn.hidden = false;
        let rec = null, listening = false;
        micBtn.addEventListener("click", ()=>{
          if (listening && rec){ rec.stop(); return; }
          rec = new SR();
          rec.lang = LANG === "el" ? "el-GR" : (LANG === "en" ? "en-US" : LANG);
          rec.interimResults = true;
          rec.maxAlternatives = 1;
          rec.onstart = ()=>{ listening = true; micBtn.classList.add("listening"); toast(LANG==="el"?"Ακούω…":"Listening…"); };
          rec.onerror = (e)=>{ listening = false; micBtn.classList.remove("listening");
            if (e.error === "not-allowed" || e.error === "service-not-allowed")
              toast(LANG==="el"?"Δώστε άδεια μικροφώνου":"Microphone permission needed"); };
          rec.onend = ()=>{ listening = false; micBtn.classList.remove("listening"); };
          rec.onresult = (e)=>{
            let txt = "";
            for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript;
            search.value = txt;
            doSearch();
          };
          try { rec.start(); } catch { /* already started */ }
        });
      }
    }
    const heroSlider = app.querySelector("#heroSlider");
    const heroDots = app.querySelectorAll("#heroDots .hdot");
    if (heroSlider && heroDots.length){
      let raf2;
      heroSlider.addEventListener("scroll", ()=>{
        cancelAnimationFrame(raf2);
        raf2 = requestAnimationFrame(()=>{
          const w = heroSlider.clientWidth || 1;
          const i = Math.round(heroSlider.scrollLeft / w);
          heroDots.forEach((d,j)=>d.classList.toggle("active", j===i));
        });
      });
    }
    ensureWeather();
    wireStars();
  }

  function renderError(){
    app.innerHTML = `<div class="error"><h1>Guide not found</h1>
      <p>We couldn’t load <code>data/${esc(slug)}.json</code>.</p></div>`;
  }

  try{ LANG = localStorage.getItem("perla_lang") || "en"; }catch{}
  window.addEventListener("hashchange", render);

  if (window.__PERLA_DATA){
    DATA = window.__PERLA_DATA;
    const langs = (DATA.meta && DATA.meta.languages) || ["en"];
    if (!langs.includes(LANG)) LANG = langs[0];
    document.title = `${DATA.meta ? DATA.meta.name : "Guide"} · Perlahomes`;
    render();
    return;
  }

  fetch(`data/${slug}.json`, { cache:"no-cache" })
    .then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); })
    .then(d=>{ DATA = d;
      const langs = (d.meta && d.meta.languages) || ["en"];
      if (!langs.includes(LANG)) LANG = langs[0];
      document.title = `${d.meta ? d.meta.name : "Guide"} · Perlahomes`;
      render();
    })
    .catch(renderError);
})();
