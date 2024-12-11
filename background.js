// background.js

// Consolidated onInstalled listener
chrome.runtime.onInstalled.addListener((details) => {
    // Create context menu when extension is installed
    chrome.contextMenus.create({
      id: 'quickNoteTaker',
      title: 'Quick Note Taker',
      contexts: ['selection']
    });
  
    // Create sub-items
    chrome.contextMenus.create({
      id: 'saveHighlight',
      parentId: 'quickNoteTaker',
      title: 'Save Highlight as Note',
      contexts: ['selection']
    });
  
    chrome.contextMenus.create({
      id: 'saveWithTags',
      parentId: 'quickNoteTaker',
      title: 'Save with Tags...',
      contexts: ['selection']
    });
  
    if (details.reason === 'install') {
      // Show welcome notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon16.png',
        title: 'Welcome to Highlight Keeper!',
        message: 'Right-click on any text to save it as a note. Click the extension icon to manage your notes.'
      });
  
      // Initialize storage with empty notes array
      chrome.storage.sync.set({ notes: [] });
    }
  });
  
  // Handle context menu clicks
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'saveHighlight') {
      saveHighlight(info.selectionText, tab);
    } else if (info.menuItemId === 'saveWithTags') {
      saveWithTags(info.selectionText, tab);
    }
  });

  // Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
    // Logic to open the extension or perform any action
    chrome.tabs.create({ url: 'popup/popup.html' }); // Adjust the URL as needed
});
  
  // Save highlight directly
  async function saveHighlight(text, noteText, tab) {
    try {
      const note = {
        id: Date.now().toString(),
        text: noteText,
        url: tab.url,
        title: tab.title,
        timestamp: Date.now(),
        tags: []
      };
  
      const result = await chrome.storage.sync.get('notes');
      const notes = result.notes || [];
      notes.unshift(note);
      await chrome.storage.sync.set({ notes });
  
      // Show success notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon16.png',
        title: 'Note Saved!',
        message: 'The highlighted text has been saved successfully.'
      });
  
    } catch (error) {
      console.error('Error saving highlight:', error);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon16.png',
        title: 'Error',
        message: 'Failed to save the highlighted text.'
      });
    }
  }
  
  // Save with tags (opens popup)
  function saveWithTags(text, tab) {
    chrome.storage.local.set({
      pendingNote: {
        text: text,
        url: tab.url,
        title: tab.title
      }
    }, () => {
      chrome.action.openPopup();
    });
  }
  
  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'saveHighlight') {
      saveHighlight(request.text, sender.tab);
      sendResponse({ success: true });
    } else if (request.action === 'highlightError') {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon16.png',
        title: 'Highlight Error',
        message: request.message
      });
      sendResponse({ success: false });
    }
  });
  