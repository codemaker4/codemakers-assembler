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

function exportNiknalEmulator() {
    let data = compiler.export();
    if (data === undefined || data.length == 0) {
        return;
    }

    let memory = [];
    for (let i = 0; i < data.length; i++) {
        const byte = data[i];
        while (memory.length <= byte[0]) {
            memory.push("00000000");
        }

        let binary = byte[1].toString(2);
        while (binary.length < 8) {
            binary = "0" + binary;
        }
        
        memory[byte[0]] = binary;
    }

    let file = "";
    for (let i = 0; i < memory.length; i++) {
        file += memory[i] + "\n";
    }

    download("memory.txt", file);
    postMessage(`Export successfull! Exported ${data.length} bytes to an address space of ${memory.length} bytes.\nDownload the emulator from https://github.com/niknal357/SMPU-emulator and replace the memory.txt file.`);
}