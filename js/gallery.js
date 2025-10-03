let photos = [];
const gallery = document.getElementById('gallery');
let currentIndex = 0;
const batchSize = 20;

const filtersContainer = document.getElementById('filters');     
const subfiltersContainer = document.getElementById('subfilters'); 


  fetch('photos_data.json')
  .then(res => res.json())
  .then(json => {
    data = json;
    photos = data.photos;
    buildFilters();
    currentIndex = 0;
    gallery.innerHTML = '';
    loadPhotosBatch('all'); // initial load
  })
  .catch(err => console.error("Error loading photos_data.json:", err));

  // Assuming filtersContainer is your #filters element
  function buildFilters() {
    filtersContainer.innerHTML = '';
  
    // Create All button
    const allWrapper = document.createElement('div');
    allWrapper.classList.add('category-wrapper');
    const allBtn = document.createElement('button');
    allBtn.id = 'all-button';
    allBtn.classList.add('active');
    allBtn.textContent = 'All';
    allBtn.onclick = () => filterPhotos('all');
    allWrapper.appendChild(allBtn);
    filtersContainer.appendChild(allWrapper);
  
    // Sort main categories by order
    const sortedCategories = Object.entries(data.categories)
                                   .sort((a,b) => a[1].order - b[1].order);
  
    sortedCategories.forEach(([categoryName, catData]) => {
      const wrapper = document.createElement('div');
      wrapper.classList.add('category-wrapper');
  
      const btn = document.createElement('button');
      btn.textContent = categoryName;
      btn.onclick = () => showSubcategories(wrapper, categoryName);
      wrapper.appendChild(btn);
  
      const subContainer = document.createElement('div');
      subContainer.classList.add('subfilters-local');
      wrapper.appendChild(subContainer);
  
      filtersContainer.appendChild(wrapper);
    });
  }

  
  function showSubcategories(wrapper, category) {
    // Highlight active main category
    document.querySelectorAll('#filters button').forEach(btn => btn.classList.remove('active'));
    wrapper.querySelector('button').classList.add('active');
  
    // Load main category photos only
    filterPhotos(category);
  
    const subContainer = wrapper.querySelector('.subfilters-local');
    subContainer.innerHTML = '';
  
    const subcats = data.categories[category]?.subcategories || {};
    const sortedSubcats = Object.entries(subcats)
                                .sort((a,b) => a[1].order - b[1].order);
  
    sortedSubcats.forEach(([subName, subData]) => {
      const subBtn = document.createElement('button');
      subBtn.textContent = subName;
      subBtn.onclick = () => filterPhotos(category, subName);
      subContainer.appendChild(subBtn);
    });
  }
  

  function loadPhotosBatch(filter='all', subcategory=null) {
    gallery.innerHTML = '';
    currentIndex = 0;
  
    let filtered = photos;
  
    if (filter !== 'all') {
      // Filter by category + optional subcategory
      filtered = photos.filter(p => p.category === filter && (!subcategory || p.subcategory === subcategory));
  
      // Show category or subcategory description
      let descText = "";
      if (subcategory) {
        const key = data.categories[filter]?.subcategories[subcategory];
        if (key) descText = key.description || "";
      } else {
        descText = data.categories[filter]?.description || "";
      }
  
      if (descText) {
        const desc = document.createElement('p');
        desc.textContent = descText;
        desc.style.margin = '10px 0 20px 0';
        desc.style.fontSize = '1rem';
        desc.style.color = '#555';
        gallery.appendChild(desc);
      }
    }
  
    if (filter === 'all') {
      // Group photos by category WITHOUT descriptions
      const categories = [...new Set(photos.map(p => p.category))];
  
      categories.forEach(cat => {
        // Category title
        const title = document.createElement('h2');
        title.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
        title.style.gridColumn = '1 / -1'; // span full width
        title.style.margin = '30px 0 15px 0';
        title.style.fontSize = '1.5rem';
        title.style.color = '#111';
        gallery.appendChild(title);
  
        // Photos for this category
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
  
    // Single category/subcategory batch loading
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
