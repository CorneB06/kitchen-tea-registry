let registryItems = JSON.parse(localStorage.getItem('registryItems')) || [];
let userEmail = localStorage.getItem('userEmail');
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

function checkSession() {
    const lastSessionTime = localStorage.getItem('lastSessionTime');
    if (lastSessionTime) {
        const timeDiff = Date.now() - lastSessionTime;
        console.log('Time diff:', timeDiff, 'vs Timeout:', SESSION_TIMEOUT);
        return timeDiff < SESSION_TIMEOUT;
    }
    return false;
}

function setEmail() {
    const email = document.getElementById('user-email').value.trim();
    console.log('Setting email:', email);
    if (email && email.includes('@')) {
        userEmail = email;
        localStorage.setItem('userEmail', userEmail);
        localStorage.setItem('lastSessionTime', Date.now());
        document.getElementById('email-prompt').style.display = 'none';
        document.getElementById('session-actions-wrapper').style.display = 'flex'; // Ensure wrapper is shown
        displayItems();
    } else {
        alert('Please enter a valid email address.');
    }
}

function togglePurchased(id) {
    const item = registryItems.find(item => item.id === id);
    if (item) {
        if (item.purchased && item.purchasedByEmail !== userEmail) {
            alert('This item is claimed by another user. You can only uncheck items you claimed.');
            return;
        }
        item.purchased = !item.purchased;
        item.purchasedByEmail = item.purchased ? userEmail : null;
        localStorage.setItem('registryItems', JSON.stringify(registryItems));
        displayItems();
    }
}

function saveSession() {
    localStorage.setItem('registryItems', JSON.stringify(registryItems));
    localStorage.setItem('lastSessionTime', Date.now());
    alert('Thank you for your selections! Your choices have been saved. You can make changes anytime and submit again, or come back later and edit your choices by entering your email again.');
}

function displayItems() {
    console.log('Displaying items, userEmail:', userEmail, 'Session valid:', checkSession());
    const list = document.getElementById('registry-list');
    if (!list) {
        console.error('Registry list element not found!');
        return;
    }
    list.innerHTML = '';
    if (!userEmail || !checkSession()) {
        document.getElementById('email-prompt').style.display = 'block';
        document.getElementById('session-actions-container').style.display = 'block';
        return;
    }
    registryItems.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.className = item.purchased ? 'purchased' : '';
        const links = Array.isArray(item.links) ? item.links : (item.link ? [item.link] : []);
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.name}</td>
            <td>${links.map((link, i) => `<a href="${link}" target="_blank">${links.length > 1 ? `See example ${i + 1}` : 'See example'}</a>`).join('<br>')}</td>
            <td><input type="checkbox" ${item.purchased ? 'checked' : ''} ${item.purchased && item.purchasedByEmail !== userEmail ? 'disabled' : ''} title="${item.purchased && item.purchasedByEmail !== userEmail ? `Claimed by ${item.purchasedByEmail}` : ''}" onchange="togglePurchased(${item.id})"></td>
        `;
        list.appendChild(tr);
    });
    document.getElementById('session-actions-wrapper').style.display = 'flex';
document.getElementById('session-actions-container').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, userEmail:', userEmail, 'Session valid:', checkSession());
    if (userEmail && checkSession()) {
        document.getElementById('email-prompt').style.display = 'none';
        document.getElementById('session-actions-wrapper').style.display = 'flex';
        displayItems();
    } else {
        document.getElementById('email-prompt').style.display = 'block';
        document.getElementById('session-actions-wrapper').style.display = 'none';
    }
    const menuButton = document.querySelector('.menu-button');
    const dropdown = document.querySelector('.dropdown-content');
    if (menuButton && dropdown) {
        menuButton.addEventListener('click', () => {
            dropdown.classList.toggle('hidden');
        });
    }
});