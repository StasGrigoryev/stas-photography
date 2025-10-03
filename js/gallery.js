let photos = [];
const gallery = document.getElementById('gallery');
let currentIndex = 0;
const batchSize = 20;

const filtersContainer = document.getElementById('filters');     
const subfiltersContainer = document.getElementById('subfilters'); 

fetch('photos.json')
  .then(res => res.json())
  .then(data => {
    photos = data;
    buildFilters();
    currentIndex = 0;
    gallery.innerHTML = '';
    loadPhotosBatch('all'); // initial load: all
  })
  .catch(err => console.error("Error loading photos.json:", err));

  // Assuming filtersContainer is your #filters element
function buildFilters() {
  const categories = {};
  photos.forEach(photo => {
    if (!categories[photo.category]) categories[photo.category] = new Set();
    if (photo.subcategory) categories[photo.category].add(photo.subcategory);
  });

  filtersContainer.innerHTML = '';

  // Create All button inside its own wrapper
  const allWrapper = document.createElement('div');
  allWrapper.classList.add('category-wrapper');

  const allBtn = document.createElement('button');
  allBtn.id = 'all-button';
  allBtn.classList.add('active');
  allBtn.textContent = 'All';
  allBtn.onclick = () => filterPhotos('all');
  allWrapper.appendChild(allBtn);

  filtersContainer.appendChild(allWrapper);

  // Generate other main categories
  for (let category in categories) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('category-wrapper');

    const btn = document.createElement('button');
    btn.textContent = category;
    btn.onclick = () => showSubcategories(wrapper, category, categories[category]);
    wrapper.appendChild(btn);

    const subContainer = document.createElement('div');
    subContainer.classList.add('subfilters-local');
    wrapper.appendChild(subContainer);

    filtersContainer.appendChild(wrapper);
  }
}

  
  function showSubcategories(wrapper, category, subcats) {
    // Highlight active main category
    document.querySelectorAll('#filters button').forEach(btn => btn.classList.remove('active'));
    wrapper.querySelector('button').classList.add('active');
  
    // Load main category photos only (exclude subcategories)
    filterPhotos(category);
  
    // Clear previous subcategories in this wrapper
    const subContainer = wrapper.querySelector('.subfilters-local');
    subContainer.innerHTML = '';
  
    // Add subcategory buttons if they exist
    if (subcats.size > 0) {
      subcats.forEach(sub => {
        const subBtn = document.createElement('button');
        subBtn.textContent = sub;
        subBtn.onclick = () => filterPhotos(category, sub);
        subContainer.appendChild(subBtn);
      });
    }
  }
  


  function loadPhotosBatch(filter='all', subcategory=null) {
    gallery.innerHTML = '';
    currentIndex = 0;
  
    let filtered = photos;
  
    if (filter !== 'all') {
      // Main category + optional subcategory
      filtered = photos.filter(p => p.category === filter && (!subcategory || p.subcategory === subcategory));
    }
  
    if (filter === 'all') {
      // Group by category
      const categories = [...new Set(photos.map(p => p.category))];
  
      categories.forEach(cat => {
        // Add category title
        const title = document.createElement('h2');
        title.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
        title.style.margin = '30px 0 10px 0';
        gallery.appendChild(title);
  
        // Add photos of this category
        const catPhotos = photos.filter(p => p.category === cat);
        catPhotos.forEach(photo => {
          const img = document.createElement('img');
          img.src = photo.thumb;
          img.alt = photo.alt;
          img.dataset.full = photo.full;
          img.onclick = () => openLightbox(img);
          gallery.appendChild(img);
        });
      });
  
      // Remove Load More button when showing all
      const oldButton = document.getElementById('load-more');
      if (oldButton) oldButton.remove();
      return;
    }
  
    // For individual category/subcategory: show batch
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
  
    // Load More button logic
    const oldButton = document.getElementById('load-more');
    if (oldButton) oldButton.remove();
  
    if (currentIndex < filtered.length) {
      const btn = document.createElement('button');
      btn.id = 'load-more';
      btn.textContent = 'Load More';
      btn.style.display = 'block';
      btn.style.margin = '20px auto';
      btn.onclick = () => loadPhotosBatch(filter, subcategory);
      gallery.parentNode.appendChild(btn);
    }
  }

function openLightbox(img) {
  const fullSrc = img.dataset.full;
  const lightbox = document.createElement('div');
  lightbox.id = 'lightbox';
  lightbox.innerHTML = `<img src="${fullSrc}" alt="${img.alt}">`;
  lightbox.onclick = () => document.body.removeChild(lightbox);
  document.body.appendChild(lightbox);
}

function filterPhotos(category, subcategory = null) {
  // Reset active states
  document.querySelectorAll('#filters button').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('#subfilters button').forEach(btn => btn.classList.remove('active'));

  // Add active state
  const btns = [...document.querySelectorAll('#filters button'), ...document.querySelectorAll('#subfilters button')];
  const btn = btns.find(b => b.textContent.toLowerCase() === (subcategory || category).toLowerCase());
  if (btn) btn.classList.add('active');

  // Reset gallery
  currentIndex = 0;
  gallery.innerHTML = '';
  loadPhotosBatch(category, subcategory);
}
