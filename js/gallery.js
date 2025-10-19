/* gallery.js — enhanced with lightbox metadata display
   ✦ Shows photo description & date in lightbox
   ✦ Closes with click outside image or Escape key
   ✦ Keeps category/subcategory filtering logic intact
*/

let data = {};
let photos = [];
const gallery = document.getElementById("gallery");
const filtersContainer = document.getElementById("filters");
let currentList = [];  // Stores photos for the currently active category/subcategory

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

// function openLightbox(photo) {
//   const index = photos.findIndex(p => p.full === photo.full);
//   currentIndex = index;

//   lightboxImg.src = photo.full;
//   lightboxImg.alt = photo.alt;
//   lightboxDesc.textContent = photo.description || "";
//   lightboxDate.textContent = photo.date ? `${photo.date}` : "";

//   lightbox.classList.add("visible");
// }

function openLightbox(photo) {
  lightbox.classList.add("visible");
  currentIndex = currentList.findIndex(p => p.full === photo.full);

  updateLightbox(photo);
}

function updateLightbox(photo) {
  lightboxImg.src = photo.full;
  lightboxImg.alt = photo.alt;
  lightboxDesc.textContent = photo.description || "";
  lightboxDate.textContent = photo.date ? `${photo.date}` : "";
}

function showNextPhoto() {
  if (!currentList.length) return;
  currentIndex = (currentIndex + 1) % currentList.length;
  updateLightbox(currentList[currentIndex]);
}

function showPrevPhoto() {
  if (!currentList.length) return;
  currentIndex = (currentIndex - 1 + currentList.length) % currentList.length;
  updateLightbox(currentList[currentIndex]);
}

function closeLightbox() {
  lightbox.classList.remove("visible");
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

  // “All” button — clicking All hides subfilters
  const allWrapper = document.createElement('div');
  allWrapper.classList.add('category-wrapper');
  const allBtn = makeButton('all', () => {
    // hide all subfilters
    document.querySelectorAll('.subfilters-local').forEach(sc => {
      sc.style.display = 'none';
      // optionally clear subfilter active states
      sc.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    });
    // reset main active states
    document.querySelectorAll('#filters > .category-wrapper > button').forEach(btn => btn.classList.remove('active'));
    allBtn.classList.add('active');
    filterPhotos('all');
  }, 'active');
  mainButtons.set('all', allBtn);
  allWrapper.appendChild(allBtn);
  filtersContainer.appendChild(allWrapper);

  // Main categories in defined order
  mainCategoryOrder.forEach(category => {
    // skip if no photos for this category
    if (!photos.some(p => p.category === category)) return;

    const wrapper = document.createElement('div');
    wrapper.classList.add('category-wrapper');
    if (category === 'other') wrapper.classList.add('other'); // optional: special styling

    const btn = makeButton(category, () => showSubcategories(wrapper, category));
    mainButtons.set(category, btn);
    wrapper.appendChild(btn);

    const subContainer = document.createElement('div');
    subContainer.classList.add('subfilters-local');
    subContainer.style.display = 'none'; // initially hidden
    wrapper.appendChild(subContainer);

    filtersContainer.appendChild(wrapper);

    // don't pre-create subButtons here — they will be built on demand by ensureSubfiltersVisible()
  });

  // if you want the page to initially show "featured" or first category, you could trigger it here.
  // For now we keep initial load behavior outside of buildFilters().
}

function showSubcategories(wrapper, category) {
  // clear active states for main buttons
  document.querySelectorAll('#filters > .category-wrapper > button').forEach(btn => btn.classList.remove('active'));
  // clear subfilters content for other wrappers (not strictly necessary if ensureSubfiltersVisible hides them)
  document.querySelectorAll('.subfilters-local').forEach(sc => {
    if (sc !== wrapper.querySelector('.subfilters-local')) {
      sc.style.display = 'none';
      sc.innerHTML = ''; // clear old nodes so they rebuild cleanly
    }
  });

  // mark this main category active
  const mainBtn = wrapper.querySelector('button');
  if (mainBtn) mainBtn.classList.add('active');

  // build/show subfilters for this wrapper
  ensureSubfiltersVisible(wrapper, category);

  // Behavior: if there are subcategories, auto-show first subcategory photos
  const subList = getSubcategoryListFromData(category);
  const orderedSubs = subCategoryOrder[category] && subCategoryOrder[category].length
    ? subCategoryOrder[category].filter(s => subList.includes(s))
    : subList;

  if (orderedSubs.length > 0) {
    const first = orderedSubs[0];
    // mark the subbutton active
    const subBtn = subButtons.get(`${category}|${first}`);
    if (subBtn) {
      // clear other sub active states
      subButtons.forEach(b => b.classList.remove('active'));
      subBtn.classList.add('active');
    }
    filterPhotos(category, first);
  } else {
    // no subcats -> show main category photos
    filterPhotos(category);
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

  currentList = filtered;

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

  let filtered = batch.filter(p => p.category === category && (!subcat || p.subcat === subcat));


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
// function filterPhotos(category, subcategory = null) {
//   mainButtons.forEach(btn => btn.classList.remove('active'));
//   subButtons.forEach(btn => btn.classList.remove('active'));

//   if (subcategory) {
//     const key = `${category}|${subcategory}`;
//     const subBtn = subButtons.get(key);
//     if (subBtn) subBtn.classList.add('active');
//   } else {
//     const btn = mainButtons.get(category);
//     if (btn) btn.classList.add('active');
//   }

//   currentIndex = 0;
//   gallery.innerHTML = '';
//   loadPhotosBatch(category, subcategory);
// }

function filterPhotos(category, subcategory = null) {
  // Reset main/sub active classes in maps
  mainButtons.forEach(btn => btn.classList.remove('active'));
  subButtons.forEach(btn => btn.classList.remove('active'));

  // Activate appropriate button(s)
  if (subcategory) {
    const key = `${category}|${subcategory}`;
    const subBtn = subButtons.get(key);
    if (subBtn) subBtn.classList.add('active');
    const mainBtn = mainButtons.get(category);
    if (mainBtn) mainBtn.classList.add('active');
  } else {
    const btn = mainButtons.get(category);
    if (btn) btn.classList.add('active');
  }

  // Reset gallery and show photos
  currentIndex = 0;
  gallery.innerHTML = '';

  // load photos (this will also set currentList if you added that)
  loadPhotosBatch(category, subcategory);
}

// ---------- Helpers to manage subfilters ----------
function getSubcategoryListFromData(category) {
  // Prefer category metadata (data.categories), fallback to scanning photos
  const cats = data.categories || {};
  const subObj = cats[category]?.subcategories;
  if (subObj && Object.keys(subObj).length > 0) {
    return Object.keys(subObj);
  }
  // fallback: scan photos
  const set = new Set();
  photos.forEach(p => {
    if (p.category === category && p.subcategory) set.add(p.subcategory);
  });
  return Array.from(set);
}

/**
 * Ensure subfilters for `category` are in the DOM and visible.
 * If they are already built we just show them.
 */
function ensureSubfiltersVisible(wrapper, category) {
  const subContainer = wrapper.querySelector('.subfilters-local');
  // Hide others first
  document.querySelectorAll('.subfilters-local').forEach(sc => {
    if (sc !== subContainer) sc.style.display = 'none';
  });

  // If already has children, just show it
  if (subContainer.childElementCount > 0) {
    subContainer.style.display = 'flex';
    return;
  }

  // Build subfilter buttons from data
  const subs = getSubcategoryListFromData(category);
  const orderedSubs = subCategoryOrder[category] && subCategoryOrder[category].length
    ? subCategoryOrder[category].filter(s => subs.includes(s))
    : subs;

  orderedSubs.forEach(sub => {
    const subBtn = makeButton(sub, () => {
      // when user clicks subfilter, mark it active and filter
      // clear active states
      subButtons.forEach(b => b.classList.remove('active'));
      const key = `${category}|${sub}`;
      subButtons.set(key, subBtn);
      subBtn.classList.add('active');
      filterPhotos(category, sub);
    });
    subContainer.appendChild(subBtn);
    // keep reference
    subButtons.set(`${category}|${sub}`, subBtn);
  });

  if (orderedSubs.length > 0) {
    subContainer.style.display = 'flex';
  } else {
    subContainer.style.display = 'none';
  }
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
