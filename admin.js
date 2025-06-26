// Use Supabase client from CDN
console.log('admin.js loaded');
const { createClient } = window.supabase;
if (!createClient) {
    console.error('Supabase client not loaded. Check CDN.');
    throw new Error('Supabase not available');
}
const supabase = createClient('https://zlrqwipaczylupmrhnfm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpscnF3aXBhY3p5bHVwbXJobmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NzU1NTYsImV4cCI6MjA2NjM1MTU1Nn0.13iH0cqSpLI2_Pw-HABQG7Heyx9yDxZ2N8j7fCvSAjY');

const ADMIN_PASSWORD = 'Admin123';
let editingItems = [];

function unlockAdmin() {
    const password = document.getElementById('admin-password').value;
    if (password === ADMIN_PASSWORD) {
        document.getElementById('password-section').classList.add('hidden');
        document.getElementById('admin-section').classList.remove('hidden');
        displayManageItems();
    } else {
        alert('Incorrect password. Please try again.');
    }
}

function addItem() {
    const itemName = document.getElementById('item-name').value.trim();
    const linkInputs = document.querySelectorAll('#link-inputs input[type="url"]');
    const links = Array.from(linkInputs).map(input => input.value.trim()).filter(link => link);
    if (itemName && links.length > 0) {
        const newItem = {
            item_name: itemName,
            example_urls: links,
            purchased_by: null
        };
        supabase.from('registry_items').insert(newItem).then(({ error }) => {
            if (error) {
                console.error('Error adding item:', error);
                alert('Failed to add item: ' + error.message);
            } else {
                document.getElementById('item-name').value = '';
                document.querySelector('#link-inputs').innerHTML = '<input type="url" id="item-link-0" placeholder="Enter link to example">';
                alert('Item added successfully!');
                displayManageItems();
            }
        });
    } else {
        alert('Please enter both item name and at least one link.');
    }
}

function addLinkInput() {
    const linkInputs = document.querySelectorAll('#link-inputs input[type="url"]');
    const newIndex = linkInputs.length;
    const div = document.getElementById('link-inputs');
    const newInput = document.createElement('input');
    newInput.type = 'url';
    newInput.id = `item-link-${newIndex}`;
    newInput.placeholder = 'Enter link to example';
    div.appendChild(newInput);
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    const uploadButton = document.querySelector('button[onclick*="excel-upload"]');
    uploadButton.classList.add('uploading');
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            console.log('Excel headers:', Object.keys(jsonData[0] || {}));
            console.log('First 3 rows:', jsonData.slice(0, 3));
            const { error: deleteError } = await supabase.from('registry_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (deleteError) {
                console.error('Error deleting existing items:', deleteError);
                alert('Failed to clear existing items: ' + deleteError.message);
                return;
            }
            const { data: insertedData, error: insertError } = await supabase
                .from('registry_items')
                .insert(
                    jsonData.map(row => ({
                        item_name: row['Item'] || row['Item Naam'] || row['Item Name'] || row.item_name || '',
                        example_urls: (row["Slegs 'n voorbeeld"] || row['Skakel na Voorbeeld'] || row['Link to Example'] || row.URL || row.example_url) ? 
                            [row["Slegs 'n voorbeeld"] || row['Skakel na Voorbeeld'] || row['Link to Example'] || row.URL || row.example_url] : null,
                        purchased_by: null
                    }))
                );
            if (insertError) {
                console.error('Error uploading to Supabase:', insertError);
                alert('Failed to upload items: ' + insertError.message);
            } else {
                console.log('Uploaded items:', insertedData);
                alert('Items uploaded successfully!');
                displayManageItems();
            }
        } catch (error) {
            console.error('Error parsing Excel:', error);
            alert('Failed to parse Excel file. Ensure it’s a valid .xlsx or .xls file.');
        } finally {
            uploadButton.classList.remove('uploading');
        }
    };
    if (file) {
        reader.readAsArrayBuffer(file);
    }
}

async function displayManageItems() {
    try {
        const { data: registryItems, error } = await supabase.from('registry_items').select('*').order('item_name', { ascending: true });
        if (error) throw error;
        console.log('Fetched items:', registryItems);
        const list = document.getElementById('manage-list');
        if (!list) {
            console.error('Manage list element not found');
            alert('Error: Table not found. Check HTML structure.');
            return;
        }
        list.innerHTML = '';
        registryItems.forEach((item, index) => {
            console.log('Rendering item:', item.id, item.item_name, item.example_urls);
            const tr = document.createElement('tr');
            const isEditing = editingItems.includes(item.id);
            tr.className = isEditing ? 'edit-mode' : '';
            const linkInputs = isEditing && item.example_urls ? item.example_urls.map(url => `<input type="url" value="${url}" style="display:block;">`).join('') : (isEditing ? '<input type="url" style="display:block;">' : '');
            const linkDisplay = !isEditing && item.example_urls && item.example_urls.length > 0 ? 
                item.example_urls.map((url, i) => `<a href="${url}" target="_blank">See example ${i + 1}</a>`).join('<br>') : 
                (!isEditing ? '' : '');
            tr.innerHTML = `
                <td data-id="${item.id}">${index + 1}</td>
                <td ${isEditing ? 'contenteditable' : ''}>${item.item_name}</td>
                <td ${isEditing ? '' : 'class="link-cell"'}>
                    ${isEditing ? 
                        linkInputs + `<button onclick="addLinkInputInCell(event, '${item.id}')" style="margin-top:5px;">Add Link</button>`
                        : 
                        linkDisplay
                    }
                </td>
                <td>${item.purchased_by ? 'Yes' : ''}</td>
                <td>
                    ${isEditing ? `
                        <button onclick="saveEdit('${item.id}')">Save</button>
                        <button onclick="deleteItem('${item.id}')">Delete</button>
                    ` : `<button onclick="toggleEdit('${item.id}')">Action</button>`}
                </td>
            `;
            list.appendChild(tr);
        });
    } catch (error) {
        console.error('Error in displayManageItems:', error);
        alert('Failed to load items: ' + error.message);
    }
}

async function toggleEdit(id) {
    console.log('toggleEdit called with id:', id);

    const row = document.querySelector(`#manage-list td[data-id="${id}"]`);
    if (!row) {
        console.error('No row found for id:', id);
        alert('Error: Item not found. Please refresh and try again.');
        return;
    }

    const parentRow = row.parentElement;
    const nameCell = parentRow.cells[1];
    const linkCell = parentRow.cells[2];
    const actionCell = parentRow.cells[4];

    if (nameCell.getAttribute('contenteditable') === 'true') {
        saveEdit(id);
    } else {
        // Fetch the item from Supabase to get all links
        const { data: itemData, error } = await supabase
            .from('registry_items')
            .select('item_name, example_urls')
            .eq('id', id)
            .single();

        if (error || !itemData) {
            console.error('Error fetching item for editing:', error);
            alert('Failed to load item details for editing.');
            return;
        }

        nameCell.setAttribute('contenteditable', 'true');

        // Render all existing links into input fields
        linkCell.innerHTML = '';
        const urls = itemData.example_urls || [];
        urls.forEach(url => {
            const input = document.createElement('input');
            input.type = 'url';
            input.value = url;
            input.style.display = 'block';
            linkCell.appendChild(input);
        });

        // Add "Add Link" button
        const addBtn = document.createElement('button');
        addBtn.textContent = 'Add Link';
        addBtn.style.marginTop = '5px';
        addBtn.onclick = (event) => addLinkInputInCell(event, id);
        linkCell.appendChild(addBtn);

        // Change Action buttons
        actionCell.innerHTML = `
            <button onclick="saveEdit('${id}')">Save</button>
            <button onclick="deleteItem('${id}')">Delete</button>
        `;

        parentRow.classList.add('edit-mode');
        editingItems.push(id);
    }
}


function saveEdit(id) {
    const row = document.querySelector(`#manage-list td[data-id="${id}"]`).parentElement;
    const nameCell = row.cells[1];
    const linkCell = row.cells[2];
    const newName = nameCell.textContent.trim();
    const linkInputs = linkCell.querySelectorAll('input[type="url"]');
    const newLinks = Array.from(linkInputs).map(input => input.value.trim()).filter(link => link);
    console.log('Saving links:', newLinks);
    const newExampleUrls = newLinks.length > 0 ? newLinks : null;
    supabase.from('registry_items').update({ item_name: newName, example_urls: newExampleUrls }).eq('id', id).then(({ error }) => {
        if (error) {
            console.error('Error saving edit:', error);
            alert('Failed to save changes: ' + error.message);
        } else {
            console.log('Saved item:', { id, item_name: newName, example_urls: newExampleUrls });
            editingItems = editingItems.filter(itemId => itemId !== id);
            displayManageItems();
        }
    });
}

function deleteItem(id) {
    if (confirm('Are you sure you want to delete this item?')) {
        supabase.from('registry_items').delete().eq('id', id).then(({ error }) => {
            if (error) {
                console.error('Error deleting item:', error);
                alert('Failed to delete item: ' + error.message);
            } else {
                displayManageItems();
                alert('Item deleted!');
            }
        });
    }
}

function deleteAllItems() {
    if (confirm('Are you sure you want to delete all items? This action cannot be undone.')) {
        supabase.from('registry_items').delete().neq('id', '00000000-0000-0000-0000-000000000000').then(({ error }) => {
            if (error) {
                console.error('Error deleting all items:', error);
                alert('Failed to delete all items: ' + error.message);
            } else {
                displayManageItems();
                alert('All items deleted!');
            }
        });
    }
}

async function resetAllChoices() {
  if (!confirm('Are you sure you want to clear all selections?')) return;
  try {
    const { error } = await supabase
      .from('registry_items')
      .update({ purchased_by: null })
      .not('purchased_by', 'is', null);  
      // ← Only rows where purchased_by IS NOT NULL

    if (error) throw error;
    await displayManageItems();
  } catch (error) {
    console.error('Error resetting choices:', error);
    alert('Failed to reset choices: ' + error.message);
  }
}



function addLinkInputInCell(event, id) {
    event.preventDefault();
    const row = document.querySelector(`#manage-list td[data-id="${id}"]`).parentElement;
    const linkCell = row.cells[2];
    const inputs = linkCell.querySelectorAll('input[type="url"]');
    if (inputs.length < 3) {
        const newInput = document.createElement('input');
        newInput.type = 'url';
        newInput.placeholder = 'Enter link to example';
        newInput.style.display = 'block';
        linkCell.insertBefore(newInput, linkCell.querySelector('button'));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    displayManageItems();
});

export { unlockAdmin, handleFileUpload, displayManageItems, toggleEdit, saveEdit, deleteItem, addLinkInputInCell, addItem, addLinkInput, deleteAllItems, resetAllChoices };

window.unlockAdmin = unlockAdmin;
window.handleFileUpload = handleFileUpload;
window.addItem = addItem;
window.addLinkInput = addLinkInput;
window.deleteAllItems = deleteAllItems;
window.resetAllChoices = resetAllChoices;
window.toggleEdit = toggleEdit; // Added
window.saveEdit = saveEdit;
window.deleteItem = deleteItem; // Added
window.addLinkInputInCell = addLinkInputInCell;