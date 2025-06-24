let registryItems = JSON.parse(localStorage.getItem('registryItems')) || [];
let editingItems = [];
const ADMIN_PASSWORD = 'Admin123'; // Change this to your desired password

function unlockAdmin() {
    const password = document.getElementById('admin-password').value;
    if (password === 'Admin123') { // Replace with your actual password
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
        const item = {
            id: Date.now(),
            name: itemName,
            links: links,
            purchased: false
        };
        registryItems.push(item);
        localStorage.setItem('registryItems', JSON.stringify(registryItems));
        document.getElementById('item-name').value = '';
        document.querySelector('#link-inputs').innerHTML = '<input type="url" id="item-link-0" placeholder="Enter link to example">';
        alert('Item added successfully!');
        displayManageItems(); // Refresh manage table
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

function uploadExcel() {
    const fileInput = document.getElementById('excel-upload');
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select an Excel file.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        // Clear existing items
        registryItems = [];
        // Process new data
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const itemName = row[0]?.toString().trim();
            const itemLink = row[1]?.toString().trim();
            const purchased = row[2] ? row[2].toString().trim().toLowerCase() === 'true' || row[2].toString().trim() !== '' : false;

            if (itemName && itemLink) {
                const item = {
                    id: Date.now() + i,
                    name: itemName,
                    links: [itemLink], // Store as array for consistency
                    purchased: purchased
                };
                registryItems.push(item);
            }
        }

        localStorage.setItem('registryItems', JSON.stringify(registryItems));
        fileInput.value = ''; // Clear file input
        alert('Items uploaded successfully! Go to the home page to view.');
        displayManageItems(); // Refresh manage table
    };
    reader.readAsArrayBuffer(file);
}

function displayManageItems() {
    const list = document.getElementById('manage-list');
    list.innerHTML = '';
    registryItems = JSON.parse(localStorage.getItem('registryItems')) || [];
    if (registryItems.length === 0) {
        console.log('No items found in registryItems');
    } else {
        console.log('Displaying', registryItems.length, 'items');
    }
    registryItems.forEach((item, index) => {
        const tr = document.createElement('tr');
        const isEditing = editingItems.includes(item.id);
        tr.className = isEditing ? 'edit-mode' : '';
        const links = Array.isArray(item.links) ? item.links : (item.link ? [item.link] : []);
        tr.innerHTML = `
            <td data-id="${item.id}">${index + 1}</td>
            <td ${isEditing ? 'contenteditable' : ''}>${item.name}</td>
            <td ${isEditing ? '' : 'class="link-cell"'}>${isEditing ? (item.links || []).map((link, i) => `<input type="url" value="${link}" style="display:block;">`).join('') + '<button onclick="addLinkInputInCell(event, ' + item.id + ')" style="margin-top:5px;">Add Link</button>' : (item.links || []).map((link, i) => `<a href="${link}" target="_blank">${item.links.length > 1 ? `See example ${i + 1}` : 'See example'}</a>`).join('<br>')}</td>
            <td>${item.purchased ? '✔' : ''}</td>
            <td>
                ${isEditing ? `
                    <button onclick="toggleEdit(${item.id})">Save</button>
                    <button onclick="deleteItem(${item.id})">Delete</button>
                ` : `<button onclick="toggleEdit(${item.id})">Action</button>`}
            </td>
        `;
        list.appendChild(tr);
    });
}

function toggleEdit(id) {
    const row = document.querySelector(`#manage-list tr td[data-id="${id}"]`).parentElement;
    const nameCell = row.cells[1];
    const linkCell = row.cells[2];
    const actionCell = row.cells[3];

    const item = registryItems.find(item => item.id === id);
    if (!item) {
        console.log('Item not found for id:', id);
        return;
    }

    if (nameCell.getAttribute('contenteditable') === 'true') {
        const newName = nameCell.textContent.trim();
        const linkInputs = linkCell.querySelectorAll('input[type="url"]');
        const newLinks = Array.from(linkInputs).map(input => input.value.trim()).filter(link => link);
        item.name = newName;
        item.links = newLinks.length > 0 ? newLinks : item.links;
        localStorage.setItem('registryItems', JSON.stringify(registryItems));
        alert('Changes saved!');
        nameCell.setAttribute('contenteditable', 'false');
        linkCell.innerHTML = item.links.map((link, i) => `<a href="${link}" target="_blank">${item.links.length > 1 ? `See example ${i + 1}` : 'See example'}</a>`).join('<br>');
        actionCell.innerHTML = '<button onclick="toggleEdit(' + id + ')">Action</button>';
        row.classList.remove('edit-mode');
        const index = editingItems.indexOf(id);
        if (index > -1) editingItems.splice(index, 1);
    } else {
        nameCell.setAttribute('contenteditable', 'true');
        linkCell.innerHTML = (item.links || []).map((link, i) => `<input type="url" value="${link}" style="display:block;">`).join('') +
            '<button onclick="addLinkInputInCell(event, ' + id + ')" style="margin-top:5px;">Add Link</button>';
        actionCell.innerHTML = `
            <button onclick="toggleEdit(${id})">Save</button>
            <button onclick="deleteItem(${id})">Delete</button>
        `;
        row.classList.add('edit-mode');
        editingItems.push(id);
    }
}

function deleteItem(id) {
    if (confirm('Are you sure you want to delete this item?')) {
        registryItems = registryItems.filter(item => item.id !== id);
        localStorage.setItem('registryItems', JSON.stringify(registryItems));
        displayManageItems();
        alert('Item deleted!');
    }
}

function deleteAllItems() {
    if (confirm('Are you sure you want to delete all items? This action cannot be undone.')) {
        registryItems = [];
        localStorage.setItem('registryItems', JSON.stringify(registryItems));
        displayManageItems();
        alert('All items deleted!');
    }
}

function resetAllChoices() {
    if (confirm('Are you sure you want to reset all choices? This will make all items available for selection again. This action cannot be undone.')) {
        registryItems.forEach(item => {
            item.purchased = false;
            item.purchasedByEmail = null;
        });
        localStorage.setItem('registryItems', JSON.stringify(registryItems));
        displayManageItems();
        alert('All choices have been reset! All items are now available for selection.');
    }
}

function addLinkInputInCell(event, id) {
    event.preventDefault();
    const row = document.querySelector(`#manage-list tr td[data-id="${id}"]`).parentElement;
    const linkCell = row.cells[2];
    const inputs = linkCell.querySelectorAll('input[type="url"]');
    const newIndex = inputs.length;
    const newInput = document.createElement('input');
    newInput.type = 'url';
    newInput.placeholder = 'Enter link to example';
    newInput.style.display = 'block';
    linkCell.insertBefore(newInput, linkCell.querySelector('button'));
}

document.addEventListener('DOMContentLoaded', () => {
    displayManageItems();
});