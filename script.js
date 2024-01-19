// Replace 'YOUR_GIST_ID' with the actual gist ID
const GIST_ID = 'c1a20b4538ecb4eff6ed744c8c98e94a';
const GIST_API = `https://api.github.com/gists/${GIST_ID}/raw/clickcounter.json`;

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

   // Load the click count from GitHub Gist
fetch(GIST_API)
.then(response => {
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
})
.then(data => {
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

