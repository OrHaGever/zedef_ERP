/* -------------------------------------------------------
   STATE & CONSTANTS
------------------------------------------------------- */

const STORAGE_KEY = "visu_expense_app_v1";
const RECON_TOLERANCE = 5; // ₪

/* קטגוריות דיפולטיביות */
const DEFAULT_CATEGORIES = [
  "ירקות ופירות",
  "בשר ודגים",
  "מוצרי חלב",
  "מצרכי יסוד (סוגת וכו')",
  "מאפים וקינוחים",
  "שתייה קלה",
  "אלכוהול ובר",
  "קפה ותה",
  "חד\"פ ואריזות",
  "ניקיון ותחזוקה",
  "גז וחשמל",
  "מים וסננים",
  "תקשורת ואינטרנט",
  "שיווק ופרסום",
  "ציוד וכלי מטבח",
  "ציוד משרדי",
  "ארנונה ומסים",
  "שירותים מקצועיים",
  "כוח אדם"
];

/* ספקים דיפולטיביים — לפי בקשתך */
const DEFAULT_SUPPLIERS = [
  "מדחסקור אוניברסל","ג׳אקו שירות למטבחים","יוסי סימן טוב","י.שבי","צ.י.שיווק","קנקון",
  "לוילן סחר","עואודה לשיווק","מדג סי פרוט","אהרון שיווק","שיווק שלי","אקיפ",
  "דאלאס מוצרי נייר","חברת חשמל","א.א.ר שירותי ביוב","תמי 4","בזק","היכל היין",
  "החברה המרכזית","סוקליק","ביסקוטי","אייס דרים","ג.מ טעם הארץ","יזמקו",
  "אסטרטג טכנולוגיות","אביב אש","מניב ראשון","אודי בכור","לירי כוח אדם",
  "מש-נט","זאפ גרופ","שיא 10","קורקידי","מקס עסקים","וינטר גז",
  "מפעל הפרסום","וולט","אלירן פרחים","פרסום תבור","אינפיניה","ייצוגית פלוס",
  "משלוחה","ביימי טכנולוגיות","ישראכרט","סוגת","אייפרקטיקום","אמישרגז",
  "מאירוביץ","לה פסטה דלה קזה","ארנונה ראשון לציון"
];

/* מבנה המדינה */
let state = {
  categories: [],
  suppliers: [],
  months: {},
  currentMonth: ""
};

/* -------------------------------------------------------
   UTILITIES
------------------------------------------------------- */

function $(sel){ return document.querySelector(sel); }
function $all(sel){ return Array.from(document.querySelectorAll(sel)); }

function toast(msg){
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=> t.classList.remove("show"), 1800);
}

function money(n){
  n = Number(n)||0;
  return n.toLocaleString("he-IL",{minimumFractionDigits:2,maximumFractionDigits:2}) + " ₪";
}

function escapeHTML(str){
  return String(str||"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}

function ensureMonthExists(key){
  if(!state.months[key]){
    state.months[key] = { income: 0, deliveries: [], invoices: [] };
  }
}

/* -------------------------------------------------------
   LOAD / SAVE
------------------------------------------------------- */

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return false;
    state = JSON.parse(raw);
    return true;
  }catch(e){
    console.error(e);
    return false;
  }
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* -------------------------------------------------------
   INIT
------------------------------------------------------- */

function init(){
  const loaded = loadState();

  if(!loaded){
    // set month
    const d = new Date();
    const ym = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0");

    state.currentMonth = ym;
    state.categories = DEFAULT_CATEGORIES.map(c=>({name:c}));
    state.suppliers = DEFAULT_SUPPLIERS.map(n=>({name:n, category:"", template:"", phone:"", email:"", notes:""}));
    state.months = {};
    ensureMonthExists(ym);

    saveState();
  }

  // מצבי ברירת מחדל
  if(!state.categories.length){
    state.categories = DEFAULT_CATEGORIES.map(c=>({name:c}));
  }
  if(!state.suppliers.length){
    state.suppliers = DEFAULT_SUPPLIERS.map(n=>({name:n, category:"", template:"", phone:"", email:"", notes:""}));
  }

  ensureMonthExists(state.currentMonth);

  // רינדור UI
  renderNavigation();
  renderDashboard();
  renderCategoryList();
  renderSupplierList();
  renderSupplierSelects();
  renderEntrySupplierFilter();
  renderEntries();
  renderReconcile();
  renderReconcileSupplierSelect();

  // היום כתאריך דיפולטיבי
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  $("#date-input").value = today;
}

/* -------------------------------------------------------
   NAVIGATION
------------------------------------------------------- */

function renderNavigation(){
  const buttons = $all(".nav button");
  buttons.forEach(btn=>{
    btn.addEventListener("click",()=>{
      buttons.forEach(b=> b.classList.remove("active"));
      btn.classList.add("active");

      const target = btn.dataset.view;
      $all(".view").forEach(v=> v.style.display = "none");
      $("#" + target).style.display = "block";
    });
  });
}

/* -------------------------------------------------------
   DASHBOARD
------------------------------------------------------- */

function renderDashboard(){
  ensureMonthExists(state.currentMonth);
  const m = state.months[state.currentMonth];

  const totalDel = m.deliveries.reduce((s,e)=> s+Number(e.amount||0),0);
  const totalInv = m.invoices.reduce((s,e)=> s+Number(e.amount||0),0);

  $("#dash-deliveries").textContent = money(totalDel);
  $("#dash-invoices").textContent = money(totalInv);
  $("#dash-diff").textContent = money(totalInv - totalDel);

  $("#income-display").textContent = money(m.income || 0);
}

/* שינוי מחזור */
function updateIncome(){
  ensureMonthExists(state.currentMonth);
  const v = parseFloat($("#income-input").value)||0;
  state.months[state.currentMonth].income = v;
  saveState();
  renderDashboard();
}

/* שינוי חודש */
function changeMonth(){
  const m = $("#month-select").value;
  if(!m) return;
  state.currentMonth = m;
  ensureMonthExists(m);
  saveState();

  renderDashboard();
  renderEntries();
  renderReconcile();
  renderReconcileSupplierSelect();
}

/* -------------------------------------------------------
   CATEGORIES
------------------------------------------------------- */

function addCategory(){
  const name = $("#cat-name").value.trim();
  if(!name) return toast("יש להזין שם קטגוריה");

  if(state.categories.some(c=>c.name===name)){
    return toast("קטגוריה כבר קיימת");
  }

  state.categories.push({name});
  state.categories.sort((a,b)=> a.name.localeCompare(b.name,"he"));
  saveState();
  renderCategoryList();
  renderSupplierSelects();

  $("#cat-name").value = "";
  toast("קטגוריה נוספה");
}

function renderCategoryList(){
  const tbody = $("#cat-table-body");
  tbody.innerHTML = "";

  if(!state.categories.length){
    tbody.innerHTML = `<tr><td colspan="3">אין קטגוריות</td></tr>`;
    return;
  }

  state.categories.forEach((c,i)=>{
    tbody.innerHTML += `
      <tr>
        <td>${i+1}</td>
        <td>${escapeHTML(c.name)}</td>
        <td><button class="danger" onclick="deleteCategory(${i})">מחק</button></td>
      </tr>
    `;
  });
}

function deleteCategory(i){
  const name = state.categories[i].name;
  if(!confirm(`למחוק את הקטגוריה "${name}"?`)) return;

  state.categories.splice(i,1);
  state.suppliers.forEach(s=>{
    if(s.category===name) s.category = "";
  });

  saveState();
  renderCategoryList();
  renderSupplierList();
  renderSupplierSelects();
  toast("נמחק");
}

/* -------------------------------------------------------
   SUPPLIERS
------------------------------------------------------- */

function addSupplier(){
  const name = $("#sup-name").value.trim();
  if(!name) return toast("יש להזין שם ספק");

  const category = $("#sup-cat").value.trim();
  const phone = $("#sup-phone").value.trim();
  const email = $("#sup-email").value.trim();
  const notes = $("#sup-notes").value.trim();

  const newSup = {name, category, phone, email, notes, template:""};

  state.suppliers.push(newSup);
  state.suppliers.sort((a,b)=> a.name.localeCompare(b.name,"he"));
  saveState();

  $("#sup-name").value = "";
  $("#sup-cat").value = "";
  $("#sup-phone").value = "";
  $("#sup-email").value = "";
  $("#sup-notes").value = "";

  renderSupplierList();
  renderEntrySupplierFilter();
  renderSupplierSelects();
  toast("ספק נוסף");
}

function renderSupplierList(){
  const tbody = $("#sup-table-body");
  tbody.innerHTML = "";

  if(!state.suppliers.length){
    tbody.innerHTML = `<tr><td colspan="4">אין ספקים</td></tr>`;
    return;
  }

  state.suppliers.forEach((s,i)=>{
    tbody.innerHTML += `
      <tr>
        <td>${i+1}</td>
        <td>${escapeHTML(s.name)}</td>
        <td>${escapeHTML(s.category||"")}</td>
        <td><button class="danger" onclick="deleteSupplier(${i})">מחק</button></td>
      </tr>
    `;
  });
}

function deleteSupplier(i){
  const name = state.suppliers[i].name;
  if(!confirm(`למחוק את "${name}"?`)) return;

  state.suppliers.splice(i,1);
  saveState();

  renderSupplierList();
  renderEntrySupplierFilter();
  renderCategoryList();
  toast("נמחק");
}

function renderSupplierSelects(){
  const sel = $("#sup-cat");
  sel.innerHTML = `<option value="">ללא</option>`;
  state.categories.forEach(c=>{
    const opt = document.createElement("option");
    opt.value = c.name;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
}

/* -------------------------------------------------------
   ENTRIES
------------------------------------------------------- */

function addEntry(){
  ensureMonthExists(state.currentMonth);

  const type = $("#entry-type").value;
  const supplier = $("#entry-supplier").value.trim();
  const number = $("#entry-number").value.trim();
  const date = $("#date-input").value;
  const amount = parseFloat($("#entry-amount").value)||0;
  const notes = $("#entry-notes").value.trim();

  if(!supplier || !number || !amount){
    return toast("חובה למלא ספק, מספר וסכום");
  }

  const obj = { supplier, number, date, amount, notes, status:"unchecked", reconciled:false };

  if(type==="delivery"){ state.months[state.currentMonth].deliveries.push(obj); }
  else { state.months[state.currentMonth].invoices.push(obj); }

  saveState();

  $("#entry-number").value="";
  $("#entry-amount").value="";
  $("#entry-notes").value="";

  renderEntries();
  renderReconcile();
  renderReconcileSupplierSelect();
  toast("נוסף");
}

function renderEntrySupplierFilter(){
  const sel = $("#filter-supplier");
  sel.innerHTML = `<option value="">כל הספקים</option>`;

  const set = new Set();

  const m = state.months[state.currentMonth];
  m.deliveries.forEach(e=> set.add(e.supplier));
  m.invoices.forEach(e=> set.add(e.supplier));

  Array.from(set).sort((a,b)=>a.localeCompare(b,"he")).forEach(n=>{
    const opt = document.createElement("option");
    opt.value = n;
    opt.textContent = n;
    sel.appendChild(opt);
  });
}

function deleteEntry(type, index){
  const m = state.months[state.currentMonth];

  if(type==="delivery"){ m.deliveries.splice(index,1); }
  else { m.invoices.splice(index,1); }

  saveState();

  renderEntries();
  renderReconcile();
  renderReconcileSupplierSelect();
  toast("נמחק");
}

function updateEntryStatus(type,index,value){
  const m = state.months[state.currentMonth];
  if(type==="delivery"){ m.deliveries[index].status = value; }
  else { m.invoices[index].status = value; }
  saveState();
}

function renderEntries(){
  ensureMonthExists(state.currentMonth);
  const m = state.months[state.currentMonth];

  const filterType = $("#filter-type").value;
  const filterSupplier = $("#filter-supplier").value;
  const groupBy = $("#group-by").value;

  const data = [];

  m.deliveries.forEach((d,i)=> data.push({...d, type:"delivery", idx:i}));
  m.invoices.forEach((f,i)=> data.push({...f, type:"invoice", idx:i}));

  let filtered = data;

  if(filterType!=="all"){
    filtered = filtered.filter(e=> e.type===filterType);
  }

  if(filterSupplier){
    filtered = filtered.filter(e=> e.supplier===filterSupplier);
  }

  // Grouping logic
  let rows = [];
  let lastGroup = null;

  const tbody = $("#entries-table-body");
  tbody.innerHTML = "";

  filtered
    .sort((a,b)=>{
      if(groupBy==="supplier"){
        const s = a.supplier.localeCompare(b.supplier,"he");
        if(s!==0) return s;
      }
      if(groupBy==="date"){
        const s = (a.date||"").localeCompare(b.date||"");
        if(s!==0) return s;
      }
      return (a.date||"").localeCompare(b.date||"");
    })
    .forEach((e,i)=>{

      const key = groupBy==="supplier" ? e.supplier : groupBy==="date" ? e.date : null;

      if(key && key!==lastGroup){
        lastGroup = key;
        tbody.innerHTML += `
          <tr class="group-row"><td colspan="9">${escapeHTML(key||"")}</td></tr>
        `;
      }

      const badge = e.type==="delivery"
        ? `<span class="badge badge-rec">משלוח</span>`
        : `<span class="badge badge-one">חשבונית</span>`;

      tbody.innerHTML += `
        <tr>
          <td>${i+1}</td>
          <td>${badge}</td>
          <td>${escapeHTML(e.supplier)}</td>
          <td>${escapeHTML(e.number)}</td>
          <td>${escapeHTML(e.date)}</td>
          <td>${money(e.amount)}</td>
          <td>
            <select onchange="updateEntryStatus('${e.type}',${e.idx},this.value)">
              <option value="unchecked" ${e.status==="unchecked"?"selected":""}>לא נבדק</option>
              <option value="invoiced" ${e.status==="invoiced"?"selected":""}>בחשבונית</option>
              <option value="exception" ${e.status==="exception"?"selected":""}>חריג</option>
            </select>
          </td>
          <td>${escapeHTML(e.notes)}</td>
          <td><button class="danger" onclick="deleteEntry('${e.type}',${e.idx})">מחק</button></td>
        </tr>
      `;
    });
}

/* -------------------------------------------------------
   END-OF-MONTH RECONCILE
------------------------------------------------------- */

function renderReconcile(){
  ensureMonthExists(state.currentMonth);
  const m = state.months[state.currentMonth];

  const mapD={}, mapI={};

  m.deliveries.forEach(e=> mapD[e.supplier]=(mapD[e.supplier]||0)+e.amount );
  m.invoices.forEach(e=> mapI[e.supplier]=(mapI[e.supplier]||0)+e.amount );

  const table = $("#recon-table-body");
  table.innerHTML = "";

  const all = new Set([...Object.keys(mapD), ...Object.keys(mapI)]);

  Array.from(all).sort((a,b)=>a.localeCompare(b,"he")).forEach((sup,i)=>{
    const d = mapD[sup]||0;
    const f = mapI[sup]||0;
    const diff = f-d;

    let cls = "status-ok";
    let txt = "תואם";

    if(Math.abs(diff) > RECON_TOLERANCE){
      cls="status-problem"; txt="לא תואם";
    } else if(Math.abs(diff) > 0){
      cls="status-warn"; txt="סטייה קטנה";
    }

    table.innerHTML += `
      <tr>
        <td>${i+1}</td>
        <td>${escapeHTML(sup)}</td>
        <td>${money(d)}</td>
        <td>${money(f)}</td>
        <td>${money(diff)}</td>
        <td class="${cls}">${txt}</td>
      </tr>
    `;
  });
}

function renderReconcileSupplierSelect(){
  const sel = $("#recon-supplier");
  sel.innerHTML = `<option value="">בחר ספק…</option>`;

  const m = state.months[state.currentMonth];
  const set = new Set();

  m.deliveries.forEach(e=> set.add(e.supplier));
  m.invoices.forEach(e=> set.add(e.supplier));

  Array.from(set).sort((a,b)=>a.localeCompare(b,"he")).forEach(n=>{
    const opt = document.createElement("option");
    opt.value = n;
    opt.textContent = n;
    sel.appendChild(opt);
  });

  $("#recon-details").innerHTML = "";
}

function showReconcileDetails(){
  const sup = $("#recon-supplier").value;
  if(!sup){
    $("#recon-details").innerHTML = "";
    return;
  }

  ensureMonthExists(state.currentMonth);
  const m = state.months[state.currentMonth];

  const deliveries = m.deliveries.filter(e=> e.supplier===sup);
  const invoices = m.invoices.filter(e=> e.supplier===sup);

  let html = `<h3>פירוט עבור ${escapeHTML(sup)}</h3>`;

  html += `<p>סה"כ משלוחים: ${money(deliveries.reduce((s,e)=>s+e.amount,0))}</p>`;
  html += `<p>סה"כ חשבוניות: ${money(invoices.reduce((s,e)=>s+e.amount,0))}</p>`;

  html += `<br><h4>תעודות משלוח</h4>`;
  deliveries.forEach(e=>{
    html += `<div>- ${escapeHTML(e.number)} | ${money(e.amount)}</div>`;
  });

  html += `<br><h4>חשבוניות</h4>`;
  invoices.forEach(e=>{
    html += `<div>- ${escapeHTML(e.number)} | ${money(e.amount)}</div>`;
  });

  $("#recon-details").innerHTML = html;
}

/* -------------------------------------------------------
   BOOTSTRAP
------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", init);
