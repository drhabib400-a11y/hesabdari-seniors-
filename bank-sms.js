/* حسابداری حبیب - افزونه پیامک بانکی
   اشتراک‌گذاری پیامک از منوی Share اندروید؛ ثبت فقط پس از تأیید کاربر */
(function () {
  'use strict';
  const $ = (s, root=document) => root.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const digits = s => String(s || '').replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c));
  const amountNum = s => Number(digits(s).replace(/[^\d]/g, '')) || 0;
  const todayISO = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const money = n => Number(n || 0).toLocaleString('en-US') + ' تومان';
  const banks = ['ملی','ملت','صادرات','سپهر','تجارت','رفاه','کشاورزی','مسکن','پاسارگاد','پارسیان','سامان','آینده','شهر','دی','رسالت','سپه','اقتصاد نوین','گردشگری','قوامین','پست بانک','خاورمیانه','مهر ایران','سینا','کارآفرین','توسعه تعاون','ایران زمین'];
  function detectBank(t) {
    const s = String(t).replace(/\s/g,'');
    return banks.find(b => s.includes(b.replace(/\s/g,''))) || 'نامشخص';
  }
  function parseSms(raw) {
    const t = digits(raw).replace(/[٬،]/g, ',');
    const lower = t.toLowerCase();
    const isOut = /برداشت|خرید|پرداخت|انتقالوجه|کسر|debit|withdraw|purchase/i.test(lower);
    const isIn = /واریز|دریافت|افزایش|وصول|credit|deposit/i.test(lower);
    let direction = isOut ? 'expense' : (isIn ? 'income' : 'income');
    let candidates = [];
    const amountPatterns = [
      /(?:مبلغ|مبلغ\s*تراکنش|مبلغ\s*انتقال|واریز|برداشت|خرید|پرداخت)\s*[:：\-]?\s*([\d,]{4,})/i,
      /([\d,]{4,})\s*(?:ریال|تومان)/i,
      /(?:rial|toman|irr)\s*[:：]?\s*([\d,]{4,})/i
    ];
    for (const re of amountPatterns) { const m=t.match(re); if(m) { candidates.push(amountNum(m[1])); break; } }
    if (!candidates.length) {
      const nums = [...t.matchAll(/\d[\d,]{3,}/g)].map(m=>amountNum(m[0])).filter(n=>n>=1000 && n<100000000000);
      if (nums.length) candidates.push(nums.sort((a,b)=>b-a)[0]);
    }
    let amount = candidates[0] || 0;
    const rial = /ریال|rial|irr/i.test(t);
    const toman = /تومان|toman/i.test(t);
    let unitNote = '';
    if (rial && !toman) { amount = Math.round(amount / 10); unitNote = 'مبلغ ریالی بود و به تومان تبدیل شد؛ بررسی کنید.'; }
    else if (!toman && !rial) unitNote = 'واحد مبلغ در پیامک مشخص نیست؛ مبلغ را بررسی کنید.';
    const cardMatch = t.match(/(?:کارت|شماره\s*کارت|از\s*کارت|به\s*کارت)[^\d]{0,16}(?:\d{8,12})?(\d{4})/i) || t.match(/\b\d{12}(\d{4})\b/);
    const cardLast4 = cardMatch ? cardMatch[1] : '';
    const bank = detectBank(t);
    return { direction, amount, bank, cardLast4, date: todayISO(), unitNote,
      confidence: (amount>0 && (isOut||isIn)) ? 'قابل بررسی' : 'نیازمند تکمیل',
      title: (isOut?'برداشت بانکی':isIn?'واریز بانکی':'تراکنش بانکی') + (bank!=='نامشخص'?' - '+bank:'') };
  }
  function ensureState() {
    if (typeof state === 'undefined') return false;
    state.smsInbox = Array.isArray(state.smsInbox) ? state.smsInbox : [];
    return true;
  }
  function render() {
    if (!ensureState()) { $('#main').innerHTML = '<p>بخش پیامک بانکی آماده نیست. صفحه را تازه‌سازی کنید.</p>'; return; }
    const rows = state.smsInbox.map(x => {
      const p=x.parsed||parseSms(x.text);
      return `<tr><td>${esc(p.bank)}</td><td>${p.direction==='expense'?'برداشت':'واریز'}</td><td>${money(p.amount)}</td><td>${esc(p.cardLast4||'—')}</td><td>${esc(p.confidence||'')}</td><td><button class="btn receive" onclick="reviewBankSms('${x.id}')">بررسی و تأیید</button> <button class="btn danger" onclick="rejectBankSms('${x.id}')">رد</button></td></tr>`;
    }).join('');
    $('#main').innerHTML = `
      <div class="viewhead"><div><h2>پیامک‌های بانکی</h2><small>پیامک را از برنامه پیامک گوشی با گزینه «اشتراک‌گذاری» به حسابداری حبیب بفرستید.</small></div><button class="btn light" onclick="page('home')">بازگشت</button></div>
      <section class="panel" style="margin-bottom:12px">
        <h3>افزودن پیامک</h3>
        <p style="font-size:12px;line-height:1.9;color:#65798b">برای دریافت از همه بانک‌ها، متن پیامک را از برنامه پیامک گوشی Share کنید و «حسابداری حبیب» را انتخاب کنید. اگر اشتراک‌گذاری در دسترس نبود، متن پیامک را اینجا جای‌گذاری کنید.</p>
        <textarea id="bank-sms-text" rows="4" placeholder="متن کامل پیامک بانکی را اینجا جای‌گذاری کنید..." style="width:100%;border:1px solid #cbd9e5;border-radius:10px;padding:11px;direction:rtl"></textarea>
        <div class="actions" style="margin-top:9px"><button class="btn" onclick="addBankSmsFromText()">تحلیل و افزودن به فهرست بررسی</button><button class="btn light" onclick="requestBankSmsShareHelp()">راهنمای اشتراک‌گذاری</button></div>
      </section>
      <section class="panel">
        <div class="section-title"><h3>در انتظار تأیید (${state.smsInbox.length})</h3><span style="font-size:11px;color:#71859a">هیچ موردی بدون تأیید ثبت نمی‌شود</span></div>
        <div class="tablewrap"><table><thead><tr><th>بانک</th><th>نوع</th><th>مبلغ پیشنهادی</th><th>۴ رقم کارت</th><th>وضعیت تشخیص</th><th>عملیات</th></tr></thead><tbody>${rows||'<tr><td colspan="6" class="empty">پیامکی برای بررسی وجود ندارد.</td></tr>'}</tbody></table></div>
      </section>
      <section class="panel" style="margin-top:12px"><h3>نکات امنیتی</h3><p style="font-size:12px;line-height:1.9">رمز پویا، رمز کارت، CVV2 و اطلاعات ورود بانکی را ارسال نکنید. پیامک‌ها فقط روی همین دستگاه در حافظه حسابداری ذخیره می‌شوند. متن اصلی برای بررسی نگهداری می‌شود.</p></section>`;
  }
  function addSms(text) {
    if (!ensureState()) return;
    const clean=String(text||'').trim();
    if (!clean) { toast('متن پیامک خالی است'); return; }
    const norm=digits(clean).replace(/\s+/g,' ').trim();
    if (state.smsInbox.some(x=>digits(x.text).replace(/\s+/g,' ').trim()===norm) ||
        state.items.some(x=>x.smsSource===norm)) { toast('این پیامک قبلاً وارد شده است'); return; }
    state.smsInbox.unshift({id:newId(),text:clean,parsed:parseSms(clean),receivedAt:Date.now()});
    save(); render(); toast('پیامک برای بررسی اضافه شد');
  }
  window.addBankSmsFromText = function() { addSms($('#bank-sms-text')?.value || ''); };
  window.rejectBankSms = function(id) {
    if (!ensureState()) return;
    state.smsInbox=state.smsInbox.filter(x=>x.id!==id); save(); render(); toast('پیامک از فهرست بررسی حذف شد');
  };
  window.reviewBankSms = function(id) {
    const x=state.smsInbox.find(v=>v.id===id); if(!x) return;
    const p=x.parsed||parseSms(x.text);
    $('#main').innerHTML = `
      <div class="viewhead"><h2>بررسی پیامک بانکی</h2><button class="btn light" onclick="page('bankSms')">بازگشت</button></div>
      <section class="panel"><div class="field"><label>متن اصلی پیامک</label><textarea rows="4" readonly>${esc(x.text)}</textarea></div>
      <form id="bank-sms-review" class="formgrid" style="margin-top:12px">
        <div class="field"><label>نوع تراکنش</label><select name="direction"><option value="income" ${p.direction==='income'?'selected':''}>واریز / درآمد</option><option value="expense" ${p.direction==='expense'?'selected':''}>برداشت / هزینه</option></select></div>
        <div class="field"><label>بانک</label><input name="bank" value="${esc(p.bank)}"></div>
        <div class="field"><label>مبلغ به تومان (قابل اصلاح)</label><input name="amount" inputmode="numeric" value="${p.amount||''}" required></div>
        <div class="field"><label>تاریخ شمسی (فعلاً امروز)</label><input name="date" value="${esc(window.jalaliToday?jalaliToday():p.date)}" required></div>
        <div class="field"><label>چهار رقم آخر کارت</label><input name="last4" maxlength="4" inputmode="numeric" value="${esc(p.cardLast4)}"></div>
        <div class="field"><label>شرح تراکنش</label><input name="title" value="${esc(p.title)}" required></div>
        <div class="field full"><label>یادداشت</label><input name="memo" value="${esc(p.unitNote)}"></div>
        <div class="field full"><button class="btn receive">تأیید و ثبت در حسابداری</button><button type="button" class="btn light" onclick="page('bankSms')">لغو</button></div>
      </form></section>`;
    $('#bank-sms-review').onsubmit=e=>{
      e.preventDefault();
      const f=new FormData(e.target), raw=digits(f.get('amount')).replace(/[^\d]/g,'');
      const amount=Number(raw), jdate=String(f.get('date')||'').trim();
      const iso=window.jalaliToISO?jalaliToISO(jdate):null;
      if(!amount||amount<=0){alert('مبلغ معتبر وارد کنید.');return;}
      if(!iso){alert('تاریخ شمسی را بررسی کنید.');return;}
      const norm=digits(x.text).replace(/\s+/g,' ').trim();
      state.items.push({id:newId(),type:f.get('direction'),category:f.get('direction')==='income'?'واریز بانکی':'برداشت بانکی',
        title:String(f.get('title')||'تراکنش بانکی'),amount,date:iso,person:'',method:'پیامک بانکی',
        memo:`بانک: ${f.get('bank')||'نامشخص'} | کارت: ${f.get('last4')||'—'} | ${f.get('memo')||''}`,
        smsSource:norm});
      state.smsInbox=state.smsInbox.filter(v=>v.id!==id); save();
      toast('تراکنش پس از تأیید شما ثبت شد'); page('reports');
    };
  };
  window.requestBankSmsShareHelp = function() {
    alert('۱) برنامه پیامک گوشی را باز کنید. ۲) پیامک بانکی را لمس طولانی کنید. ۳) گزینه اشتراک‌گذاری (Share) را بزنید. ۴) حسابداری حبیب را انتخاب کنید. اگر نام برنامه نمایش داده نشد، ابتدا نسخه نصب‌شده را به‌روزرسانی و دوباره نصب کنید.');
  };
  window.bankSmsPage = render;
  const originalPage=window.page;
  if (typeof originalPage==='function') {
    window.page=function(p) { if(p==='bankSms') { document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.page==='bankSms')); render(); } else originalPage(p); };
  }
  function addNav() {
    const nav=$('.sidebar'); if(!nav || $('[data-page="bankSms"]')) return;
    const cards=$('[data-page="cards"]');
    const b=document.createElement('button'); b.className='nav'; b.dataset.page='bankSms';
    b.innerHTML='<span class="ico">✉</span>پیامک بانکی'; b.addEventListener('click',()=>page('bankSms'));
    if(cards) cards.insertAdjacentElement('afterend',b); else nav.appendChild(b);
  }
  function openDb() {
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open('habib-bank-sms-share',1);
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('inbox'))req.result.createObjectStore('inbox');};
      req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
    });
  }
  async function importShared() {
    try {
      const db=await openDb();
      const tx=db.transaction('inbox','readwrite'), store=tx.objectStore('inbox');
      const req=store.get('latest');
      req.onsuccess=()=>{
        const data=req.result;
        if(data && data.text) addSms([data.title,data.text,data.url].filter(Boolean).join('\n'));
        store.delete('latest');
      };
    } catch(e) { console.warn('دریافت پیامک اشتراکی انجام نشد',e); }
  }
  function boot() {
    addNav(); importShared();
    if(new URLSearchParams(location.search).has('bank-sms')) page('bankSms');
    window.addEventListener('pageshow',()=>{addNav();importShared();});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();