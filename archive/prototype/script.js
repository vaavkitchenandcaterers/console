document.getElementById('year').textContent = new Date().getFullYear();

const navToggle = document.getElementById('navToggle');
const nav = document.getElementById('nav');
navToggle.addEventListener('click', () => nav.classList.toggle('open'));
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => nav.classList.remove('open')));

const form = document.getElementById('contactForm');
const formNote = document.getElementById('formNote');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const name = data.get('name') || '';
  const phone = data.get('phone') || '';
  const eventType = data.get('eventType') || 'an event';
  const eventDate = data.get('eventDate') || '';
  const guests = data.get('guests') || '';
  const message = data.get('message') || '';

  const text = `Hi Vaav Kitchen and Caterings, I'm ${name} (${phone}). I'd like a quote for ${eventType}${eventDate ? ' on ' + eventDate : ''}${guests ? ' for approx ' + guests + ' guests' : ''}. ${message}`;
  const url = `https://wa.me/919655356333?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');

  formNote.textContent = 'Opening WhatsApp to send your enquiry...';
  form.reset();
});
