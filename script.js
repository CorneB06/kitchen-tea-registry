// Initialize Supabase client (using the global from the CDN)
const { createClient } = window.supabase;
const supabase = createClient(
  'https://zlrqwipaczylupmrhnfm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpscnF3aXBhY3p5bHVwbXJobmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NzU1NTYsImV4cCI6MjA2NjM1MTU1Nn0.13iH0cqSpLI2_Pw-HABQG7Heyx9yDxZ2N8j7fCvSAjY'
);

// 1) Email submission
export async function setEmail() {
  const emailInput = document.getElementById('user-email');
  const email = emailInput?.value.trim();
  if (!email || !email.includes('@')) {
    alert('Please enter a valid email address.');
    return;
  }
  localStorage.setItem('userEmail', email.toLowerCase());
  localStorage.setItem('lastSessionTime', Date.now());
  document.getElementById('email-prompt').style.display = 'none';
  document.getElementById('session-actions-wrapper').style.display = 'flex';
  await displayItems();
}

// 2) Save & Submit — extend the session
export async function saveSession() {
  localStorage.setItem('lastSessionTime', Date.now());
  alert('Your selections have been saved! You can return to update within 30 minutes.');
}

// 3) Done / Exit — clear session and thank-you redirect
export function completeRegistry() {
  localStorage.removeItem('userEmail');
  localStorage.removeItem('lastSessionTime');
  window.location.href = 'thank-you.html';
}

// 4) Fetch and render registry items
export async function displayItems() {
  try {
    const { data: items, error } = await supabase
      .from('registry_items')
      .select('*')
      .order('item_name', { ascending: true });
    if (error) throw error;

    const list = document.getElementById('registry-list');
    list.innerHTML = '';
    const userEmail = localStorage.getItem('userEmail') || '';

    items.forEach((item, idx) => {
      const tr = document.createElement('tr');
      const isPurchased = item.purchased_by !== null;
      const isMine      = item.purchased_by === userEmail;

      // Apply visual style if claimed
      if (isPurchased) {
        tr.style.textDecoration = 'line-through';
        tr.style.opacity        = '0.6';
      }

      // Build the row HTML without inline handlers
        tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${item.item_name}</td>
        <td class="link-cell">
            ${item.example_urls.map((u,i)=>
            `<a href="${u}" target="_blank">See example ${i+1}</a>`
            ).join('<br>')}
        </td>
        <td>
            <input type="checkbox" ${isPurchased
            ? (isMine ? 'checked' : 'disabled checked')
            : ''}>
        </td>
        `;

      // Append the row first
      list.appendChild(tr);

        const cb = tr.querySelector('input[type="checkbox"]');
        cb.addEventListener('change', () => {
        updateSelection(item.id, cb.checked);
        });


      // Now wire up the checkbox event listener
      const checkbox = tr.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.addEventListener('change', () => {
          updateSelection(item.id, checkbox.checked);
        });
      }
    });
  } catch (e) {
    console.error('displayItems error:', e);
  }
}


// 5) Update selection handler
export async function updateSelection(id, checked) {
  const email = localStorage.getItem('userEmail');
  if (!email) {
    alert('Please enter your email first.');
    return;
  }
  const { data: row, error } = await supabase
    .from('registry_items')
    .select('purchased_by')
    .eq('id', id)
    .single();
  if (error) { console.error(error); return; }

  if (row.purchased_by && row.purchased_by !== email) {
    alert('Already claimed by another.');
    await displayItems();
    return;
  }

  const { error: upd } = await supabase
    .from('registry_items')
    .update({ purchased_by: checked ? email : null })
    .eq('id', id);
  if (upd) { console.error(upd); return; }
  await displayItems();
}

// 6) Menu button wiring AND top‐level button hookups
export function init() {
  // Supabase client setup (if not already done globally)
  // const supabase = createClient(...);

  // Menu dropdown
  const menuButton = document.querySelector('.menu-button');
  const dropdown   = document.querySelector('.dropdown-content');
  if (menuButton && dropdown) {
    menuButton.addEventListener('click', () => dropdown.classList.toggle('hidden'));
  }

  // Email submit
  document.getElementById('email-submit-btn')?.addEventListener('click', setEmail);

  // Save & Submit
  document.getElementById('save-btn')?.addEventListener('click', saveSession);

  // Done / Exit
  document.getElementById('done-btn')?.addEventListener('click', completeRegistry);
}
