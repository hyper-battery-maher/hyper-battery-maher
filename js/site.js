const cfg = window.SUPABASE_CONFIG || {};
const hasSB = !!(
  cfg.url &&
  cfg.anonKey &&
  !cfg.url.includes("YOUR-PROJECT") &&
  !cfg.anonKey.includes("YOUR_")
);
const sb = hasSB ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? "").replace(
  /[&<>"']/g,
  char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[char])
);

const isSubPage = window.location.pathname.includes("/pages/");
const asset = file => isSubPage ? `../assets/${file}` : `assets/${file}`;
const page = file => isSubPage ? file : `pages/${file}`;

const demo = [{
  id: "demo1",
  brand: "نمونه",
  name: "محصول نمونه",
  category: "خودرو",
  amperage: "—",
  price: "استعلام قیمت",
  description: "بعد از اتصال پنل مدیریت، محصولات واقعی فروشگاه اینجا نمایش داده می‌شوند.",
  image_url: asset("store-banner.png")
}];

let products = [];

function money(value) {
  if (value === null || value === undefined || value === "") return "استعلام قیمت";
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat("fa-IR").format(number) + " تومان"
    : esc(value);
}

async function getProducts() {
  if (sb) {
    const result = await sb
      .from("products")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (!result.error && result.data) products = result.data;
  }

  if (!products.length) products = demo;
  return products;
}

function productCard(product) {
  const image = product.image_url || asset("store-banner.png");

  return `
    <article class="product" onclick="openProduct('${esc(product.id)}')">
      <div class="product-image">
        <img loading="lazy" src="${esc(image)}"
             alt="${esc(product.brand || "باتری")} ${esc(product.name || "")}">
        <span class="badge">${esc(product.category || "باتری")}</span>
      </div>
      <div class="product-body">
        <h3>${esc(product.brand || "برند")}</h3>
        <b>${esc(product.name || "محصول")}</b>
        <p>${esc(product.description || "اطلاعات این محصول توسط مدیریت ثبت می‌شود.")}</p>
        <div class="meta">
          <span class="amp">⚡ ${esc(product.amperage || "—")}</span>
          <span class="price">${money(product.price)}</span>
        </div>
      </div>
    </article>
  `;
}

async function loadProducts(target = "#productsGrid", searchId = "search", catId = "category") {
  await getProducts();

  const targetEl = $(target);
  if (!targetEl) return;

  const cat = $(catId);
  if (cat) {
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    cat.innerHTML =
      '<option value="">همه دسته‌ها</option>' +
      categories.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join("");
  }

  const render = () => {
    const query = $(searchId)?.value.trim().toLowerCase() || "";
    const category = $(catId)?.value || "";

    const list = products.filter(product => {
      const text = `${product.brand || ""} ${product.name || ""} ${product.description || ""} ${product.amperage || ""}`.toLowerCase();
      return (!category || product.category === category) &&
             (!query || text.includes(query));
    });

    targetEl.innerHTML = list.length
      ? list.map(productCard).join("")
      : '<div class="empty">محصولی پیدا نشد.</div>';
  };

  $(searchId)?.addEventListener("input", render);
  $(catId)?.addEventListener("change", render);
  render();
}

window.openProduct = async id => {
  const product = products.find(item => String(item.id) === String(id));
  const modal = $("#productModal");

  if (!product || !modal) return;

  const image = product.image_url || asset("store-banner.png");

  $("#modalContent").innerHTML = `
    <div class="modal">
      <img src="${esc(image)}" alt="${esc(product.name || "")}"
           style="width:100%;max-height:360px;object-fit:contain;border-radius:16px;background:#061322">
      <span class="kicker">${esc(product.category || "باتری")}</span>
      <h2>${esc(product.brand || "")} — ${esc(product.name || "")}</h2>
      <p>${esc(product.description || "")}</p>
      <table class="comparison">
        <tr><th>آمپراژ</th><th>قیمت</th></tr>
        <tr>
          <td>${esc(product.amperage || "—")}</td>
          <td class="price">${money(product.price)}</td>
        </tr>
      </table>
      <div class="actions">
        <a class="btn primary" data-phone href="tel:">تماس برای استعلام</a>
        <a class="btn secondary" href="${page("contact.html")}">مسیریابی</a>
      </div>
    </div>
  `;

  if (typeof modal.showModal === "function") modal.showModal();
  else modal.hidden = false;

  await applySettings();
};

async function applySettings() {
  const settings = {};

  if (sb) {
    const result = await sb.from("site_settings").select("key,value");
    (result.data || []).forEach(item => settings[item.key] = item.value);
  }

  const address = settings.address || "اسلامشهر، خیابان گلها، نبش البرز ۷";
  document.querySelectorAll("[data-address]").forEach(el => el.textContent = address);

  document.querySelectorAll("[data-phone]").forEach(el => {
    if (settings.phone) {
      el.href = "tel:" + settings.phone.replace(/[^\d+]/g, "");
    } else {
      el.removeAttribute("href");
      el.setAttribute("title", "شماره تماس از پنل مدیریت تنظیم نشده است");
    }
  });

  const map = settings.google_maps ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  if ($("#gmap")) $("#gmap").href = map;
  if ($("#neshan")) $("#neshan").href = settings.neshan || "https://neshan.org/";
  if ($("#balad")) $("#balad").href = settings.balad || "https://balad.ir/";
  if ($("#instagram") && settings.instagram) $("#instagram").href = settings.instagram;
  if ($("#whatsapp") && settings.whatsapp) $("#whatsapp").href = settings.whatsapp;
}

document.addEventListener("DOMContentLoaded", async () => {
  await applySettings();

  if ($("#productsGrid")) {
    await loadProducts("#productsGrid");
  }

  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();
});
