// You can add JavaScript code here if needed
// Get the heading element by its id
const helloTextElement = document.getElementById('helloText');

// Move the function definition outside of any other scope
function changeText() {
    // Get the heading element by its id
    const helloTextElement = document.getElementById('helloText');
    // Change the text when the button is clicked
    helloTextElement.textContent = 'Hello, GPT-3!';
}
