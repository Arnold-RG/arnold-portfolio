// Projects management with Edit & Delete
let editingProjectId = null;

function toggleProjectPanel(editId = null) {
  const panel = document.getElementById('projectPanel');
  const overlay = document.getElementById('panelOverlay');
  
  editingProjectId = editId;
  if (editId) {
    loadProjectForEdit(editId);
    document.getElementById('panelTitle').textContent = 'Edit Project';
    document.querySelector('#projectForm .form-actions button:last-child').textContent = 'Update Project';
  } else {
    document.getElementById('projectForm').reset();
    document.getElementById('panelTitle').textContent = 'Add New Project';
    document.querySelector('#projectForm .form-actions button:last-child').textContent = 'Save Project';
  }
  
  panel.classList.add('open');
  overlay.classList.add('open');
}

function closeProjectPanel() {
  document.getElementById('projectPanel').classList.remove('open');
  document.getElementById('panelOverlay').classList.remove('open');
  editingProjectId = null;
}

function loadProjectForEdit(id) {
  const projects = JSON.parse(localStorage.getItem('projects') || '[]');
  const project = projects.find(p => p.id === id);
  if (project) {
    document.getElementById('projectTitle').value = project.title || '';
    document.getElementById('projectDesc').value = project.desc || '';
    document.getElementById('projectUrl').value = project.url || '';
    document.getElementById('projectRepo').value = project.repo || '';
    document.getElementById('projectTech').value = project.tech || '';
    document.getElementById('projectFeatured').value = project.featured ? 'true' : 'false';
  }
}

function deleteProject(id) {
  if (confirm('Are you sure you want to delete this project?')) {
    let projects = JSON.parse(localStorage.getItem('projects') || '[]');
    projects = projects.filter(p => p.id !== id);
    localStorage.setItem('projects', JSON.stringify(projects));
    loadProjects();
  }
}

function loadProjects() {
  const projects = JSON.parse(localStorage.getItem('projects') || '[]');
  const grid = document.getElementById('projectsGrid');
  grid.innerHTML = '';
  
  // Sort featured projects first
  const sortedProjects = projects.sort((a, b) => (b.featured === a.featured ? 0 : b.featured ? -1 : 1));
  
  sortedProjects.forEach(project => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
        <h4 style="margin: 0; flex: 1;">${project.title}</h4>
        ${project.featured ? '<span style="background: #f59e0b; color: #000; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">Featured</span>' : ''}
      </div>
      <p style="margin-bottom: 16px;">${project.desc}</p>
      ${project.tech ? `<p style="color: #60a5fa; font-size: 13px; margin-bottom: 16px; font-weight: 500;">${project.tech}</p>` : ''}
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
        ${project.url ? `<a href="${project.url}" target="_blank" class="btn secondary" style="font-size:13px;padding:8px 16px;">Live Demo</a>` : ''}
        ${project.repo ? `<a href="${project.repo}" target="_blank" class="btn secondary" style="font-size:13px;padding:8px 16px;">GitHub</a>` : ''}
      </div>
      <div style="display: flex; gap: 8px; opacity: 0.8;">
        <button onclick="toggleProjectPanel('${project.id}')" class="btn secondary" style="font-size:12px;padding:6px 12px;background: rgba(96,165,250,0.1); border-color: #60a5fa; color: #60a5fa;">Edit</button>
        <button onclick="deleteProject('${project.id}')" class="btn secondary" style="font-size:12px;padding:6px 12px;background: rgba(239,68,68,0.1); border-color: #ef4444; color: #ef4444;">Delete</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Form submission
document.getElementById('projectForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const project = {
    id: editingProjectId || Date.now().toString(),
    title: document.getElementById('projectTitle').value,
    desc: document.getElementById('projectDesc').value,
    url: document.getElementById('projectUrl').value,
    repo: document.getElementById('projectRepo').value,
    tech: document.getElementById('projectTech').value,
    featured: document.getElementById('projectFeatured').value === 'true'
  };

  let projects = JSON.parse(localStorage.getItem('projects') || '[]');
  if (editingProjectId) {
    const index = projects.findIndex(p => p.id === editingProjectId);
    projects[index] = project;
  } else {
    projects.unshift(project); // Add to top if new
  }
  localStorage.setItem('projects', JSON.stringify(projects));
  loadProjects();
  closeProjectPanel();
});

// Load projects on page load
document.addEventListener('DOMContentLoaded', loadProjects);

// Smooth scroll for nav links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    document.querySelector(this.getAttribute('href')).scrollIntoView({ behavior: 'smooth' });
  });
});
