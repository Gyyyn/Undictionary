// This function creates the right-click menu item.
// It's wrapped in a listener so it only runs once when the extension is installed.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "search-in-undictionary",
    // The "%s" is a placeholder that will be replaced by the text you've selected.
    title: "Search (Und)ictionary for \"%s\"",
    // This makes the menu item appear only when you've selected text.
    contexts: ["selection"]
  });
});

// This function listens for a click on your menu item.
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Check if the click was on our menu item
  if (info.menuItemId === "search-in-undictionary" && info.selectionText) {
    const searchQuery = info.selectionText;
    
    // Create the URL for our bookmarks page, adding the search query as a parameter.
    const url = chrome.runtime.getURL('dictionary.html?q=' + encodeURIComponent(searchQuery));
    
    // Create a new window with the size of a popup.
    chrome.windows.create({
      url: url,
      type: 'popup',
      width: 400,
      height: 600
    });
  }
});