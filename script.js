// Update Gist API URL with raw content
const GIST_ID = 'c1a20b4538ecb4eff6ed744c8c98e94a';
const GIST_API = `https://gist.githubusercontent.com/${GIST_ID}/raw/counter.json`;

// Variable to store click count
var clickCounter = 0;

// Function to change text and count
function changeTextAndCount() {
    clickCounter++;

    if (clickCounter % 2 === 1) {
        document.getElementById('helloText').innerText = 'Hello, Marko!';
    } else {
        document.getElementById('helloText').innerText = 'Hello, World!';
    }

    document.getElementById('clickButton').innerText = 'Click me (' + clickCounter + ')';

    // Save the click count to GitHub Gist
    saveToGist();
}

// Function to save click count to Gist
function saveToGist() {
    // Prepare data to be saved
    const data = {
        clickCounter: clickCounter
    };

    // Update Gist using GitHub API
    fetch(GIST_API, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': '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'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.text();  // Use response.text() instead of response.json()
    })
    .then(data => console.log('Counter saved to Gist:', data))
    .catch(error => console.error('Error saving counter to Gist:', error));
}

// Initialize text and count on page load
document.addEventListener('DOMContentLoaded', function () {
    // Load the click count from GitHub Gist
    fetch(GIST_API)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Extract clickCounter from the Gist data
            clickCounter = data.clickCounter || 0;

            // Set initial text and count
            if (clickCounter % 2 === 1) {
                document.getElementById('helloText').innerText = 'Hello, Marko!';
            } else {
                document.getElementById('helloText').innerText = 'Hello, World!';
            }
            document.getElementById('clickButton').innerText = 'Click me (' + clickCounter + ')';
        })
        .catch(error => console.error('Error loading counter from Gist:', error));
});
