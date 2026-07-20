const revealItems = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) entry.target.classList.add('visible');
}), { threshold: .12, rootMargin: '0px 0px -7% 0px' });
revealItems.forEach(item => observer.observe(item));

const header = document.getElementById('siteHeader');
const bottomBar = document.getElementById('bottomBar');
addEventListener('scroll', () => {
  header.classList.toggle('scrolled', scrollY > 24);
  bottomBar.classList.toggle('show', scrollY > 850 && scrollY < document.body.scrollHeight - innerHeight - 500);
}, { passive: true });

const words = ['Members', 'Revenue', 'Operations', 'Growth'];
let wordIndex = 0;
const rotatingWord = document.getElementById('rotatingWord');
setInterval(() => {
  rotatingWord.classList.add('changing');
  setTimeout(() => {
    wordIndex = (wordIndex + 1) % words.length;
    rotatingWord.textContent = words[wordIndex];
    rotatingWord.classList.remove('changing');
  }, 280);
}, 2800);

const chats = {
  renewal: ['Hi Rahul 👋 Your membership expires on 28 July.', 'Renew now to keep your training uninterrupted.', 'Yes, renew my membership.', '✓ Request received. We will send your payment link shortly.'],
  broadcast: ['🔥 Weekend fitness challenge this Saturday!', 'Bring a friend and unlock a free training session.', 'Count me in! How do I join?', '✓ You are registered. See you at the gym!'],
  birthday: ['Happy birthday, Ananya! 🎉', 'Your AI Gym family wishes you a powerful year ahead.', 'Enjoy a complimentary personal training session this week.', 'Thank you! That made my day ❤️'],
  leads: ['Hi Karan, how was your trial workout?', 'Your trainer has prepared a plan based on your goals.', 'It was great. Can I see the plans?', 'Absolutely — tap below to choose your membership.']
};
const chatBody = document.getElementById('chatBody');
let chatTimers = [];
function renderChat(key) {
  chatTimers.forEach(clearTimeout); chatTimers = []; chatBody.innerHTML = '<div class="typing"><i></i><i></i><i></i></div>';
  chats[key].forEach((message, index) => chatTimers.push(setTimeout(() => {
    if (index === 0) chatBody.innerHTML = '';
    const bubble = document.createElement('div');
    bubble.className = `bubble ${index % 3 === 2 ? 'sent' : ''}`;
    bubble.innerHTML = `${message}<small>${index < 2 ? '10:0' + index : '10:0' + (index + 3)} ✓✓</small>`;
    chatBody.appendChild(bubble);
  }, 450 + index * 650)));
}
const tabs = [...document.querySelectorAll('.feature-tab')];
let tabIndex = 0, tabCycle;
function activateTab(index) {
  tabIndex = index; tabs.forEach((tab, i) => tab.classList.toggle('active', i === index)); renderChat(tabs[index].dataset.tab);
}
function startTabCycle() { clearInterval(tabCycle); tabCycle = setInterval(() => activateTab((tabIndex + 1) % tabs.length), 8000); }
tabs.forEach((tab, index) => tab.addEventListener('click', () => { activateTab(index); startTabCycle(); }));
activateTab(0); startTabCycle();

document.querySelectorAll('.billing-toggle button').forEach(button => button.addEventListener('click', event => {
  const selected = event.currentTarget;
  selected.parentElement.querySelectorAll('button').forEach(item => item.classList.remove('active'));
  selected.classList.add('active');
  const annual = selected.dataset.billing === 'annual';
  document.querySelectorAll('.plan-price').forEach(price => {
    price.innerHTML = `₹${annual ? price.dataset.annual : price.dataset.monthly}<small>/${annual ? 'year' : 'month'}</small>`;
  });
}));

document.getElementById('menuButton').addEventListener('click', event => {
  const nav = document.querySelector('.site-header nav'); nav.classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', nav.classList.contains('open'));
});
