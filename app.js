document.addEventListener('DOMContentLoaded', async () => {
  'use strict';

  const SUPABASE_URL = 'https://mclyuqhltbrhqzgalcuy.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_bZGkBsFcCDEtVYQ-8FhQSQ_G8wc7IS5';

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const el = (id) => document.getElementById(id);

  if (!window.supabase) {
    el('loginError').textContent = 'Supabase kon niet worden geladen. Ververs de pagina.';
    return;
  }

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  let customers = [], jobs = [], editId = null, activeCustomer = null;

  const login = el('login'), app = el('app'), loginForm = el('loginForm');
  const email = el('email'), password = el('password'), loginError = el('loginError');
  const logout = el('logout'), pageTitle = el('title');
  const customerDialog = el('customerDialog'), customerForm = el('customerForm');
  const newCustomer = el('newCustomer'), newCustomer2 = el('newCustomer2');
  const customerSearch = el('customerSearch'), customerRows = el('customerRows');
  const jobDialog = el('jobDialog'), jobForm = el('jobForm'), jobHeading = el('jobHeading');
  const newJob = el('newJob'), pickSearch = el('pickSearch'), picker = el('picker'), customerId = el('customerId');
  const statusFilter = el('statusFilter'), jobCards = el('jobCards');
  const nCustomers = el('nCustomers'), nOpen = el('nOpen'), nWeek = el('nWeek'), revenue = el('revenue');
  const recent = el('recent'), today = el('today'), planningRows = el('planningRows');
  const detailDialog = el('detailDialog'), detailName = el('detailName'), detailInfo = el('detailInfo');
  const detailJobs = el('detailJobs'), detailNewJob = el('detailNewJob'), call = el('call'), wa = el('wa');

  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const cname = id => customers.find(c => String(c.id) === String(id))?.name || 'Onbekend';
  const euro = n => '€ ' + Number(n || 0).toLocaleString('nl-NL', {minimumFractionDigits:2});
  const fmt = d => d ? new Date(d).toLocaleString('nl-NL', {dateStyle:'medium', timeStyle:'short'}) : 'Geen datum';
  const wp = p => { p=String(p||'').replace(/\D/g,''); return p.startsWith('0') ? '31'+p.slice(1) : p; };

  function showApp(v) {
    login.style.display = v ? 'none' : 'grid';
    app.hidden = !v;
  }

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    loginError.textContent = 'Bezig met inloggen…';
    const { data, error } = await db.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value
    });
    if (error) {
      loginError.textContent = 'Inloggen mislukt: ' + error.message;
      return;
    }
    if (!data.session) {
      loginError.textContent = 'Geen geldige sessie ontvangen.';
      return;
    }
    loginError.textContent = '';
    showApp(true);
    await load();
  });

  logout.addEventListener('click', async e => {
    e.preventDefault();
    await db.auth.signOut();
    showApp(false);
  });

  async function load() {
    const [c,j] = await Promise.all([
      db.from('customers').select('*').order('name'),
      db.from('jobs').select('*').order('created_at',{ascending:false})
    ]);
    if (c.error || j.error) {
      alert('Databasefout: ' + (c.error?.message || j.error?.message));
      return;
    }
    customers = c.data || [];
    jobs = j.data || [];
    render();
  }

  $$('nav button').forEach(b => b.addEventListener('click', () => {
    $$('nav button').forEach(x => x.classList.remove('active'));
    $$('.page').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    el(b.dataset.page).classList.add('active');
    pageTitle.textContent = b.textContent;
  }));

  function openCustomer() {
    customerForm.reset();
    customerDialog.showModal();
  }
  newCustomer.addEventListener('click', openCustomer);
  newCustomer2.addEventListener('click', openCustomer);
  $('.cancel', customerDialog).addEventListener('click', () => customerDialog.close());

  customerForm.addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    const {error} = await db.from('customers').insert(d);
    if (error) return alert(error.message);
    customerDialog.close();
    await load();
  });

  function showPicker(q='') {
    const a = [...customers]
      .sort((a,b)=>a.name.localeCompare(b.name,'nl'))
      .filter(c => [c.name,c.phone,c.email,c.address].join(' ').toLowerCase().includes(q.toLowerCase()));
    picker.innerHTML = a.map(c => `<div class="pick" data-id="${c.id}"><b>${esc(c.name)}</b>${c.phone?`<div class="muted">${esc(c.phone)}</div>`:''}</div>`).join('') || '<div class="pick muted">Geen klant gevonden</div>';
    picker.classList.add('open');
    $$('[data-id]', picker).forEach(x => x.addEventListener('click', () => {
      const c = customers.find(c => String(c.id) === String(x.dataset.id));
      customerId.value = c.id;
      pickSearch.value = c.name;
      picker.classList.remove('open');
    }));
  }
  pickSearch.addEventListener('input', () => { customerId.value=''; showPicker(pickSearch.value); });
  pickSearch.addEventListener('focus', () => showPicker(pickSearch.value));

  function openJob(id=null,cid=null) {
    if (!customers.length) return alert('Maak eerst een klant aan.');
    editId = id;
    jobForm.reset();
    customerId.value = '';
    jobHeading.textContent = id ? 'Opdracht bewerken' : 'Nieuwe opdracht';
    if (id) {
      const j = jobs.find(x => String(x.id) === String(id));
      if (!j) return;
      customerId.value = j.customer_id;
      pickSearch.value = cname(j.customer_id);
      jobForm.elements.title.value = j.title || '';
      if (j.job_date) {
        let d = new Date(j.job_date);
        d = new Date(d.getTime()-d.getTimezoneOffset()*60000);
        jobForm.elements.job_date.value = d.toISOString().slice(0,16);
      }
      jobForm.elements.status.value = j.status || 'Offerte';
      jobForm.elements.amount.value = j.amount || '';
      jobForm.elements.notes.value = j.notes || '';
    } else if (cid) {
      const c = customers.find(x => String(x.id) === String(cid));
      if (c) { customerId.value=c.id; pickSearch.value=c.name; }
    }
    picker.classList.remove('open');
    jobDialog.showModal();
  }
  newJob.addEventListener('click', () => openJob());
  $('.cancel', jobDialog).addEventListener('click', () => jobDialog.close());

  jobForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!customerId.value) return alert('Kies eerst een klant uit de zoeklijst.');
    const d = Object.fromEntries(new FormData(e.currentTarget));
    d.customer_id = Number(d.customer_id);
    d.amount = Number(d.amount || 0);
    d.job_date = d.job_date ? new Date(d.job_date).toISOString() : null;
    const q = editId ? db.from('jobs').update(d).eq('id',editId) : db.from('jobs').insert(d);
    const {error} = await q;
    if (error) return alert(error.message);
    jobDialog.close();
    editId = null;
    await load();
  });

  async function delJob(id) {
    if (!confirm('Opdracht verwijderen?')) return;
    const {error}=await db.from('jobs').delete().eq('id',id);
    if (error) return alert(error.message);
    await load();
  }
  async function delCustomer(id) {
    if (!confirm('Klant en gekoppelde opdrachten verwijderen?')) return;
    const {error}=await db.from('customers').delete().eq('id',id);
    if (error) return alert(error.message);
    await load();
  }

  function renderCustomers() {
    const q = customerSearch.value.toLowerCase();
    const a = [...customers].sort((a,b)=>a.name.localeCompare(b.name,'nl'))
      .filter(c=>Object.values(c).join(' ').toLowerCase().includes(q));
    customerRows.innerHTML = a.map(c=>`<tr><td><a href="#" class="open-customer" data-id="${c.id}"><b>${esc(c.name)}</b></a>${c.notes?`<div class="muted">${esc(c.notes)}</div>`:''}</td><td>${esc(c.phone)}<br><span class="muted">${esc(c.email)}</span></td><td>${esc(c.address)}</td><td><a href="#" class="delete-customer" data-id="${c.id}">Verwijder</a></td></tr>`).join('') || '<tr><td colspan="4" class="empty">Geen klanten</td></tr>';
    $$('.open-customer', customerRows).forEach(a=>a.addEventListener('click',e=>{e.preventDefault();openDetail(a.dataset.id)}));
    $$('.delete-customer', customerRows).forEach(a=>a.addEventListener('click',e=>{e.preventDefault();delCustomer(a.dataset.id)}));
  }
  customerSearch.addEventListener('input', renderCustomers);

  function renderJobs() {
    const a=jobs.filter(j=>!statusFilter.value||j.status===statusFilter.value);
    jobCards.innerHTML=a.map(j=>`<article><span class="badge">${esc(j.status)}</span><b>${esc(j.title)}</b><p>${esc(cname(j.customer_id))}</p>${j.job_date?`<p>${fmt(j.job_date)}</p>`:''}${j.amount?`<strong>${euro(j.amount)}</strong>`:''}${j.notes?`<p>${esc(j.notes)}</p>`:''}<p><a href="#" class="edit-job" data-id="${j.id}">Bewerken</a> · <a href="#" class="delete-job" data-id="${j.id}">Verwijderen</a></p></article>`).join('')||'<div class="empty">Geen opdrachten</div>';
    $$('.edit-job',jobCards).forEach(a=>a.addEventListener('click',e=>{e.preventDefault();openJob(a.dataset.id)}));
    $$('.delete-job',jobCards).forEach(a=>a.addEventListener('click',e=>{e.preventDefault();delJob(a.dataset.id)}));
  }
  statusFilter.addEventListener('change',renderJobs);

  function render() {
    nCustomers.textContent=customers.length;
    nOpen.textContent=jobs.filter(j=>j.status!=='Betaald').length;
    const now=new Date(), w=new Date(now); w.setDate(w.getDate()+7);
    nWeek.textContent=jobs.filter(j=>j.job_date&&new Date(j.job_date)>=now&&new Date(j.job_date)<=w).length;
    revenue.textContent=euro(jobs.filter(j=>['Gefactureerd','Betaald'].includes(j.status)).reduce((a,j)=>a+Number(j.amount||0),0));
    recent.innerHTML=jobs.slice(0,5).map(j=>`<div class="item"><b>${esc(j.title)}</b><span class="badge">${esc(j.status)}</span><br><small>${esc(cname(j.customer_id))}</small></div>`).join('')||'<div class="empty">Nog geen opdrachten</div>';
    const d=now.toLocaleDateString('sv-SE');
    today.innerHTML=jobs.filter(j=>j.job_date&&new Date(j.job_date).toLocaleDateString('sv-SE')===d).map(j=>`<div class="item"><b>${fmt(j.job_date)} · ${esc(j.title)}</b></div>`).join('')||'<div class="empty">Geen afspraken vandaag</div>';
    planningRows.innerHTML=jobs.filter(j=>j.job_date).sort((a,b)=>new Date(a.job_date)-new Date(b.job_date)).map(j=>`<div class="item"><b>${fmt(j.job_date)}</b> — ${esc(j.title)} <span class="badge">${esc(cname(j.customer_id))}</span></div>`).join('')||'<div class="empty">Planning is leeg</div>';
    renderCustomers(); renderJobs();
  }

  function openDetail(id) {
    const c=customers.find(x=>String(x.id)===String(id)); if(!c)return;
    activeCustomer=c.id; detailName.textContent=c.name;
    detailInfo.className='detail-info';
    detailInfo.innerHTML=[c.phone&&`<div><small>TELEFOON</small><br><b>${esc(c.phone)}</b></div>`,c.email&&`<div><small>E-MAIL</small><br><b>${esc(c.email)}</b></div>`,c.address&&`<div><small>ADRES</small><br><b>${esc(c.address)}</b></div>`,c.notes&&`<div><small>NOTITIES</small><br><b>${esc(c.notes)}</b></div>`].filter(Boolean).join('');
    call.href='tel:'+c.phone; wa.href='https://wa.me/'+wp(c.phone);
    const a=jobs.filter(j=>String(j.customer_id)===String(id));
    detailJobs.innerHTML=a.map(j=>`<div class="history"><b>${esc(j.title)}</b><span class="badge">${esc(j.status)}</span><div class="muted">${fmt(j.job_date)}</div>${j.notes?`<p>${esc(j.notes)}</p>`:''}<a href="#" class="detail-edit-job" data-id="${j.id}">Bewerken</a></div>`).join('')||'<div class="empty">Nog geen opdrachten</div>';
    $$('.detail-edit-job',detailJobs).forEach(a=>a.addEventListener('click',e=>{e.preventDefault();detailDialog.close();openJob(a.dataset.id)}));
    detailDialog.showModal();
  }
  $('.x',detailDialog).addEventListener('click',()=>detailDialog.close());
  detailNewJob.addEventListener('click',()=>{detailDialog.close();openJob(null,activeCustomer)});

  const {data:{session}, error} = await db.auth.getSession();
  if (error) loginError.textContent = error.message;
  if (session) { showApp(true); await load(); } else showApp(false);
});
