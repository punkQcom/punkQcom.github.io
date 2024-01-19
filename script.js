function handleFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileName');
    const fileInfoContainer = document.getElementById('fileInfo');
    const displayFileName = document.getElementById('displayFileName');
    const displayFileType = document.getElementById('displayFileType');
    const displayFileSize = document.getElementById('displayFileSize');

    const file = fileInput.files[0];

    if (file) {
        fileNameDisplay.textContent = `File chosen: ${file.name}`;
        fileInfoContainer.style.display = 'block';

        displayFileName.textContent = file.name;
        displayFileType.textContent = file.type || 'Not available';
        displayFileSize.textContent = file.size || 'Not available';
    } else {
        fileNameDisplay.textContent = 'No file chosen';
        fileInfoContainer.style.display = 'none';
    }
}
