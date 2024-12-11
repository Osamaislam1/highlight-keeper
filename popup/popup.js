// popup.js

class NoteTaker {
    constructor() {
      this.initializeElements();
      this.setupEventListeners();
      this.loadNotes();
    }
  
    initializeElements() {
      // Main elements
      this.notesList = document.getElementById('notesList');
      this.searchInput = document.getElementById('searchInput');
      this.tagsSelect = document.getElementById('tagsSelect');
      this.sortSelect = document.getElementById('sortSelect');
      this.emptyState = document.getElementById('emptyState');
  
      // Modal elements for Add/Edit
      this.noteModal = document.getElementById('noteModal');
      this.modalTitle = document.getElementById('modalTitle');
      this.noteForm = document.getElementById('noteForm');
      this.noteTitleInput = document.getElementById('noteTitle');
      this.noteTextInput = document.getElementById('noteText');
      this.noteTagsInput = document.getElementById('noteTags');
      this.noteUrlInput = document.getElementById('noteUrl');
      this.tagsPreview = document.getElementById('tagsPreview');
  
      // Modal elements for View
      this.viewNoteModal = document.getElementById('viewNoteModal');
      this.viewModalClose = document.getElementById('viewModalClose');
      this.viewNoteTitle = document.getElementById('viewNoteTitle');
      this.viewNoteText = document.getElementById('viewNoteText');
      this.viewNoteTags = document.getElementById('viewNoteTags');
    //   this.viewNoteUrl = document.getElementById('viewNoteUrl');
      this.closeViewBtn = document.getElementById('closeViewBtn');
      this.copyNoteBtn = document.getElementById('copyNoteBtn');
  
      // Buttons
      this.addNoteBtn = document.getElementById('addNoteBtn');
      this.exportBtn = document.getElementById('exportBtn');
      this.importBtn = document.getElementById('importBtn');
      this.syncGoogleBtn = document.getElementById('syncGoogleBtn');
      this.syncNotionBtn = document.getElementById('syncNotionBtn');
  
      // Toast
      this.toast = document.getElementById('toast');
  
      this.editingNoteId = null;
      this.notes = [];
    }
  
    setupEventListeners() {
      // Search and filter with debounce
      this.searchInput.addEventListener('input', this.debounce(() => this.filterNotes(), 300));
      this.tagsSelect.addEventListener('change', () => this.filterNotes());
      this.sortSelect.addEventListener('change', () => this.filterNotes());
  
      // Modal events for Add/Edit
      this.addNoteBtn.addEventListener('click', () => this.openAddModal());
      document.querySelector('.close').addEventListener('click', () => this.closeModal());
      document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
      this.noteForm.addEventListener('submit', (e) => this.handleNoteSave(e));
  
      // Modal events for View
      this.viewModalClose.addEventListener('click', () => this.closeViewModal());
      this.closeViewBtn.addEventListener('click', () => this.closeViewModal());
      this.copyNoteBtn.addEventListener('click', () => this.copyNoteToClipboard());
  
      // Sync buttons
      this.exportBtn.addEventListener('click', () => this.exportNotes());
      
      // Disable import functionality by informing the user
      this.importBtn.addEventListener('click', () => {
        this.showToast('Import Notes functionality is coming soon!', 'info');
      });
      
      this.syncGoogleBtn.addEventListener('click', () => this.syncWithGoogle());
      this.syncNotionBtn.addEventListener('click', () => this.syncWithNotion());
  
      // Tags preview
      this.noteTagsInput.addEventListener('input', () => this.updateTagsPreview());
  
      // Click outside modals to close them
      window.addEventListener('click', (e) => {
        if (e.target === this.noteModal) {
          this.closeModal();
        }
        if (e.target === this.viewNoteModal) {
          this.closeViewModal();
        }
      });
    }
  
    debounce(func, delay) {
      let debounceTimer;
      return function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(this, arguments), delay);
      };
    }
  
    async loadNotes() {
      try {
        const result = await chrome.storage.sync.get('notes');
        this.notes = result.notes || [];
        this.displayNotes(this.notes);
        this.updateTagsList();
      } catch (error) {
        this.showToast('Error loading notes', 'error');
      }
    }
  
    displayNotes(notes) {
      this.notesList.innerHTML = '';
  
      if (notes.length === 0) {
        this.emptyState.style.display = 'flex';
        return;
      } else {
        this.emptyState.style.display = 'none';
      }
  
      notes.forEach(note => {
        const noteElement = this.createNoteElement(note);
        this.notesList.appendChild(noteElement);
      });
    }
  
    createNoteElement(note) {
      const noteItem = document.createElement('div');
      noteItem.className = 'note-item';
  
      const title = document.createElement('div');
      title.className = 'note-title';
      title.textContent = note.title || 'Untitled';
  
      const text = document.createElement('div');
      text.className = 'note-text';
      text.textContent = note.text;
  
      const tags = document.createElement('div');
      tags.className = 'note-tags';
      if (note.tags && note.tags.length) {
        note.tags.forEach(tag => {
          const tagSpan = document.createElement('span');
          tagSpan.className = 'tag';
          tagSpan.textContent = tag;
          tags.appendChild(tagSpan);
        });
      }
  
      const meta = document.createElement('div');
      meta.className = 'note-meta';
      meta.innerHTML = `
        <span class="note-date">${new Date(note.timestamp).toLocaleDateString()}</span>
        ${note.url ? `<a href="${note.url}" target="_blank" class="note-url"><i class="fas fa-link"></i></a>` : ''}
      `;
  
      const actions = document.createElement('div');
      actions.className = 'note-actions';
      actions.innerHTML = `
        <button class="view-btn" title="View"><i class="fas fa-eye"></i> View</button>
        <button class="edit-btn" title="Edit"><i class="fas fa-edit"></i> Edit</button>
        <button class="delete-btn" title="Delete"><i class="fas fa-trash"></i> Delete</button>
      `;
  
      // Add event listeners for the action buttons
      actions.querySelector('.view-btn').addEventListener('click', () => this.openViewModal(note));
      actions.querySelector('.edit-btn').addEventListener('click', () => this.openEditModal(note));
      actions.querySelector('.delete-btn').addEventListener('click', () => this.deleteNote(note.id));
  
      noteItem.append(title, text, tags, meta, actions);
      return noteItem;
    }
  
    updateTagsList() {
      const allTags = new Set();
      this.notes.forEach(note => {
        if (note.tags) {
          note.tags.forEach(tag => allTags.add(tag));
        }
      });
  
      this.tagsSelect.innerHTML = '<option value="">All Tags</option>';
      Array.from(allTags).sort().forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        this.tagsSelect.appendChild(option);
      });
    }
  
    filterNotes() {
      const searchTerm = this.searchInput.value.toLowerCase();
      const selectedTag = this.tagsSelect.value;
      const sortOption = this.sortSelect.value;
  
      let filteredNotes = this.notes.filter(note => {
        const matchesSearch = (note.title && note.title.toLowerCase().includes(searchTerm)) ||
                              (note.text && note.text.toLowerCase().includes(searchTerm));
        const matchesTag = !selectedTag || (note.tags && note.tags.includes(selectedTag));
        return matchesSearch && matchesTag;
      });
  
      // Apply sorting
      filteredNotes.sort((a, b) => {
        switch (sortOption) {
          case 'date-desc':
            return b.timestamp - a.timestamp;
          case 'date-asc':
            return a.timestamp - b.timestamp;
          case 'title':
            return (a.title || '').localeCompare((b.title || ''));
          default:
            return 0;
        }
      });
  
      this.displayNotes(filteredNotes);
    }
  
    openAddModal() {
      this.editingNoteId = null;
      this.modalTitle.textContent = 'Add Note';
      this.noteForm.reset();
      this.tagsPreview.innerHTML = '';
      this.noteUrlInput.value = '';
      this.noteModal.style.display = 'flex';
      this.noteTitleInput.focus();
    }
  
    openEditModal(note) {
      this.editingNoteId = note.id;
      this.modalTitle.textContent = 'Edit Note';
      this.noteTitleInput.value = note.title || '';
      this.noteTextInput.value = note.text;
      this.noteTagsInput.value = note.tags ? note.tags.join(', ') : '';
      this.noteUrlInput.value = note.url || '';
      this.updateTagsPreview();
      this.noteModal.style.display = 'flex';
      this.noteTitleInput.focus();
    }
  
    closeModal() {
      this.noteModal.style.display = 'none';
      this.noteForm.reset();
      this.tagsPreview.innerHTML = '';
      this.editingNoteId = null;
    }
  
    // Open the View Note modal
    openViewModal(note) {
      this.viewNoteTitle.textContent = note.title || 'Untitled';
      this.viewNoteText.textContent = note.text;
      this.viewNoteTags.innerHTML = '';
      
      if (note.tags && note.tags.length) {
        note.tags.forEach(tag => {
          const tagSpan = document.createElement('span');
          tagSpan.className = 'tag';
          tagSpan.textContent = tag;
          this.viewNoteTags.appendChild(tagSpan);
        });
      }
  

  
      this.viewNoteModal.style.display = 'flex';
    }
  
    // Close the View Note modal
    closeViewModal() {
      this.viewNoteModal.style.display = 'none';
    }
  
    // Copy the note content to clipboard
    copyNoteToClipboard() {
      const text = `Title: ${this.viewNoteTitle.textContent}\n\n${this.viewNoteText.textContent}`;
      
      navigator.clipboard.writeText(text)
        .then(() => {
          this.showToast('Note copied to clipboard!', 'success');
        })
        .catch(err => {
          console.error('Failed to copy note:', err);
          this.showToast('Failed to copy note.', 'error');
        });
    }
  
    async handleNoteSave(e) {
      e.preventDefault();
  
      const title = this.noteTitleInput.value.trim() || 'Untitled';
      const text = this.noteTextInput.value.trim();
      const tags = this.noteTagsInput.value.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      const url = this.noteUrlInput.value;
  
      if (!text) {
        this.showToast('Note text cannot be empty.', 'error');
        return;
      }
  
      const noteData = {
        id: this.editingNoteId || Date.now().toString(),
        title,
        text,
        tags,
        url,
        timestamp: Date.now()
      };
  
      try {
        if (this.editingNoteId) {
          const index = this.notes.findIndex(n => n.id === this.editingNoteId);
          if (index !== -1) {
            this.notes[index] = { ...this.notes[index], ...noteData };
          }
        } else {
          this.notes.unshift(noteData);
        }
  
        await chrome.storage.sync.set({ notes: this.notes });
        this.closeModal();
        this.loadNotes();
        this.showToast('Note saved successfully!', 'success');
      } catch (error) {
        console.error('Error saving note:', error);
        this.showToast('Error saving note.', 'error');
      }
    }
  
    async deleteNote(noteId) {
      if (confirm('Are you sure you want to delete this note?')) {
        try {
          this.notes = this.notes.filter(note => note.id !== noteId);
          await chrome.storage.sync.set({ notes: this.notes });
          this.loadNotes();
          this.showToast('Note deleted successfully!', 'success');
        } catch (error) {
          console.error('Error deleting note:', error);
          this.showToast('Error deleting note.', 'error');
        }
      }
    }
  
    updateTagsPreview() {
      const tags = this.noteTagsInput.value.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      this.tagsPreview.innerHTML = '';
      tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
        tagElement.textContent = tag;
        this.tagsPreview.appendChild(tagElement);
      });
    }
  
    exportNotes() {
      if (this.notes.length === 0) {
        this.showToast('No notes to export.', 'info');
        return;
      }
  
      // Construct the text content
      const content = this.notes.map(note => {
        return `
Title: ${note.title || 'Untitled'}
Tags: ${note.tags && note.tags.length ? note.tags.join(', ') : 'None'}
Date: ${new Date(note.timestamp).toLocaleString()}
URL: ${note.url || 'N/A'}

${note.text}

----------------------------------------

`;
      }).join('');
  
      const blob = new Blob([content.trim()], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `quick-notes-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      
      URL.revokeObjectURL(url);
      this.showToast('Notes exported successfully as text!', 'success');
    }
  
    importNotes() {
      // Import functionality is disabled for now
      // This method can be removed or kept empty
    }
  
    async syncWithGoogle() {
      // TODO: Implement Google Drive sync
      this.showToast('Google Drive sync coming soon!', 'info');
    }
  
    async syncWithNotion() {
      // TODO: Implement Notion sync
      this.showToast('Notion sync coming soon!', 'info');
    }
  
    showToast(message, type = 'info') {
      this.toast.textContent = message;
      this.toast.className = `toast toast-${type} show`;
  
      setTimeout(() => {
        this.toast.className = `toast toast-${type}`;
      }, 3000);
    }
  }
  
  // Initialize the app
  document.addEventListener('DOMContentLoaded', () => {
    new NoteTaker();
  });
