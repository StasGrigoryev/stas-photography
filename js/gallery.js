/* gallery.js — enhanced with lightbox metadata display
   ✦ Shows photo description & date in lightbox
   ✦ Closes with click outside image or Escape key
   ✦ Keeps category/subcategory filtering logic intact
*/

let data = {};
let photos = [];
const gallery = document.getElementById("gallery");
const filtersContainer = document.getElementById("filters");

let currentIndex = 0;
const batchSize = 20;

// Lightbox setup
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxDesc = document.getElementById("lightbox-desc");
const lightboxDate = document.getElementById("lightbox-date");
const lightboxPrev = document.getElementById("lightbox-prev");
const lightboxNext = document.getElementById("lightbox-next");

const mainButtons = new Map();
const subButtons = new Map();

const mainCategoryOrder = ['all', 'kazan', 'peterburg', 'other'];
const subCategoryOrder = {
  kazan: [],
  moscow: [],
  peterburg: [],
  other: ['moscow', 'irbis', 'hands']
};

// ---------- helpers ----------
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

function sortPhotos(arr) {
  return [...arr].sort((a, b) => {
    if (a.order != null && b.order != null) return a.order - b.order;
    if (a.order != null) return -1;
    if (b.order != null) return 1;
    if (a.date && b.date) return new Date(a.date) - new Date(b.date);
    return naturalCompare(a.full.split("/").pop(), b.full.split("/").pop());
  });
}

function makeButton(text, onClick, extraClass = "") {
  const btn = document.createElement("button");
  btn.textContent = text;
  if (extraClass) btn.classList.add(extraClass);
  btn.onclick = onClick;
  return btn;
}

function openLightbox(photo) {
  const index = photos.findIndex(p => p.full === photo.full);
  currentIndex = index;

  lightboxImg.src = photo.full;
  lightboxImg.alt = photo.alt;
  lightboxDesc.textContent = photo.description || "";
  lightboxDate.textContent = photo.date ? `${photo.date}` : "";

  lightbox.classList.add("visible");
}

function showNextPhoto() {
  if (photos.length === 0) return;
  currentIndex = (currentIndex + 1) % photos.length;
  openLightbox(photos[currentIndex]);
}

function showPrevPhoto() {
  if (photos.length === 0) return;
  currentIndex = (currentIndex - 1 + photos.length) % photos.length;
  openLightbox(photos[currentIndex]);
}

lightboxNext.addEventListener("click", e => {
  e.stopPropagation();
  showNextPhoto();
});
lightboxPrev.addEventListener("click", e => {
  e.stopPropagation();
  showPrevPhoto();
});

// Hide lightbox when clicking anywhere
document.getElementById("lightbox").addEventListener("click", () => {
  document.getElementById("lightbox").classList.remove("visible");
});

// Close on Escape key
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && lightbox.classList.contains("visible")) closeLightbox();
  else if (e.key === "ArrowRight" && lightbox.classList.contains("visible")) showNextPhoto();
  else if (e.key === "ArrowLeft" && lightbox.classList.contains("visible")) showPrevPhoto();
});

// ---------- UI builders ----------
function buildFilters() {
  const categories = {};
  photos.forEach(photo => {
    if (!categories[photo.category]) categories[photo.category] = new Set();
    if (photo.subcategory) categories[photo.category].add(photo.subcategory);
  });

  filtersContainer.innerHTML = '';
  mainButtons.clear();
  subButtons.clear();

  // “All” button
  const allWrapper = document.createElement('div');
  allWrapper.classList.add('category-wrapper');
  const allBtn = makeButton('all', () => {
    // Hide all subfilters when clicking "All"
    document.querySelectorAll('.subfilters-local').forEach(sub => sub.style.display = 'none');
    // Reset main/sub button active states
    document.querySelectorAll('#filters > .category-wrapper > button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.subfilters-local button').forEach(btn => btn.classList.remove('active'));
    allBtn.classList.add('active');
    // Load all photos
    filterPhotos('all');
  }, 'active');
  mainButtons.set('all', allBtn);
  allWrapper.appendChild(allBtn);
  filtersContainer.appendChild(allWrapper);

  // Main categories
  mainCategoryOrder.forEach(category => {
    if (!categories[category]) return;

    const wrapper = document.createElement('div');
    wrapper.classList.add('category-wrapper');

    const btn = makeButton(category, () => showSubcategories(wrapper, category, categories[category]));
    mainButtons.set(category, btn);
    wrapper.appendChild(btn);

    const subContainer = document.createElement('div');
    subContainer.classList.add('subfilters-local');
    wrapper.appendChild(subContainer);

    filtersContainer.appendChild(wrapper);

    const orderedSubs = subCategoryOrder[category] || [...categories[category]];
    orderedSubs.forEach(sub => {
      if (!categories[category].has(sub)) return;
      const subBtn = makeButton(sub, () => filterPhotos(category, sub));
      subButtons.set(`${category}|${sub}`, subBtn);
    });
  });
}

function showSubcategories(wrapper, category, subcats) {
  // Hide all other subfilters
  document.querySelectorAll('.subfilters-local').forEach(sub => {
    sub.style.display = 'none';
    sub.innerHTML = '';
  });

  // Reset active classes
  document.querySelectorAll('#filters > .category-wrapper > button').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.subfilters-local button').forEach(btn => btn.classList.remove('active'));

  // Activate this category
  wrapper.querySelector('button').classList.add('active');
  filterPhotos(category);

  // Build subfilters and show them
  if (subcats.size > 0) {
    const subContainer = wrapper.querySelector('.subfilters-local');
    subcats.forEach(sub => {
      const subBtn = makeButton(sub, () => filterPhotos(category, sub));
      subContainer.appendChild(subBtn);
    });
    subContainer.style.display = 'flex';
  }
}

// ---------- Gallery ----------
function loadPhotosBatch(category = 'all', subcategory = null) {
  gallery.innerHTML = '';
  currentIndex = 0;

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
      desc.classList.add('category-description');
      gallery.appendChild(desc);
    }
  }

  if (category === 'all') {
    mainCategoryOrder.forEach(cat => {
      const mainPhotos = photos.filter(p => p.category === cat && !p.subcategory);
      if (!mainPhotos.length) return;

      const title = document.createElement('h2');
      title.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
      title.classList.add('category-title');
      gallery.appendChild(title);

      mainPhotos.forEach(photo => {
        const img = document.createElement('img');
        img.src = photo.thumb;
        img.alt = photo.alt;
        img.onclick = () => openLightbox(photo);
        gallery.appendChild(img);
      });
    });
    removeLoadMore();
    return;
  }

  let filtered = photos.filter(p => p.category === category && (!subcategory || p.subcategory === subcategory));

  if (!subcategory && subCategoryOrder[category]) {
    const orderedPhotos = [];
    subCategoryOrder[category].forEach(sub => {
      const subPhotos = filtered.filter(p => p.subcategory === sub);
      orderedPhotos.push(...subPhotos);
    });
    const mainPhotos = filtered.filter(p => !p.subcategory);
    filtered = [...mainPhotos, ...orderedPhotos];
  } else if (!subcategory) {
    const mainPhotos = filtered.filter(p => !p.subcategory);
    const subPhotos = filtered.filter(p => p.subcategory);
    filtered = [...mainPhotos, ...subPhotos];
  }

  renderBatch(filtered, category, subcategory);
}

function renderBatch(list, category, subcat) {
  const batch = list.slice(currentIndex, currentIndex + batchSize);
  batch.forEach(photo => {
    const img = document.createElement("img");
    img.src = photo.thumb;
    img.alt = photo.alt;
    img.onclick = () => openLightbox(photo);
    gallery.appendChild(img);
  });

  currentIndex += batch.length;

  removeLoadMore();
  if (currentIndex < list.length) {
    const btn = makeButton("Load More", () => renderBatch(list, category, subcat));
    btn.id = "load-more";
    btn.classList.add("load-more-btn");
    gallery.parentNode.appendChild(btn);
  }
}

function removeLoadMore() {
  const old = document.getElementById("load-more");
  if (old) old.remove();
}

// ---------- Filtering ----------
function filterPhotos(category, subcategory = null) {
  mainButtons.forEach(btn => btn.classList.remove('active'));
  subButtons.forEach(btn => btn.classList.remove('active'));

  if (subcategory) {
    const key = `${category}|${subcategory}`;
    const subBtn = subButtons.get(key);
    if (subBtn) subBtn.classList.add('active');
  } else {
    const btn = mainButtons.get(category);
    if (btn) btn.classList.add('active');
  }

  currentIndex = 0;
  gallery.innerHTML = '';
  loadPhotosBatch(category, subcategory);
}

// ---------- Init ----------
fetch("photos_data.json")
  .then(res => res.json())
  .then(json => {
    data = json;
    photos = data.photos || [];
    buildFilters();
    loadPhotosBatch("all");
  })
  .catch(err => console.error("Error loading photos_data.json:", err));
