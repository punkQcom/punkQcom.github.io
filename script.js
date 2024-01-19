var clickCounter = 0;

function changeTextAndCount() {
    clickCounter++;

    if (clickCounter % 2 === 1) {
        document.getElementById('helloText').innerText = 'Hello, Marko!';
    } else {
        document.getElementById('helloText').innerText = 'Click me (' + clickCounter + ')';
    }
}
