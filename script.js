// Replace 'YOUR_GIST_ID' with the actual gist ID
const GIST_ID = 'punkQcom/c1a20b4538ecb4eff6ed744c8c98e94a.js';
const GIST_API = `https://api.github.com/gists/${GIST_ID}`;

var clickCounter = 0;

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

function saveToGist() {
    // Prepare data to be saved
    const data = {
        files: {
            'clickcounter.json': {
                content: JSON.stringify({ clickCounter })
            }
        }
    };

    // Update Gist using GitHub API
    fetch(GIST_API, {
        method: 'PATCH',
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
        return response.json();
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
            const counterContent = data.files && data.files['counter.json'] && data.files['counter.json'].content;
            clickCounter = counterContent ? JSON.parse(counterContent).clickCounter : 0;

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

