let photos = [];
const gallery = document.getElementById('gallery');
let currentIndex = 0;
const batchSize = 20;  // show 20 photos at a time

fetch('photos.json')
  .then(res => res.json())
  .then(data => {
    photos = data;
    currentIndex = 0;
    gallery.innerHTML = '';
    loadPhotosBatch('all');  // initial load
  })
  .catch(err => console.error("Error loading photos.json:", err));

function loadPhotosBatch(filter='all') {
  const filtered = photos.filter(photo => filter === 'all' || photo.category === filter);
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

  // Remove old Load More button
  const oldButton = document.getElementById('load-more');
  if (oldButton) oldButton.remove();

  // Add Load More button if there are more photos
  if (currentIndex < filtered.length) {
    const btn = document.createElement('button');
    btn.id = 'load-more';
    btn.textContent = 'Load More';
    btn.style.display = 'block';
    btn.style.margin = '20px auto';
    btn.onclick = () => loadPhotosBatch(filter);
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

function filterPhotos(category) {
  // Remove active from all buttons
  document.querySelectorAll('#filters button').forEach(btn => btn.classList.remove('active'));

  // Add active to clicked button
  const btn = Array.from(document.querySelectorAll('#filters button'))
                   .find(b => b.textContent.toLowerCase() === category);
  if (btn) btn.classList.add('active');

  currentIndex = 0;
  gallery.innerHTML = '';
  loadPhotosBatch(category);
}
