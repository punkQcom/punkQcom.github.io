var clickCounter = 0;

function changeTextAndCount() {
    clickCounter++;

    if (clickCounter % 2 === 1) {
        document.getElementById('clickButton').innerText = 'Hello, World!';
    } else {
        document.getElementById('clickButton').innerText = 'Click me (' + clickCounter + ')';
    }
}
