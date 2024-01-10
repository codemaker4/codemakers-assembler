// https://stackoverflow.com/questions/3665115/how-to-create-a-file-in-memory-for-user-to-download-but-not-through-server
function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
  
    element.style.display = 'none';
    document.body.appendChild(element);
  
    element.click();
  
    document.body.removeChild(element);
}


function exportVincelingMem() {
    let data = compiler.export();
    if (data === undefined || data.length == 0) {
        return;
    }

    download("data.json", JSON.stringify(data));
    postMessage(`Export successfull! Exported ${data.length} bytes.\nPlease put this file in steam/steamapps/workshop/content/387990/2817316401/data.json.`)
}