/* gallery.js — refactored for clarity and efficiency
   ✦ Keeps categories & subcategories in JSON-defined order
   ✦ Avoids repeated code for sorting/filtering
   ✦ Cleaner DOM building (reusable helpers)
*/

let data = {};
let photos = [];
const gallery = document.getElementById("gallery");
let currentIndex = 0;
const batchSize = 20;
const filtersContainer = document.getElementById("filters");

// Maps to store button references
const mainButtons = new Map();       // category -> button
const subButtons = new Map();        // "category|subcategory" -> button

// Define your preferred order for main categories
const mainCategoryOrder = ['all', 'kazan', 'moscow', 'peterburg', 'other'];

// Define subcategory order per main category
const subCategoryOrder = {
  kazan: [],
  moscow: [],
  peterburg: [],
  other: ['irbis', 'hands']
};

// ---------------- helpers ----------------

// Natural sort (for filenames if no `order` or `date`)
function naturalKey(s) {
  return s.split(/(\d+)/).map(part => {
    const n = parseInt(part, 10);
    return Number.isNaN(n) ? part.toLowerCase() : n;
  });
}
function naturalCompare(a, b) {
  const A = naturalKey(a), B = naturalKey(b);
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    if (A[i] === undefined) return -1;
    if (B[i] === undefined) return 1;
    if (A[i] !== B[i]) return A[i] < B[i] ? -1 : 1;
  }
  return 0;
}

// Get ordered category keys
const getCategories = () =>
  Object.entries(data.categories || {})
    .sort((a, b) => (a[1].order ?? 999) - (b[1].order ?? 999))
    .map(([k]) => k);

// Get ordered subcategories for a category
const getSubcategories = cat =>
  Object.entries(data.categories?.[cat]?.subcategories || {})
    .sort((a, b) => (a[1].order ?? 999) - (b[1].order ?? 999))
    .map(([k]) => k);

// Sort photos (order > date > filename)
function sortPhotos(arr) {
  return [...arr].sort((a, b) => {
    if (a.order != null && b.order != null) return a.order - b.order;
    if (a.order != null) return -1;
    if (b.order != null) return 1;

    if (a.date && b.date) return new Date(a.date) - new Date(b.date);

    return naturalCompare(a.full.split("/").pop(), b.full.split("/").pop());
  });
}

// Create a button element
function makeButton(text, onClick, extraClass = "") {
  const btn = document.createElement("button");
  btn.textContent = text;
  if (extraClass) btn.classList.add(extraClass);
  btn.onclick = onClick;
  return btn;
}

// Show lightbox
function openLightbox(img) {
  const lightbox = document.createElement("div");
  lightbox.id = "lightbox";
  lightbox.innerHTML = `<img src="${img.dataset.full}" alt="${img.alt}">`;
  lightbox.onclick = () => lightbox.remove();
  document.body.appendChild(lightbox);
}

// ---------------- UI builders ----------------

function buildFilters() {
  const categories = {};
  photos.forEach(photo => {
    if (!categories[photo.category]) categories[photo.category] = new Set();
    if (photo.subcategory) categories[photo.category].add(photo.subcategory);
  });

  filtersContainer.innerHTML = '';
  mainButtons.clear();
  subButtons.clear();

  // All button
  const allWrapper = document.createElement('div');
  allWrapper.classList.add('category-wrapper');
  const allBtn = document.createElement('button');
  allBtn.id = 'all-button';
  allBtn.classList.add('active');
  allBtn.textContent = 'All';
  allBtn.onclick = () => filterPhotos('all');
  mainButtons.set('all', allBtn);
  allWrapper.appendChild(allBtn);
  filtersContainer.appendChild(allWrapper);

  // Use mainCategoryOrder to loop
  mainCategoryOrder.forEach(category => {
    if (!categories[category]) return; // skip missing categories

    const wrapper = document.createElement('div');
    wrapper.classList.add('category-wrapper');

    const btn = document.createElement('button');
    btn.textContent = category;
    btn.onclick = () => showSubcategories(wrapper, category, categories[category]);
    mainButtons.set(category, btn);
    wrapper.appendChild(btn);

    const subContainer = document.createElement('div');
    subContainer.classList.add('subfilters-local');
    wrapper.appendChild(subContainer);

    filtersContainer.appendChild(wrapper);

    // Add subcategories in defined order
    const orderedSubs = subCategoryOrder[category] || [...categories[category]];
    orderedSubs.forEach(sub => {
      if (!categories[category].has(sub)) return; // skip if sub not present
      const subBtn = document.createElement('button');
      subBtn.textContent = sub;
      subBtn.onclick = () => filterPhotos(category, sub);
      subButtons.set(`${category}|${sub}`, subBtn);
    });
  });
}


function clearSubfilters() {
  document.querySelectorAll(".subfilters-local").forEach(sc => sc.innerHTML = "");
}

function showSubcategories(wrapper, category, subcats) {
  // Reset active state for all main buttons
  document.querySelectorAll('#filters > .category-wrapper > button').forEach(btn => btn.classList.remove('active'));
  
  // Hide all subcategories
  document.querySelectorAll('.subfilters-local').forEach(sub => sub.innerHTML = '');

  // Set active for clicked main category
  wrapper.querySelector('button').classList.add('active');

  // Load main category photos only (exclude subcategories)
  filterPhotos(category);

  // Add subcategory buttons if they exist
  if (subcats.size > 0) {
    const subContainer = wrapper.querySelector('.subfilters-local');
    subcats.forEach(sub => {
      const subBtn = document.createElement('button');
      subBtn.textContent = sub;
      subBtn.onclick = () => filterPhotos(category, sub);
      subContainer.appendChild(subBtn);
    });
  }
}

function setActiveButton(btn, scope = document.querySelectorAll("#filters button")) {
  scope.forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

// ---------------- gallery rendering ----------------
function loadPhotosBatch(category = 'all', subcategory = null) {
  gallery.innerHTML = '';
  currentIndex = 0;

  // Show description only for specific category/subcategory
  if (category !== 'all') {
    let descText = "";
    if (subcategory) {
      const key = data.categories[category]?.subcategories[subcategory];
      if (key) descText = key.description || "";
    } else {
      descText = data.categories[category]?.description || "";
    }

    if (descText) {
      const desc = document.createElement('p');
      desc.textContent = descText;
      desc.style.margin = '0 0 20px 0';
      desc.style.fontSize = '1rem';
      desc.style.color = '#555';
      gallery.appendChild(desc);
    }
  }

  if (category === 'all') {
    // Show only main photos in mainCategoryOrder
    mainCategoryOrder.forEach(cat => {
      const mainPhotos = photos.filter(p => p.category === cat && !p.subcategory);
      if (!mainPhotos.length) return;

      // Category title
      const title = document.createElement('h2');
      title.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
      title.style.gridColumn = '1 / -1';
      title.style.margin = '30px 0 15px 0';
      title.style.fontSize = '1.3rem';
      title.style.color = '#111';
      gallery.appendChild(title);

      // Append photos
      mainPhotos.forEach(photo => {
        const img = document.createElement('img');
        img.src = photo.thumb;
        img.alt = photo.alt;
        img.dataset.full = photo.full;
        img.onclick = () => openLightbox(img);
        gallery.appendChild(img);
      });
    });

    const oldButton = document.getElementById('load-more');
    if (oldButton) oldButton.remove();
    return;
  }

  // Filter for single category/subcategory
  let filtered = photos.filter(p => p.category === category && (!subcategory || p.subcategory === subcategory));

  // If subcategory is null, order subcategories
  if (!subcategory && subCategoryOrder[category]) {
    const orderedPhotos = [];
    subCategoryOrder[category].forEach(sub => {
      const subPhotos = filtered.filter(p => p.subcategory === sub);
      orderedPhotos.push(...subPhotos);
    });
    const mainPhotos = filtered.filter(p => !p.subcategory); // main photos first
    filtered = [...mainPhotos, ...orderedPhotos];
  } else if (!subcategory) {
    const mainPhotos = filtered.filter(p => !p.subcategory);
    const subPhotos = filtered.filter(p => p.subcategory);
    filtered = [...mainPhotos, ...subPhotos];
  }

  // Batch load
  const batch = filtered.slice(currentIndex, currentIndex + batchSize);
  batch.forEach(photo => {
    const img = document.createElement('img');
    img.src = photo.thumb;
    img.alt = photo.alt;
    img.dataset.full = photo.full;
    img.onclick = () => openLightbox(img);
    gallery.appendChild(img);
  });

  currentIndex += batch.length;

  // Load More button
  const oldButton = document.getElementById('load-more');
  if (oldButton) oldButton.remove();
  if (currentIndex < filtered.length) {
    const btn = document.createElement('button');
    btn.id = 'load-more';
    btn.textContent = 'Load More';
    btn.style.display = 'block';
    btn.style.margin = '20px auto';
    btn.onclick = () => loadPhotosBatch(category, subcategory);
    gallery.parentNode.appendChild(btn);
  }
}




function renderPhoto(photo) {
  const img = document.createElement("img");
  img.src = photo.thumb;
  img.alt = photo.alt;
  img.dataset.full = photo.full;
  img.onclick = () => openLightbox(img);
  gallery.appendChild(img);
}

function renderBatch(list, category, subcat) {
  const batch = list.slice(currentIndex, currentIndex + batchSize);
  batch.forEach(renderPhoto);
  currentIndex += batch.length;

  removeLoadMore();
  if (currentIndex < list.length) {
    const btn = makeButton("Load More", () =>
      renderBatch(list, category, subcat)
    );
    btn.id = "load-more";
    btn.style.display = "block";
    btn.style.margin = "20px auto";
    gallery.parentNode.appendChild(btn);
  }
}

function removeLoadMore() {
  const old = document.getElementById("load-more");
  if (old) old.remove();
}

// ---------------- filtering ----------------
function filterPhotos(category, subcategory = null) {
  // Reset active classes
  mainButtons.forEach(btn => btn.classList.remove('active'));
  subButtons.forEach(btn => btn.classList.remove('active'));

  // Set active
  if (subcategory) {
    const key = `${category}|${subcategory}`;
    const subBtn = subButtons.get(key);
    if (subBtn) subBtn.classList.add('active');
  } else {
    const btn = mainButtons.get(category);
    if (btn) btn.classList.add('active');
  }

  // Reset gallery and load photos
  currentIndex = 0;
  gallery.innerHTML = '';
  loadPhotosBatch(category, subcategory);
}


// ---------------- init ----------------
fetch("photos_data.json")
  .then(res => res.json())
  .then(json => {
    data = json;
    photos = data.photos || [];
    buildFilters();
    loadPhotosBatch("all");
  })
  .catch(err => console.error("Error loading photos_data.json:", err));
