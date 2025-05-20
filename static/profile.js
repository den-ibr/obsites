const template = document.getElementById('note-button-template');
const container = document.querySelector('.note-list');

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

function addButton(id, title) {
    const button = template.content.cloneNode(true);
    const a = button.querySelector('a');
    a.href = `./note?id=${id}`;
    button.querySelector('p').textContent = title;
    button.querySelector('img').addEventListener('click', (event) => {
        event.preventDefault();
        fetch(`https://obsites-api.vercel.app/delete/${id}`, {
            method: 'POST',
            body: formData,
        })
            .then(() => {
                a.style.display = 'none';
            })
            .catch((err) => console.log(err));
    });
    container.appendChild(button);
}

fetch('https://obsites-api.vercel.app/notes/', {
    method: 'POST',
    body: formData,
})
    .then((response) => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
    })
    .then((response) => {
        const json = JSON.parse(response);
        for (note of json) {
            addButton(note.id, note.title);
        }
    })
    .catch((err) => {
        console.error('Fetch error:', err);
    });
