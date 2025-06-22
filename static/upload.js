const fileInput = document.getElementById('file');
const fileLabel = document.getElementById('file-label');
const fileLabelText = document.getElementById('file-label-text');
const form = document.getElementById('upload-form');
const titleInput = document.getElementById('title');
let content = '';

const userRaw = localStorage.getItem('tg_user');
if (!userRaw) {
    window.location.href = './login';
}
let user;
try {
    user = JSON.parse(userRaw);
} catch (err) {
    console.error('Invalid user data in localStorage');
    window.location.href = './login';
}

fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        fileLabelText.textContent = fileInput.files[0].name;
        const reader = new FileReader();
        reader.addEventListener('load', () => {
            content = reader.result;
            displayPreview(content);
        });
        reader.readAsText(fileInput.files[0]);
    } else {
        fileLabelText.textContent = 'Upload a file';
    }
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (fileInput.files.length === 0) {
        alert('Please select a file before submitting.');
        return;
    }

    const formData = new FormData();
    formData.append('content', content);
    formData.append('title', titleInput.value);
    
    Object.entries(user).forEach(([key, value]) => {
        if (value != null) {
            formData.append(key, value);
        }
    });

    try {
        const res = await fetch('https://obsites-api.vercel.app/upload/', {
            method: 'POST',
            body: formData,
        });
        if (!res.ok) throw new Error(`Ошибка ${res.status}`);
        const json = await res.json();
        displayOverlay(`./note?id=${json.id}`);
    } catch (err) {
        console.error(err);
        alert('Не удалось загрузить файл');
    }
});

function displayPreview(text) {
    const preview = document.getElementById('preview');
    preview.style.display = 'flex';
    preview.innerHTML = markdownToHtmlBody(text);
    if (window.MathJax && window.MathJax.typeset) {
        MathJax.typeset();
    }
}

function displayOverlay(url) {
    const linkToNote = document.getElementById('link-to-note');
    linkToNote.href = url;
    document.getElementById('overlay').style.display = 'flex';
}