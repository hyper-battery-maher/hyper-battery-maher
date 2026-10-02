const cfg = window.SUPABASE_CONFIG || {};

const hasSB =
  cfg.url &&
  cfg.anonKey &&
  !cfg.url.includes("YOUR-PROJECT") &&
  !cfg.anonKey.includes("YOUR_");

const SB = hasSB
  ? window.supabase.createClient(cfg.url, cfg.anonKey)
  : null;

let brands = [];
let products = [];


/* =====================================================
   HELPERS
===================================================== */

function $(id) {
  return document.getElementById(id);
}

function escapeHTML(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]
  );
}

function money(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "استعلام قیمت";
  }

  const n = Number(value);

  if (!Number.isFinite(n)) {
    return escapeHTML(value);
  }

  return (
    new Intl.NumberFormat("fa-IR").format(n) +
    " تومان"
  );
}


/* =====================================================
   LOGIN
===================================================== */

function showLogin() {
  if ($("login")) $("login").hidden = false;
  if ($("app")) $("app").hidden = true;
}

function showApp() {
  if ($("login")) $("login").hidden = true;
  if ($("app")) $("app").hidden = false;
}

async function login() {

  const email = $("email")?.value.trim();
  const password = $("pass")?.value;

  if (!email || !password) {
    if ($("msg")) {
      $("msg").textContent =
        "ایمیل و رمز عبور را وارد کن.";
    }
    return;
  }

  const btn = $("loginBtn");

  if (btn) {
    btn.disabled = true;
    btn.textContent = "در حال ورود...";
  }

  try {

    if (!SB) {
      throw new Error(
        "اتصال Supabase تنظیم نشده است."
      );
    }

    const { data, error } =
      await SB.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      throw error;
    }

    if (!data?.session) {
      throw new Error(
        "نشست کاربر ایجاد نشد."
      );
    }

    if ($("msg")) {
      $("msg").textContent =
        "ورود موفق بود";
    }

    showApp();

    await loadAll();

  } catch (error) {

    console.error(error);

    if ($("msg")) {
      $("msg").textContent =
        "خطا: " + error.message;
    }

  } finally {

    if (btn) {
      btn.disabled = false;
      btn.textContent = "ورود به پنل";
    }

  }
}

function setupLogin() {

  $("loginBtn")?.addEventListener(
    "click",
    login
  );

  $("email")?.addEventListener(
    "keydown",
    event => {
      if (event.key === "Enter") {
        login();
      }
    }
  );

  $("pass")?.addEventListener(
    "keydown",
    event => {
      if (event.key === "Enter") {
        login();
      }
    }
  );
}

async function logout() {

  if (SB) {
    await SB.auth.signOut();
  }

  showLogin();

  if ($("email")) $("email").value = "";
  if ($("pass")) $("pass").value = "";
}


/* =====================================================
   TABS
===================================================== */

function setupTabs() {

  const buttons =
    document.querySelectorAll(
      ".admin-tabs button"
    );

  buttons.forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const name =
          button.dataset.tab;

        if (!name) return;

        buttons.forEach(btn => {
          btn.classList.remove("active");
        });

        button.classList.add("active");

        document
          .querySelectorAll(".admin-section")
          .forEach(section => {
            section.hidden = true;
          });

        const section =
          document.getElementById(
            "tab-" + name
          );

        if (section) {
          section.hidden = false;
        }

      }
    );

  });

}


/* =====================================================
   LOAD ALL
===================================================== */

async function loadAll() {

  await loadBrands();
  await loadProducts();
  await loadSettings();

}


/* =====================================================
   BRANDS
===================================================== */

async function loadBrands() {

  if (!SB) return;

  const { data, error } =
    await SB
      .from("brands")
      .select("*")
      .order("name", {
        ascending: true
      });

  if (error) {

    console.error(
      "BRANDS ERROR:",
      error
    );

    return;
  }

  brands = data || [];

  renderBrandSelect();
  renderBrands();

}


function renderBrandSelect(selected = "") {

  const select =
    $("productBrand");

  if (!select) return;

  if (!brands.length) {

    select.innerHTML = `
      <option value="">
        ابتدا یک برند اضافه کنید
      </option>
    `;

    return;
  }

  select.innerHTML = `
    <option value="">
      انتخاب برند
    </option>
  `;

  brands.forEach(brand => {

    const option =
      document.createElement("option");

    option.value = brand.id;

    option.textContent =
      brand.name +
      (
        brand.active === false
          ? " (غیرفعال)"
          : ""
      );

    if (
      String(brand.id) ===
      String(selected)
    ) {
      option.selected = true;
    }

    select.appendChild(option);

  });

}


function renderBrands() {

  const list =
    $("brandList");

  if (!list) return;

  if (!brands.length) {

    list.innerHTML = `
      <div class="admin-card">
        هنوز برندی اضافه نشده است.
      </div>
    `;

    return;
  }

  list.innerHTML =
    brands.map(
      brand => `

        <div class="admin-card">

          <div class="admin-row">

            ${
              brand.logo_url
                ? `
                  <img
                    src="${escapeHTML(
                      brand.logo_url
                    )}"
                    alt=""
                    style="
                      width:60px;
                      height:60px;
                      object-fit:contain;
                      border-radius:12px;
                    "
                  >
                `
                : ""
            }

            <div style="flex:1">

              <h3>
                ${escapeHTML(
                  brand.name
                )}
              </h3>

              <p>
                ${escapeHTML(
                  brand.description || ""
                )}
              </p>

              <small>
                وضعیت:
                ${
                  brand.active === false
                    ? "غیرفعال"
                    : "فعال"
                }
              </small>

            </div>

            <div>

              <button
                class="btn secondary"
                type="button"
                onclick="editBrand('${brand.id}')"
              >
                ویرایش
              </button>

              <button
                class="btn danger"
                type="button"
                onclick="deleteBrand('${brand.id}')"
              >
                حذف
              </button>

            </div>

          </div>

        </div>

      `
    ).join("");

}


/* =====================================================
   BRAND FORM
===================================================== */

function setupBrandForm() {

  const form =
    $("brandForm");

  if (!form) return;

  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const id =
        form.elements.namedItem("id")?.value || "";

      const name =
        form.elements.namedItem("name")?.value.trim();

      const logo =
        form.elements.namedItem("logo_url")?.value.trim();

      const description =
        form.elements.namedItem("description")?.value.trim();

      const active =
        form.elements.namedItem("active")?.checked ?? true;

      if (!name) {
        alert("نام برند را وارد کن.");
        return;
      }

      const payload = {
        name,
        logo_url: logo || null,
        description: description || null,
        active
      };

      let result;

      if (id) {

        result =
          await SB
            .from("brands")
            .update(payload)
            .eq("id", id);

      } else {

        result =
          await SB
            .from("brands")
            .insert(payload);

      }

      if (result.error) {

        console.error(
          "BRAND SAVE ERROR:",
          result.error
        );

        alert(
          "خطا در ذخیره برند:\n\n" +
          result.error.message
        );

        return;
      }

      alert(
        id
          ? "برند ویرایش شد."
          : "برند اضافه شد."
      );

      resetBrandForm();

      await loadBrands();

    }
  );

}


function resetBrandForm() {

  const form =
    $("brandForm");

  if (!form) return;

  form.reset();

  const id =
    form.elements.namedItem("id");

  if (id) id.value = "";

  if ($("brandFormBox")) {
    $("brandFormBox").hidden = true;
  }

}


function editBrand(id) {

  const brand =
    brands.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!brand) return;

  const form =
    $("brandForm");

  if (!form) return;

  form.elements.namedItem("id").value =
    brand.id;

  form.elements.namedItem("name").value =
    brand.name || "";

  form.elements.namedItem("logo_url").value =
    brand.logo_url || "";

  form.elements.namedItem("description").value =
    brand.description || "";

  form.elements.namedItem("active").checked =
    brand.active !== false;

  if ($("brandFormBox")) {
    $("brandFormBox").hidden = false;
  }

  form.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

}


async function deleteBrand(id) {

  const brand =
    brands.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!brand) return;

  const ok =
    confirm(
      `برند «${brand.name}» حذف شود؟`
    );

  if (!ok) return;

  const { error } =
    await SB
      .from("brands")
      .delete()
      .eq("id", id);

  if (error) {

    alert(
      "حذف انجام نشد:\n" +
      error.message
    );

    return;
  }

  await loadBrands();
  await loadProducts();

}


/* =====================================================
   PRODUCTS
===================================================== */

async function loadProducts() {

  if (!SB) return;

  const { data, error } =
    await SB
      .from("products")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {

    console.error(
      "PRODUCTS ERROR:",
      error
    );

    return;
  }

  products = data || [];

  renderProducts();

}


function renderProducts() {

  const list =
    $("productList");

  if (!list) return;

  if (!products.length) {

    list.innerHTML = `
      <div class="admin-card">

        هنوز محصولی ثبت نشده است.

        <br><br>

        روی «+ محصول جدید» کلیک کن.

      </div>
    `;

    return;
  }

  list.innerHTML =
    products.map(product => {

      const brand =
        brands.find(
          item =>
            String(item.id) ===
            String(product.brand_id)
        );

      const brandName =
        brand?.name ||
        product.brand ||
        "بدون برند";

      return `

        <div class="admin-card">

          <div class="admin-row">

            ${
              product.image_url
                ? `
                  <img
                    src="${escapeHTML(
                      product.image_url
                    )}"
                    alt=""
                    style="
                      width:90px;
                      height:90px;
                      object-fit:contain;
                      border-radius:15px;
                    "
                  >
                `
                : ""
            }

            <div style="flex:1">

              <h3>
                ${escapeHTML(
                  product.name || "محصول"
                )}
              </h3>

              <p>
                برند:
                <b>
                  ${escapeHTML(
                    brandName
                  )}
                </b>
              </p>

              <p>
                آمپراژ:
                ${escapeHTML(
                  product.amperage || "—"
                )}
              </p>

              <p>
                قیمت:
                <b>
                  ${money(product.price)}
                </b>
              </p>

              <small>
                وضعیت:
                ${
                  product.active === false
                    ? "غیرفعال"
                    : "فعال"
                }
              </small>

            </div>

            <div>

              <button
                class="btn secondary"
                type="button"
                onclick="editProduct('${product.id}')"
              >
                ویرایش
              </button>

              <button
                class="btn danger"
                type="button"
                onclick="deleteProduct('${product.id}')"
              >
                حذف
              </button>

            </div>

          </div>

        </div>

      `;

    }).join("");

}


/* =====================================================
   IMAGE PREVIEW
===================================================== */

function showImagePreview(file) {

  if (!file) return;

  const form =
    $("productForm");

  if (!form) return;

  let preview =
    $("productImagePreview");

  if (!preview) {

    preview =
      document.createElement("div");

    preview.id =
      "productImagePreview";

    preview.style.cssText = `
      margin-top:12px;
      padding:10px;
      border-radius:14px;
      background:#f5f5f5;
      text-align:center;
    `;

    const imageInput =
      form.elements.namedItem("image");

    if (imageInput) {
      imageInput.parentElement.appendChild(
        preview
      );
    }

  }

  const reader =
    new FileReader();

  reader.onload = event => {

    preview.innerHTML = `
      <div style="font-size:13px;margin-bottom:8px;">
        پیش‌نمایش تصویر
      </div>

      <img
        src="${event.target.result}"
        alt="پیش‌نمایش"
        style="
          max-width:220px;
          max-height:180px;
          object-fit:contain;
          border-radius:12px;
        "
      >
    `;

  };

  reader.readAsDataURL(file);

}


/* =====================================================
   PASTE IMAGE
===================================================== */

function setupImagePaste() {

  const form =
    $("productForm");

  if (!form) return;

  form.addEventListener(
    "paste",
    event => {

      const clipboard =
        event.clipboardData;

      if (!clipboard) return;

      const items =
        Array.from(
          clipboard.items || []
        );

      const imageItem =
        items.find(
          item =>
            item.kind === "file" &&
            item.type.startsWith("image/")
        );

      if (!imageItem) {
        return;
      }

      const file =
        imageItem.getAsFile();

      if (!file) return;

      event.preventDefault();

      let pastedFile =
        file;

      const extension =
        file.type.split("/")[1] || "png";

      pastedFile =
        new File(
          [file],
          `pasted-image-${Date.now()}.${extension}`,
          {
            type: file.type,
            lastModified: Date.now()
          }
        );

      const imageInput =
        form.elements.namedItem("image");

      if (!imageInput) {
        alert(
          "فیلد انتخاب تصویر در فرم پیدا نشد."
        );
        return;
      }

      try {

        const dataTransfer =
          new DataTransfer();

        dataTransfer.items.add(
          pastedFile
        );

        imageInput.files =
          dataTransfer.files;

        showImagePreview(
          pastedFile
        );

        alert(
          "تصویر با موفقیت Paste شد."
        );

      } catch (error) {

        console.error(
          "PASTE IMAGE ERROR:",
          error
        );

        alert(
          "مرورگر اجازه قرار دادن تصویر Paste شده را نداد. می‌توانی از انتخاب فایل استفاده کنی."
        );

      }

    }
  );

}


/* =====================================================
   PRODUCT FORM
===================================================== */

function setupProductForm() {

  const form =
    $("productForm");

  if (!form) return;

  const imageInput =
    form.elements.namedItem("image");

  if (imageInput) {

    imageInput.addEventListener(
      "change",
      () => {

        const file =
          imageInput.files?.[0];

        if (file) {
          showImagePreview(file);
        }

      }
    );

  }

  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const id =
        form.elements.namedItem("id")?.value || "";

      const brandId =
        form.elements.namedItem("brand_id")?.value || "";

      const name =
        form.elements.namedItem("name")?.value.trim() || "";

      const category =
        form.elements.namedItem("category")?.value.trim() || "";

      const amperage =
        form.elements.namedItem("amperage")?.value.trim() || "";

      const priceText =
        form.elements.namedItem("price")?.value.trim() || "";

      const description =
        form.elements.namedItem("description")?.value.trim() || "";

      const active =
        form.elements.namedItem("active")?.checked ?? true;

      const imageInput =
        form.elements.namedItem("image");

      const imageUrlInput =
        form.elements.namedItem("image_url");

      if (!brandId) {
        alert("ابتدا برند محصول را انتخاب کن.");
        return;
      }

      if (!name) {
        alert("نام محصول را وارد کن.");
        return;
      }

      const brand =
        brands.find(
          item =>
            String(item.id) ===
            String(brandId)
        );

      if (!brand) {
        alert("برند انتخاب‌شده پیدا نشد.");
        return;
      }

      let price = null;

      if (priceText !== "") {

        price =
          Number(
            priceText.replace(/,/g, "")
          );

        if (!Number.isFinite(price)) {
          alert("قیمت صحیح نیست.");
          return;
        }

      }

      const button =
        form.querySelector(
          'button[type="submit"]'
        );

      try {

        if (button) {
          button.disabled = true;
          button.textContent =
            "در حال ذخیره...";
        }

        let imageUrl =
          imageUrlInput?.value.trim() || "";

        /* =============================================
           UPLOAD IMAGE
        ============================================= */

        if (
          imageInput &&
          imageInput.files &&
          imageInput.files.length
        ) {

          const file =
            imageInput.files[0];

          if (!file.type.startsWith("image/")) {
            throw new Error(
              "فایل انتخاب‌شده تصویر نیست."
            );
          }

          if (
            file.size >
            10 * 1024 * 1024
          ) {
            throw new Error(
              "حجم تصویر نباید بیشتر از ۱۰ مگابایت باشد."
            );
          }

          const extension =
            (
              file.name.split(".").pop() ||
              "jpg"
            ).toLowerCase();

          const safeName =
            file.name
              .replace(/\.[^/.]+$/, "")
              .replace(
                /[^a-zA-Z0-9\u0600-\u06FF_-]/g,
                "-"
              )
              .slice(0, 50);

          const fileName =
            `products/${Date.now()}-${safeName}.${extension}`;

          const upload =
            await SB.storage
              .from("product-images")
              .upload(
                fileName,
                file,
                {
                  cacheControl: "3600",
                  upsert: false
                }
              );

          if (upload.error) {
            throw upload.error;
          }

          const publicUrl =
            SB.storage
              .from("product-images")
              .getPublicUrl(fileName);

          imageUrl =
            publicUrl.data.publicUrl;

          if (imageUrlInput) {
            imageUrlInput.value =
              imageUrl;
          }

        }

        /* =============================================
           PREVENT BLOB URL
        ============================================= */

        if (
          imageUrl &&
          imageUrl.startsWith("blob:")
        ) {
          throw new Error(
            "تصویر قبلی دارای لینک موقت است. لطفاً تصویر را دوباره انتخاب یا Paste کن."
          );
        }

        /* =============================================
           SAVE PRODUCT
        ============================================= */

        const payload = {

          brand_id: brand.id,

          brand:
            brand.name,

          name,

          category:
            category || null,

          amperage:
            amperage || null,

          price,

          image_url:
            imageUrl || null,

          description:
            description || null,

          active

        };

        let result;

        if (id) {

          result =
            await SB
              .from("products")
              .update(payload)
              .eq("id", id);

        } else {

          result =
            await SB
              .from("products")
              .insert(payload);

        }

        if (result.error) {
          throw result.error;
        }

        alert(
          id
            ? "محصول با موفقیت ویرایش شد."
            : "محصول با موفقیت اضافه شد."
        );

        resetProductForm();

        await loadProducts();

      } catch (error) {

        console.error(
          "PRODUCT SAVE ERROR:",
          error
        );

        alert(
          "خطا در ذخیره محصول:\n\n" +
          (error.message || error)
        );

      } finally {

        if (button) {
          button.disabled = false;
          button.textContent =
            "ذخیره محصول";
        }

      }

    }
  );

  /* فعال کردن Paste تصویر */
  setupImagePaste();

}


/* =====================================================
   PRODUCT EDIT
===================================================== */

function editProduct(id) {

  const product =
    products.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!product) return;

  const form =
    $("productForm");

  if (!form) return;

  form.elements.namedItem("id").value =
    product.id;

  form.elements.namedItem("brand_id").value =
    product.brand_id || "";

  form.elements.namedItem("name").value =
    product.name || "";

  form.elements.namedItem("category").value =
    product.category || "";

  form.elements.namedItem("amperage").value =
    product.amperage || "";

  form.elements.namedItem("price").value =
    product.price ?? "";

  form.elements.namedItem("description").value =
    product.description || "";

  form.elements.namedItem("active").checked =
    product.active !== false;

  const imageUrl =
    form.elements.namedItem("image_url");

  if (imageUrl) {
    imageUrl.value =
      product.image_url || "";
  }

  const file =
    form.elements.namedItem("image");

  if (file) {
    file.value = "";
  }

  const preview =
    $("productImagePreview");

  if (preview) {
    preview.innerHTML = "";
  }

  renderBrandSelect(
    product.brand_id || ""
  );

  if ($("productFormBox")) {
    $("productFormBox").hidden = false;
  }

  form.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

}


/* =====================================================
   RESET PRODUCT
===================================================== */

function resetProductForm() {

  const form =
    $("productForm");

  if (!form) return;

  form.reset();

  const id =
    form.elements.namedItem("id");

  if (id) {
    id.value = "";
  }

  const active =
    form.elements.namedItem("active");

  if (active) {
    active.checked = true;
  }

  const imageUrl =
    form.elements.namedItem("image_url");

  if (imageUrl) {
    imageUrl.value = "";
  }

  const preview =
    $("productImagePreview");

  if (preview) {
    preview.innerHTML = "";
  }

  if ($("productFormBox")) {
    $("productFormBox").hidden = true;
  }

}


/* =====================================================
   DELETE PRODUCT
===================================================== */

async function deleteProduct(id) {

  const product =
    products.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!product) return;

  const ok =
    confirm(
      `محصول «${product.name}» حذف شود؟`
    );

  if (!ok) return;

  const { error } =
    await SB
      .from("products")
      .delete()
      .eq("id", id);

  if (error) {

    console.error(
      "PRODUCT DELETE ERROR:",
      error
    );

    alert(
      "حذف انجام نشد:\n" +
      error.message
    );

    return;
  }

  await loadProducts();

}


/* =====================================================
   SETTINGS
===================================================== */

async function loadSettings() {

  if (!SB) return;

  const { data, error } =
    await SB
      .from("site_settings")
      .select("key,value");

  if (error) {

    console.error(
      "SETTINGS LOAD ERROR:",
      error
    );

    return;
  }

  const settings = {};

  (data || []).forEach(item => {
    settings[item.key] =
      item.value ?? "";
  });

  const fields = [
    "address",
    "phone",
    "google_maps",
    "neshan",
    "balad",
    "instagram",
    "whatsapp"
  ];

  fields.forEach(key => {

    const field =
      $(key);

    if (field) {
      field.value =
        settings[key] || "";
    }

  });

}


/* =====================================================
   SETTINGS SAVE
===================================================== */

async function saveSettings() {

  if (!SB) return;

  const keys = [
    "address",
    "phone",
    "google_maps",
    "neshan",
    "balad",
    "instagram",
    "whatsapp"
  ];

  try {

    for (const key of keys) {

      const field =
        $(key);

      if (!field) continue;

      const value =
        field.value.trim();

      const { error } =
        await SB
          .from("site_settings")
          .upsert(
            {
              key,
              value
            },
            {
              onConflict: "key"
            }
          );

      if (error) {
        throw error;
      }

    }

    alert(
      "تنظیمات با موفقیت ذخیره شد."
    );

  } catch (error) {

    console.error(
      "SETTINGS SAVE ERROR:",
      error
    );

    alert(
      "خطا در ذخیره تنظیمات:\n" +
      error.message
    );

  }

}


/* =====================================================
   BUTTONS
===================================================== */

function setupButtons() {

  $("logoutBtn")?.addEventListener(
    "click",
    logout
  );

  $("cancelBrand")?.addEventListener(
    "click",
    resetBrandForm
  );

  $("cancelProduct")?.addEventListener(
    "click",
    resetProductForm
  );

  $("addBrand")?.addEventListener(
    "click",
    () => {

      const form =
        $("brandForm");

      if (form) {
        form.reset();

        const id =
          form.elements.namedItem("id");

        if (id) id.value = "";
      }

      if ($("brandFormBox")) {
        $("brandFormBox").hidden = false;
      }

    }
  );

  $("addProduct")?.addEventListener(
    "click",
    () => {

      resetProductForm();

      if ($("productFormBox")) {
        $("productFormBox").hidden = false;
      }

      renderBrandSelect();

    }
  );

  $("saveSettings")?.addEventListener(
    "click",
    saveSettings
  );

}


/* =====================================================
   START
===================================================== */

async function boot() {

  console.log(
    "ADMIN PANEL START"
  );

  if (!SB) {

    console.error(
      "Supabase config missing"
    );

    if ($("msg")) {
      $("msg").textContent =
        "اتصال Supabase تنظیم نشده است.";
    }

    return;
  }

  setupLogin();

  setupTabs();

  setupBrandForm();

  setupProductForm();

  setupButtons();

  const {
    data,
    error
  } =
    await SB.auth.getSession();

  if (error) {

    console.error(error);

    showLogin();

    return;
  }

  if (data?.session) {

    console.log(
      "SESSION FOUND"
    );

    showApp();

    await loadAll();

  } else {

    console.log(
      "NO SESSION"
    );

    showLogin();

  }

}


/* =====================================================
   GLOBAL
===================================================== */

window.editBrand =
  editBrand;

window.deleteBrand =
  deleteBrand;

window.editProduct =
  editProduct;

window.deleteProduct =
  deleteProduct;


/* =====================================================
   RUN
===================================================== */

boot();