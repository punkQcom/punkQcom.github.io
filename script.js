var clickCounter = 0;

function changeTextAndCount() {
    clickCounter++;

    if (clickCounter % 2 === 1) {
        document.getElementById('helloText').innerText = 'Hello, Marko!';
    } else {
        document.getElementById('helloText').innerText = 'Hello, World!';
    }

    // Update the button text to include the counter
    document.getElementById('clickButton').innerText = 'Click me (' + clickCounter + ')';
}
