// Move the function definition outside of any other scope

var clickCounter = 0;
var isHelloWorld = true;


function incrementCounter() {
    clickCounter++;
    document.getElementById('clickButton').innerText = 'Click me (' + clickCounter + ')';
}


function changeText() {
    if (isHelloWorld) {
        // Toggle between "Hello, World!" and "Hello, GPT-3!"
        document.getElementById('clickButton').innerText = 'Click me (0)';
        isHelloWorld = false;
    } else {
        // Increment the counter
        clickCounter++;
        document.getElementById('clickButton').innerText = 'Click me (' + clickCounter + ')';
        isHelloWorld = true;
    }
    
}

// You can add more JavaScript code here if needed
