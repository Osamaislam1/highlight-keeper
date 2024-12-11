// content.js

class HighlightManager {
    constructor() {
      this.setupEventListeners();
      this.highlightedElements = new Set();
    }
  
    setupEventListeners() {
      // Listen for text selection
      document.addEventListener('mouseup', () => this.handleTextSelection());
  
      // Listen for keyboard shortcuts
      document.addEventListener('keydown', (e) => this.handleKeyboardShortcut(e));
    }
  
    handleTextSelection() {
        const selection = window.getSelection();
        if (!selection.toString().trim()) return;
    
        // Debounce to prevent multiple buttons
        if (document.querySelector('.quick-note-floating-btn')) return;
    
        // Show floating action button near selection
        this.showFloatingButton(selection);
      }
  
 
      handleKeyboardShortcut(e) {
        // Ctrl/Cmd + Shift + S to save selection
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
          e.preventDefault();
          const selection = window.getSelection();
          if (selection.toString().trim()) {
            this.saveHighlight(selection.toString());
          }
        }
      }
  
      showFloatingButton(selection) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
    
        const button = document.createElement('div');
        button.className = 'quick-note-floating-btn';
        button.innerHTML = '<i class="fas fa-bookmark"></i>';
        button.title = 'Save to Quick Notes';
    
        // Position the button
        const buttonSize = 12; // in pixels
        let top = rect.top + window.scrollY - buttonSize - 5; // 5px above selection
        let left = rect.left + window.scrollX + rect.width / 2 - buttonSize / 2;
    
        // Ensure the button stays within the viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
    
        if (top < window.scrollY) {
          top = rect.bottom + window.scrollY + 5; // place below the selection
        }
        if (left < window.scrollX) {
          left = window.scrollX + 5;
        } else if (left + buttonSize > window.scrollX + viewportWidth) {
          left = window.scrollX + viewportWidth - buttonSize - 5;
        }
    
        button.style.top = `${top}px`;
        button.style.left = `${left}px`;
        button.style.width = `${buttonSize}px`;
        button.style.height = `${buttonSize}px`;
        button.style.display = 'flex';
        button.style.justifyContent = 'center';
        button.style.alignItems = 'center';
    
        // Add click handler
        button.addEventListener('click', () => {
          this.saveHighlight(selection.toString());
          this.removeFloatingButton();
        });
    
        document.body.appendChild(button);
    
        // Remove button when clicking outside or making new selection
        document.addEventListener('mousedown', (e) => {
          if (!button.contains(e.target)) {
            this.removeFloatingButton();
          }
        }, { once: true });
      }
    
      removeFloatingButton() {
        const existingBtn = document.querySelector('.quick-note-floating-btn');
        if (existingBtn) {
          existingBtn.remove();
        }
      }
  
      async saveHighlight(text) {
        try {
            // Check if chrome.runtime is available
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                const response = await chrome.runtime.sendMessage({
                    action: 'saveHighlight',
                    text: text
                });
    
                console.log('Response from background:', response);
    
                if (response.success) {
                    this.highlightText(text);
                }
            } else {
                console.error('chrome.runtime is not available');
            }
        } catch (error) {
            console.error('Error saving highlight:', error);
        }
    }
    
  
    highlightText(text) {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
  
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.className = 'quick-note-highlight';
      span.title = 'Saved to Quick Notes';
  
      // Store the highlighted element
      this.highlightedElements.add(span);
  
      try {
        // Wrap the selected text
        range.surroundContents(span);
      } catch (error) {
        console.error('Error highlighting text:', error);
        return;
      }
  
      // Add click handler to show options
      span.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering other click events
        this.showHighlightOptions(e, span);
      });
    }
  
    showHighlightOptions(event, highlightElement) {
      // Remove existing options if any
      this.removeHighlightOptions();

      const options = document.createElement('div');
      options.className = 'quick-note-options';
      options.innerHTML = `
        <div class="quick-note-option" data-action="copy">Copy to Clipboard</div>
        <div class="quick-note-option" data-action="remove">Remove Highlight</div>
      `;

      // Position options near the highlight
      const rect = highlightElement.getBoundingClientRect();
      const optionWidth = 120; // in pixels
      const optionHeight = 40; // approximate height

      let top = rect.top + window.scrollY - optionHeight - 5; // above the highlight
      let left = rect.left + window.scrollX + rect.width / 2 - optionWidth / 2;

      // Ensure the options stay within the viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (top < window.scrollY) {
        top = rect.bottom + window.scrollY + 5; // below the highlight
      }
      if (left < window.scrollX) {
        left = window.scrollX + 5;
      } else if (left + optionWidth > window.scrollX + viewportWidth) {
        left = window.scrollX + viewportWidth - optionWidth - 5;
      }

      options.style.top = `${top}px`;
      options.style.left = `${left}px`;
      options.style.width = `${optionWidth}px`;
      options.style.height = `${optionHeight}px`;
      options.style.display = 'flex';
      options.style.flexDirection = 'column';
      options.style.justifyContent = 'center';
      options.style.padding = '0 10px';
      options.style.background = 'white';
      options.style.border = '1px solid #ccc';
      options.style.borderRadius = '4px';
      options.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
      options.style.zIndex = '999999';

      // Handle option clicks
      options.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (action === 'copy') {
          navigator.clipboard.writeText(highlightElement.textContent)
            .then(() => {
              this.showTemporaryTooltip(options, 'Copied!');
            })
            .catch(err => {
              console.error('Failed to copy text:', err);
            });
        } else if (action === 'remove') {
          this.removeHighlight(highlightElement);
        }
        options.remove();
      });

      document.body.appendChild(options);

      // Remove options when clicking outside
      document.addEventListener('mousedown', (e) => {
        if (!options.contains(e.target)) {
          options.remove();
        }
      }, { once: true });
    }
  
    removeHighlightOptions() {
      const existingOptions = document.querySelector('.quick-note-options');
      if (existingOptions) {
        existingOptions.remove();
      }
    }
  
    removeHighlight(element) {
      const parent = element.parentNode;
      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
      }
      parent.removeChild(element);
      this.highlightedElements.delete(element);
    }
  
    showTemporaryTooltip(element, message) {
      const tooltip = document.createElement('div');
      tooltip.className = 'quick-note-tooltip';
      tooltip.textContent = message;
  
      tooltip.style.position = 'absolute';
      tooltip.style.top = `${element.offsetTop - 30}px`;
      tooltip.style.left = `${element.offsetLeft}px`;
      tooltip.style.background = '#333';
      tooltip.style.color = 'white';
      tooltip.style.padding = '4px 8px';
      tooltip.style.borderRadius = '4px';
      tooltip.style.fontSize = '12px';
      tooltip.style.opacity = '0';
      tooltip.style.transition = 'opacity 0.3s ease';
  
      document.body.appendChild(tooltip);
  
      // Fade in
      requestAnimationFrame(() => {
        tooltip.style.opacity = '1';
      });
  
      // Fade out after 2 seconds
      setTimeout(() => {
        tooltip.style.opacity = '0';
        tooltip.addEventListener('transitionend', () => {
          tooltip.remove();
        });
      }, 2000);
    }
  }
  
  // Initialize the highlight manager
  new HighlightManager();