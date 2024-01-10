function closeMessage(closeButton) {
    console.log(closeButton)
    closeButton.parentElement.remove() 
}

function postMessage(text) {
    const template = document.createElement('template');
    template.innerHTML = `<div class="message"><p class="messageContent"></p><button class="messageCloseButton" onclick="closeMessage(this);">X</button></div>`;
    let message = template.content.children[0];
    message.firstChild.innerText = text;
    document.getElementById("messagePanel").appendChild(message);
    return message;
}

function editMessage(message, text) {
    if (!message || messageDeleted(message)) {
        return postMessage(text);
    }

    message.children[0].innerText = text;
    return message;
}

function deleteMessage(message) {
    message.remove();
}

function messageDeleted(message) {
    return message.parentElement === null;
}