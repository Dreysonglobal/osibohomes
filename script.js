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

// Helper functions for property type extraction
function extractPropertyTypeFromDescription(property) {
  // Extract property type from description if prefixed with [TYPE]
  const description = property.description || '';
  const typeMatch = description.match(/^\[([^\]]+)\]/);
  if (typeMatch) {
    return typeMatch[1];
  }
  // Fallback to status for legacy properties
  return property.status ? property.status.toUpperCase() : 'N/A';
}

function getCleanDescription(description) {
  // Remove the [TYPE] prefix from description for display
  if (!description) return '';
  const typeMatch = description.match(/^\[([^\]]+)\]\s*(.*)$/);
  return typeMatch ? typeMatch[2] : description;
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
  else {
    window.allProperties = data;
    displayProperties(data, grid);
  }
  
  const filter = document.getElementById('typeFilter');
  if (filter) {
    filter.addEventListener('change', () => {
      const val = filter.value;
      const filtered = val === 'all' ? window.allProperties : window.allProperties.filter(p => {
        const propertyType = extractPropertyTypeFromDescription(p).toLowerCase().replace(/\s+/g, '-');
        return propertyType === val;
      });
      const gridElement = document.getElementById('allPropertiesGrid');
      if (gridElement) {
        gridElement.dataset.currentPage = '1';
        displayProperties(filtered, gridElement);
      }
    });
  }
}

function displayProperties(properties, container) {
  if (!properties.length) {
    container.innerHTML = '<p style="text-align:center">No properties found.</p>';
    const existingPagination = container.parentNode.querySelector('.pagination');
    if (existingPagination) existingPagination.remove();
    return;
  }
  window.propertyDataMap = window.propertyDataMap || {};
  properties.forEach(p => { window.propertyDataMap[p.id] = p; });

  const isMobile = window.innerWidth <= 768;
  const itemsPerPage = isMobile ? 10 : properties.length;
  const totalPages = Math.max(1, Math.ceil(properties.length / itemsPerPage));

  if (!container.dataset.currentPage || parseInt(container.dataset.currentPage, 10) < 1) {
    container.dataset.currentPage = '1';
  }
  let currentPage = parseInt(container.dataset.currentPage, 10);
  if (currentPage > totalPages) currentPage = totalPages;
  container.dataset.currentPage = String(currentPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const propertiesToShow = properties.slice(startIndex, endIndex);

  container.innerHTML = propertiesToShow.map(p => {
    const safeId = String(p.id).replace(/'/g, "\\'");
    const propertyType = extractPropertyTypeFromDescription(p);
    return `
    <div class="property-card">
      <img src="${p.image_url}" onerror="this.src='https://placehold.co/600x400?text=Luxury+Home'" style="cursor:pointer;" onclick="openPropertyGallery('${safeId}')">
      <div class="property-details">
        <h3>${p.title}</h3>
        <p><i class="fas fa-map-marker-alt gold"></i> ${p.location}</p>
        <div class="price">${p.price}</div>
        <span class="status-badge">${propertyType}</span>
        <p style="margin-top:10px">${getCleanDescription(p.description).substring(0,100)}...</p>
        <button class="contact-btn" onclick="contactViaWhatsApp('${safeId}')">Contact Us</button>
      </div>
    </div>
  `;
  }).join('');

  const existingPagination = container.parentNode.querySelector('.pagination');
  if (isMobile && totalPages > 1) {
    let paginationHtml = '<div class="pagination">';
    paginationHtml += `<button class="pagination-btn" onclick="changePage('${container.id}', ${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>`;
    paginationHtml += `<span class="pagination-info">Page ${currentPage} of ${totalPages}</span>`;
    paginationHtml += `<button class="pagination-btn" onclick="changePage('${container.id}', ${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>`;
    paginationHtml += '</div>';
    if (existingPagination) existingPagination.remove();
    container.insertAdjacentHTML('afterend', paginationHtml);
  } else if (existingPagination) {
    existingPagination.remove();
  }
}

function changePage(containerId, newPage) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const filter = document.getElementById('typeFilter');
  let properties = window.allProperties || [];
  if (filter && filter.value !== 'all') {
    properties = properties.filter(p => {
      const propertyType = extractPropertyTypeFromDescription(p).toLowerCase().replace(/\s+/g, '-');
      return propertyType === filter.value;
    });
  }
  const totalPages = Math.max(1, Math.ceil(properties.length / (window.innerWidth <= 768 ? 10 : properties.length)));
  const nextPage = Math.min(Math.max(newPage, 1), totalPages);
  container.dataset.currentPage = String(nextPage);
  displayProperties(properties, container);
}

window.addEventListener('resize', () => {
  const grid = document.getElementById('allPropertiesGrid');
  if (grid && window.allProperties) {
    const filter = document.getElementById('typeFilter');
    let properties = window.allProperties;
    if (filter && filter.value !== 'all') {
      properties = properties.filter(p => {
        const propertyType = extractPropertyTypeFromDescription(p).toLowerCase().replace(/\s+/g, '-');
        return propertyType === filter.value;
      });
    }
    displayProperties(properties, grid);
  }
});

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
  galleryStatus.textContent = extractPropertyTypeFromDescription(property);
  galleryDesc.textContent = getCleanDescription(property.description);
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
  const propertyType = extractPropertyTypeFromDescription(property);
  const cleanDesc = getCleanDescription(property.description);
  const message = encodeURIComponent(`Hi, I’m interested in this property:\nTitle: ${property.title}\nLocation: ${property.location}\nPrice: ${property.price}\nType: ${propertyType}\nDescription: ${cleanDesc}`);
  const url = `https://wa.me/2349064527894?text=${message}`;
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