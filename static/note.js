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
        document.getElementById('title').innerText = json.title;
        const html = markdownToHtmlBody(json.content);
        document.getElementById('content').innerHTML += html;
    })
    .catch((error) => {
        console.error('Ошибка при получении файла:', error);
    });
