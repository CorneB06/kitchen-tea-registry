// Use CDN for Supabase client
const { createClient } = window.supabase; // Assuming Supabase is loaded via CDN
if (!createClient) {
    console.error('Supabase client not loaded. Check CDN or network.');
    throw new Error('Supabase not available');
}
const supabase = createClient('https://zlrqwipaczylupmrhnfm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpscnF3aXBhY3p5bHVwbXJobmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NzU1NTYsImV4cCI6MjA2NjM1MTU1Nn0.13iH0cqSpLI2_Pw-HABQG7Heyx9yDxZ2N8j7fCvSAjY');
let userEmail = localStorage.getItem('userEmail');
const SESSION_TIMEOUT = 1 * 60 * 1000; // 1 minute

async function checkSession() {
    const lastSessionTime = localStorage.getItem('lastSessionTime');
    return lastSessionTime ? Date.now() - lastSessionTime < SESSION_TIMEOUT : false;
}

export function setEmail() {
    const emailInput = document.getElementById('user-email');
    if (!emailInput) {
        console.warn('No email input field found. Skipping setEmail().');
        return;
    }

    const email = emailInput.value.trim();
    console.log('Setting email:', email);

    if (email && email.includes('@')) {
        userEmail = email.toLowerCase();
        localStorage.setItem('userEmail', userEmail);
        localStorage.setItem('lastSessionTime', Date.now());
        document.getElementById('email-prompt').style.display = 'none';
        document.getElementById('session-actions-wrapper').style.display = 'flex';
        displayItems();
    } else {
        alert('Please enter a valid email address.');
    }
}


export async function togglePurchased(id) {
    try {
        const { data: item, error } = await supabase
            .from('registry_items')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        else if (item.purchased_by && item.purchased_by !== userEmail) {
            alert('This item is claimed by another user.');
        } else {
            const newPurchasedBy = item.purchased_by === userEmail ? null : userEmail;
            const { error: updateError } = await supabase
                .from('registry_items')
                .update({ purchased_by: newPurchasedBy })
                .eq('id', id);
            if (updateError) throw updateError;
            await displayItems();
        }
    } catch (error) {
        console.error('Error in togglePurchased:', error.message);
    }
}

export async function saveSession() {
    localStorage.setItem('lastSessionTime', Date.now());
    alert('Your selections have been saved. You can edit them later with your email.');
}

export async function displayItems() {
    try {
        const { data: registryItems, error } = await supabase.from('registry_items').select('*').order('item_name', { ascending: true });
        if (error) throw error;
        console.log('Fetched items:', registryItems);
        const list = document.getElementById('registry-list');
        if (!list) {
            console.error('Registry list element not found');
            alert('Error: Table not found. Check HTML structure.');
            return;
        }
        list.innerHTML = '';
        registryItems.forEach((item, index) => {
            console.log('Rendering item:', item.id, item.item_name, item.example_urls);
            const tr = document.createElement('tr');
            const isMine = item.purchased_by === userEmail;
            if (item.purchased_by) {
                tr.style.textDecoration = 'line-through';
                tr.style.color = 'grey';
                tr.style.opacity = '0.6';
                if (isMine) {
                    tr.title = 'You selected this item';
                } else {
                    tr.title = 'This item is already selected by someone else';
                }
            }

            const isPurchased = item.purchased_by !== null;
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.item_name}</td>
                <td class="link-cell">
                    ${item.example_urls && item.example_urls.length > 0 ? 
                        item.example_urls.map((url, i) => `<a href="${url}" target="_blank">See example ${i + 1}</a>`).join('<br>') : 
                        ''
                    }
                </td>
                <td>
                    <input type="checkbox" ${isPurchased ? (isMine ? 'checked': 'disabled checked') : ''} onchange="updateSelection('${item.id}', this.checked)">
                </td>
            `;
            list.appendChild(tr);
        });
    } catch (error) {
        console.error('Error in displayItems:', error);
        alert('Failed to load items: ' + error.message);
    }
}


async function updateSelection(id, checked) {
    const email = userEmail;
    console.log('Email entered:', email);  // ✅ Add this line

    if (!email) {
        alert('Please enter your email before selecting an item.');
        displayItems();  // ✅ Re-render the table
        return;
    }

    const { data: item, error } = await supabase
        .from('registry_items')
        .select('purchased_by')
        .eq('id', id)
        .single();

    if (error || !item) {
        console.error('Error fetching item:', error);
        alert('Error checking item ownership.');
        return;
    }

    if (item.purchased_by && item.purchased_by !== email) {
        alert('Sorry, this item was already selected by someone else.');
        displayItems(); // refresh to undo any visual changes
        return;
    }

    const updatedPurchasedBy = checked ? email : null;

    const { error: updateError } = await supabase
        .from('registry_items')
        .update({ purchased_by: updatedPurchasedBy })
        .eq('id', id);

    if (updateError) {
        console.error('Error updating selection:', updateError);
        alert('Error saving your selection.');
    }

    displayItems(); // re-render the list
}


// Initialize page and set up event listeners
export function init() {
    const menuButton = document.querySelector('.menu-button');
    const dropdown = document.querySelector('.dropdown-content');
    console.log('Initializing menu button:', menuButton, dropdown);

    if (menuButton && dropdown) {
        menuButton.addEventListener('click', () => {
            dropdown.classList.toggle('hidden');
        });
    } else {
        console.warn('Menu or dropdown not found.');
    }
}


window.addEventListener('pageshow', async () => {
    console.log('Page show event triggered');
    init(); // Reattach all listeners reliably

    if (userEmail && await checkSession()) {
        document.getElementById('email-prompt').style.display = 'none';
        document.getElementById('session-actions-wrapper').style.display = 'flex';
        await displayItems();
    } else {
        document.getElementById('email-prompt').style.display = 'block';
        document.getElementById('session-actions-wrapper').style.display = 'none';
    }
});



window.displayItems = displayItems;
window.updateSelection = updateSelection;
