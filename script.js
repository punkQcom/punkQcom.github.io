// Move the function definition outside of any other scope
function changeText() {
    // Get the heading element by its id
    const helloTextElement = document.getElementById('helloText');

    // Check the current text content
    if (helloTextElement.textContent === 'Hello, World!') {
        // If the current text is "Hello, World!", change it to "Hello, GPT-3!"
        helloTextElement.textContent = 'Hello, GPT-3!';
    } else {
        // If the current text is not "Hello, World!", change it back to "Hello, World!"
        helloTextElement.textContent = 'Hello, World!';
    }
}

// You can add more JavaScript code here if needed
