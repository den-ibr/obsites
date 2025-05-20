const template = document.getElementById('note-button-template');
const container = document.querySelector('.note-list');

function addButton(id, title) {
    const button = template.content.cloneNode(true);
    button.querySelector('a').href = `./note?id=${id}`;
    console.log(button);
    button.querySelector('p').textContent = title;
    container.appendChild(button);
}

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

const formData = new FormData();

Object.entries(user).forEach(([key, value]) => {
    if (value != null) {
        formData.append(key, value);
    }
});

fetch('https://obsites-api.vercel.app/notes/', {
    method: 'POST',
    body: formData,
}).then((response) => {
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text();
}).then((response) => {
    const json = JSON.parse(response);
    for (note of json) {
        addButton(note.id, note.title)
    }
}).catch((err) => {
    console.error('Fetch error:', err);
});