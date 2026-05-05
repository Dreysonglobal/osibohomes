let editingId = null;
let uploadedImageUrls = [];

// Check auth
async function checkAuth() {
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
  
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  if (!session) window.location.href = 'index.html';
  loadAdminProperties();
}
checkAuth();

async function loadAdminProperties() {
  const { data, error } = await window.supabaseClient.from('properties').select('*').order('created_at', { ascending: false });
  if (error) alert('Error loading properties');
  else renderAdminProperties(data);
}

function renderAdminProperties(properties) {
  const grid = document.getElementById('adminPropertyGrid');
  if (!properties.length) { grid.innerHTML = '<p>No properties added yet.</p>'; return; }
  grid.innerHTML = properties.map(p => `
    <div class="admin-property-card">
      <img src="${p.image_url}" onerror="this.src='https://placehold.co/600x400'">
      <div class="admin-property-info">
        <h3>${p.title}</h3>
        <p>📍 ${p.location}</p>
        <p>💰 ${p.price}</p>
        <p>🏷️ ${p.status}</p>
        <div class="admin-actions">
          <button class="edit-btn" onclick="editProperty('${p.id}')">Edit</button>
          <button class="delete-btn" onclick="deleteProperty('${p.id}')">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

window.editProperty = async (id) => {
  const { data } = await window.supabaseClient.from('properties').select('*').eq('id', id).single();
  if (data) {
    editingId = id;
    document.getElementById('propertyTitle').value = data.title;
    document.getElementById('propertyLocation').value = data.location;
    document.getElementById('propertyPrice').value = data.price;
    document.getElementById('propertyStatus').value = data.status;
    document.getElementById('propertyDescription').value = data.description;
    
    // Load existing images
    uploadedImageUrls = parseImageGallery(data.image_gallery) || (data.image_url ? [data.image_url] : []);
    displayImagePreviews();
    
    document.getElementById('formTitle').innerText = 'Edit Property';
    document.getElementById('propertyFormModal').style.display = 'flex';
  }
};

window.deleteProperty = async (id) => {
  if (confirm('Delete this property?')) {
    await window.supabaseClient.from('properties').delete().eq('id', id);
    loadAdminProperties();
    if (window.location.pathname.includes('properties.html')) location.reload();
    if (window.location.pathname.includes('index.html')) location.reload();
  }
};

const addBtn = document.getElementById('showAddFormBtn');
const closeFormBtn = document.getElementById('closeFormBtn');
const formModal = document.getElementById('propertyFormModal');
const propertyForm = document.getElementById('propertyForm');
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('propertyImage');
const previewContainer = document.getElementById('imagePreviewContainer');

// Image upload handler
uploadArea?.addEventListener('click', () => fileInput?.click());
uploadArea?.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.style.background = 'rgba(212,175,55,0.25)';
});
uploadArea?.addEventListener('dragleave', () => {
  uploadArea.style.background = 'rgba(212,175,55,0.05)';
});
uploadArea?.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.style.background = 'rgba(212,175,55,0.05)';
  handleImageFiles(e.dataTransfer.files);
});

fileInput?.addEventListener('change', (e) => {
  handleImageFiles(e.target.files);
});

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

function handleImageFiles(files) {
  const maxImages = 5;
  const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
  
  if (uploadedImageUrls.length + validFiles.length > maxImages) {
    alert(`Maximum ${maxImages} images allowed`);
    return;
  }
  
  uploadedImageUrls = [...uploadedImageUrls, ...validFiles];
  displayImagePreviews();
}

window.removeImage = (index) => {
  uploadedImageUrls.splice(index, 1);
  displayImagePreviews();
};

function displayImagePreviews() {
  previewContainer.innerHTML = '';
  uploadedImageUrls.forEach((fileOrUrl, index) => {
    const src = fileOrUrl instanceof File ? URL.createObjectURL(fileOrUrl) : fileOrUrl;
    const preview = document.createElement('div');
    preview.className = 'image-preview';
    preview.innerHTML = `
      <img src="${src}" alt="Preview">
      <button type="button" class="remove-img" onclick="removeImage(${index})">✕</button>
    `;
    previewContainer.appendChild(preview);
  });
  const imageCountInfo = document.getElementById('imageCountInfo');
  if (imageCountInfo) imageCountInfo.textContent = `${uploadedImageUrls.length} / 5 images selected`;
}

if (addBtn) addBtn.onclick = () => {
  editingId = null;
  uploadedImageUrls = [];
  previewContainer.innerHTML = '';
  const imageCountInfo = document.getElementById('imageCountInfo');
  if (imageCountInfo) imageCountInfo.textContent = '0 / 5 images selected';
  propertyForm.reset();
  document.getElementById('formTitle').innerText = 'Add New Property';
  formModal.style.display = 'flex';
};
if (closeFormBtn) closeFormBtn.onclick = () => formModal.style.display = 'none';

propertyForm.onsubmit = async (e) => {
  e.preventDefault();
  
  if (uploadedImageUrls.length === 0) {
    alert('Please upload at least one image');
    return;
  }
  
  try {
    const uploadedUrls = [];
    
    for (let i = 0; i < uploadedImageUrls.length; i++) {
      const item = uploadedImageUrls[i];
      
      if (typeof item === 'string' && item.startsWith('http')) {
        uploadedUrls.push(item);
        continue;
      }
      
      if (item instanceof File) {
        const fileName = `${Date.now()}-${i}-${item.name}`;
        const filePath = `properties/${fileName}`;
        const { data, error } = await window.supabaseClient.storage
          .from('property-images')
          .upload(filePath, item, { upsert: true });
        if (error) throw error;
        const { data: publicData } = window.supabaseClient.storage
          .from('property-images')
          .getPublicUrl(filePath);
        uploadedUrls.push(publicData.publicUrl);
      }
    }
    
    const property = {
      title: document.getElementById('propertyTitle').value,
      location: document.getElementById('propertyLocation').value,
      price: document.getElementById('propertyPrice').value,
      status: document.getElementById('propertyStatus').value,
      image_url: uploadedUrls[0],
      image_gallery: uploadedUrls,
      description: document.getElementById('propertyDescription').value
    };

    const saveProperty = async (payload) => {
      return editingId
        ? await window.supabaseClient.from('properties').update(payload).eq('id', editingId)
        : await window.supabaseClient.from('properties').insert(payload);
    };

    let result = await saveProperty(property);

    if (result.error) {
      const message = result.error.message || '';
      const code = result.error.code || '';
      if (message.includes('image_gallery') || code === 'PGRST204') {
        delete property.image_gallery;
        result = await saveProperty(property);
      }
    }

    if (result.error) throw result.error;

    formModal.style.display = 'none';
    uploadedImageUrls = [];
    previewContainer.innerHTML = '';
    loadAdminProperties();
    alert('Property saved successfully!');
  } catch (error) {
    console.error('Error saving property:', error);
    alert('Error saving property: ' + error.message);
  }
};

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await window.supabaseClient.auth.signOut();
  window.location.href = 'index.html';
});