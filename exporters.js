function exportVincelingMem() {
    let data = compiler.export();
    if (data === undefined || data.length == 0) {
        alert("Export failed")
        return;
    }

    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(data)));
    element.setAttribute('download', 'data.json');
  
    element.style.display = 'none';
    document.body.appendChild(element);
  
    element.click();
  
    document.body.removeChild(element);
}