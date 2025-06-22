const noteContent = document.getElementById('note-content');
const title = document.getElementById('title');
const preview = document.getElementById('preview');

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

function updatePreview(text) {
    const preview = document.getElementById('preview');
    preview.innerHTML = markdownToHtmlBody(text);
    if (window.MathJax && window.MathJax.typeset) {
        MathJax.typeset();
    }
}

noteContent.addEventListener('input', () => {
    updatePreview(noteContent.innerText);
});

const urlParams = new URLSearchParams(window.location.search);
const id = urlParams.get('id');

while (!window.MathJax) {}
fetch(`https://obsites-api.vercel.app/files/${id}`)
    .then((response) => {
        if (!response.ok) {
            document.getElementById('title').innerText = '404: Note not found';
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
    })
    .then((response) => {
        const json = JSON.parse(response);
        title.innerText = json.title;
        noteContent.innerText = json.content;

        if (window.MathJax && window.MathJax.typesetPromise) {
            MathJax.typesetPromise();
        }
    })
    .catch((error) => {
        console.error('Ошибка при получении файла:', error);
    });

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (noteContent.innerText === '') {
        alert('Please select a file or paste the content before submitting.');
        return;
    }

    const formData = new FormData();
    formData.append('content', noteContent.innerText);
    formData.append('title', titleInput.value);

    Object.entries(user).forEach(([key, value]) => {
        if (value != null) {
            formData.append(key, value);
        }
    });

    try {
        const res = await fetch(`https://obsites-api.vercel.app/edit/${id}`, {
            method: 'POST',
            body: formData,
        });
        if (!res.ok) throw new Error(`Ошибка ${res.status}`);
        displayOverlay(`./note?id=${id}`);
    } catch (err) {
        console.error(err);
        alert('Не удалось загрузить файл');
    }
});

function displayOverlay(url) {
    const linkToNote = document.getElementById('link-to-note');
    linkToNote.href = url;
    document.getElementById('overlay').style.display = 'flex';
}
