let currentUser = null;
const propertyDataMap = {};
let currentGalleryIndex = 0;
let currentGalleryPropertyId = null;

function parseImageGallery(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch (error) {
      return [value];
    }
  }
  return [value];
}

// Hero slider
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
if (slides.length) {
  setInterval(() => {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
  }, 5000);
}

// Load properties on home page
async function loadHomeProperties() {
  const grid = document.getElementById('homePropertyGrid');
  if (!grid) return;
  const { data, error } = await window.supabaseClient.from('properties').select('*').limit(6);
  if (error) console.error(error);
  else displayProperties(data, grid);
}

// Load all properties for properties page
async function loadAllProperties() {
  const grid = document.getElementById('allPropertiesGrid');
  if (!grid) return;
  const { data, error } = await window.supabaseClient.from('properties').select('*');
  if (error) console.error(error);
  else displayProperties(data, grid);
  
  const filter = document.getElementById('statusFilter');
  if (filter) {
    filter.addEventListener('change', () => {
      const val = filter.value;
      const filtered = val === 'all' ? data : data.filter(p => p.status === val);
      displayProperties(filtered, grid);
    });
  }
}

function displayProperties(properties, container) {
  if (!properties.length) { container.innerHTML = '<p style="text-align:center">No properties found.</p>'; return; }
  window.propertyDataMap = window.propertyDataMap || {};
  properties.forEach(p => { window.propertyDataMap[p.id] = p; });
  container.innerHTML = properties.map(p => {
    const safeId = String(p.id).replace(/'/g, "\\'");
    return `
    <div class="property-card">
      <img src="${p.image_url}" onerror="this.src='https://placehold.co/600x400?text=Luxury+Home'" style="cursor:pointer;" onclick="openPropertyGallery('${safeId}')">
      <div class="property-details">
        <h3>${p.title}</h3>
        <p><i class="fas fa-map-marker-alt gold"></i> ${p.location}</p>
        <div class="price">${p.price}</div>
        <span class="status-badge">${p.status.toUpperCase()}</span>
        <p style="margin-top:10px">${p.description.substring(0,100)}...</p>
        <button class="contact-btn" onclick="contactViaWhatsApp('${safeId}')">Contact Us</button>
      </div>
    </div>
  `;
  }).join('');
}

function openPropertyGallery(id) {
  const property = window.propertyDataMap[id];
  if (!property) return;
  const gallery = parseImageGallery(property.image_gallery) || (property.image_url ? [property.image_url] : []);
  const modal = document.getElementById('propertyGalleryModal');
  const galleryImage = document.getElementById('galleryMainImage');
  const galleryTitle = document.getElementById('galleryPropertyTitle');
  const galleryLocation = document.getElementById('galleryPropertyLocation');
  const galleryPrice = document.getElementById('galleryPropertyPrice');
  const galleryStatus = document.getElementById('galleryPropertyStatus');
  const galleryDesc = document.getElementById('galleryPropertyDescription');
  const galleryCounter = document.getElementById('galleryCounter');
  const galleryThumbs = document.getElementById('galleryThumbnails');
  
  currentGalleryIndex = 0;
  window.currentGalleryPropertyId = id;
  modal.style.display = 'flex';
  galleryTitle.textContent = property.title;
  galleryLocation.textContent = property.location;
  galleryPrice.textContent = property.price;
  galleryStatus.textContent = property.status.toUpperCase();
  galleryDesc.textContent = property.description;
  galleryCounter.textContent = `${gallery.length ? 1 : 0} / ${gallery.length}`;
  galleryImage.src = gallery[0] || 'https://placehold.co/800x500?text=No+Image';
  galleryThumbs.innerHTML = gallery.map((src, index) => `
    <button type="button" class="gallery-thumb" onclick="setGalleryImage(${index})">
      <img src="${src}" alt="Image ${index + 1}">
    </button>
  `).join('');
  window.currentGallery = gallery;
}

function closePropertyGallery() {
  const modal = document.getElementById('propertyGalleryModal');
  if (modal) modal.style.display = 'none';
}

function setGalleryImage(index) {
  const gallery = window.currentGallery || [];
  if (!gallery.length) return;
  currentGalleryIndex = index;
  document.getElementById('galleryMainImage').src = gallery[index];
  document.getElementById('galleryCounter').textContent = `${index + 1} / ${gallery.length}`;
}

function nextGalleryImage() {
  const gallery = window.currentGallery || [];
  if (!gallery.length) return;
  currentGalleryIndex = (currentGalleryIndex + 1) % gallery.length;
  setGalleryImage(currentGalleryIndex);
}

function prevGalleryImage() {
  const gallery = window.currentGallery || [];
  if (!gallery.length) return;
  currentGalleryIndex = (currentGalleryIndex - 1 + gallery.length) % gallery.length;
  setGalleryImage(currentGalleryIndex);
}

function contactViaWhatsApp(id) {
  const property = window.propertyDataMap[id];
  if (!property) return;
  const message = encodeURIComponent(`Hi, I’m interested in this property:\nTitle: ${property.title}\nLocation: ${property.location}\nPrice: ${property.price}\nStatus: ${property.status}\nDescription: ${property.description}`);
  const url = `https://wa.me/2347034293609?text=${message}`;
  const newWindow = window.open(url, '_blank');
  if (!newWindow) {
    window.location.href = url;
  }
}

// Admin login modal
const adminBtn = document.getElementById('adminBtn');
const loginModal = document.getElementById('loginModal');
const closeModal = document.querySelector('.close-modal');
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

if (adminBtn) {
  adminBtn.onclick = () => { loginModal.style.display = 'flex'; };
}
if (closeModal) closeModal.onclick = () => { loginModal.style.display = 'none'; };
window.onclick = (e) => { if (e.target === loginModal) loginModal.style.display = 'none'; };

// Hamburger menu toggle
if (hamburger) {
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });
  
  // Close menu when a link is clicked
  document.querySelectorAll('.nav-links a, .nav-links button').forEach(item => {
    item.addEventListener('click', () => {
      navLinks.classList.remove('active');
    });
  });
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
    if (error) { alert('Login failed: ' + error.message); return; }
    currentUser = data.user;
    alert('Login successful! Redirecting to dashboard...');
    window.location.href = 'admin-dashboard.html';
  };
}

// SEO: send location data to console (structured data for Google)
async function addStructuredData() {
  const { data } = await window.supabaseClient.from('properties').select('location, title, price');
  if (data && data.length) {
    const schema = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "itemListElement": data.map((prop, idx) => ({
        "@type": "ListItem",
        "position": idx+1,
        "item": { "@type": "Place", "name": prop.location, "description": prop.title }
      }))
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
  }
}

// Run loaders - wait for supabase to be ready
async function runLoaders() {
  // Wait for supabase to be initialized
  let attempts = 0;
  while (!window.supabaseClient && attempts < 100) {
    await new Promise(resolve => setTimeout(resolve, 50));
    attempts++;
  }
  
  if (!window.supabaseClient) {
    console.error('Supabase failed to initialize');
    return;
  }
  
  loadHomeProperties();
  if (window.location.pathname.includes('properties.html')) loadAllProperties();
  addStructuredData();
}

runLoaders();