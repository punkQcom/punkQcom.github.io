var clickCounter = 0;

function changeTextAndCount() {
    clickCounter++;

    if (clickCounter % 2 === 1) {
        document.getElementById('outputText').innerText = 'Hello, World!';
    } else {
        document.getElementById('outputText').innerText = 'Click me (' + clickCounter + ')';
    }
}
