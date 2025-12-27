const importBtn = document.getElementById("importBtn");
const exportBtn = document.getElementById("exportBtn");
const fileInput = document.getElementById("fileInput");
const status = document.getElementById("status");

importBtn.onclick = () => fileInput.click();

fileInput.onchange = async () => {
    if (!fileInput.files.length) return;

    const file = fileInput.files[0];
    status.textContent = "Reading file...";

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        console.log("Loaded bookmarks:", data);
        await importTree(data);

        status.textContent = "Import complete!";
    } catch (e) {
        console.error(e);
        status.textContent = "Error: " + e.message;
    } finally {
        fileInput.value = "";
    }
};

exportBtn.onclick = async () => {
    const tree = await chrome.bookmarks.getTree();
    const blob = new Blob([JSON.stringify(tree, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
        url,
        filename: "bookmarks.json",
        saveAs: true
    });
};

async function importTree(roots) {
  for (const root of roots) {
    if (!root.children) continue;
    for (const child of root.children) {
      await importNode(child, null);
    }
  }
}

async function importNode(node, overrideParent) {
  // Determine correct parent
  let parentId = overrideParent;

  if (node.folderType === "bookmarks-bar") parentId = "1";
  if (node.folderType === "other") parentId = "2";

  // If it's a URL, insert it
  if (node.url) {
    await chrome.bookmarks.create({
      parentId,
      title: node.title,
      url: node.url
    });
    return;
  }

  // If it's a folder
  let newParent = parentId;

  if (!node.folderType) {
    // user-created folder — create it
    const folder = await chrome.bookmarks.create({
      parentId,
      title: node.title || "Imported"
    });
    newParent = folder.id;
  }

  // recurse children
  if (node.children) {
    for (const child of node.children) {
      await importNode(child, newParent);
      await pause();
    }
  }
}


function pause() {
    return new Promise(r => setTimeout(r, 0));
}
