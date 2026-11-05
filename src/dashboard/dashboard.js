import { StorageService } from '../storage/storage.js';

let bookmarks = [];
let categories = [];
let activeView = 'all';
let editingId = null;

const $ = selector => document.querySelector(selector);
const list = $('#bookmark-list');

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function refresh() {
  [bookmarks, categories] = await Promise.all([StorageService.getBookmarks(), StorageService.getCategories()]);
  renderCategoryOptions();
  renderBookmarks();
}

function renderCategoryOptions() {
  const filter = $('#category-filter');
  const selected = filter.value;
  filter.replaceChildren(new Option('All categories', ''));
  categories.forEach(category => filter.add(new Option(category, category)));
  filter.value = categories.includes(selected) ? selected : '';
}

function renderBookmarks() {
  list.replaceChildren();
  const query = $('#search-input').value.trim().toLowerCase();
  const category = $('#category-filter').value;
  const filtered = bookmarks.filter(item => {
    if (activeView === 'favorites' && !item.favorite) return false;
    if (['unread', 'reading', 'finished'].includes(activeView) && item.status !== activeView) return false;
    if (category && item.category !== category) return false;
    const searchable = [item.title, item.url, item.domain, item.category, item.notes, ...(item.tags || [])].join(' ').toLowerCase();
    return searchable.includes(query);
  });

  if (!filtered.length) {
    list.append(make('p', 'muted', 'No bookmarks found. Save a page or adjust your filters.'));
    return;
  }

  for (const item of filtered) {
    const card = make('article', 'card');
    const heading = make('h3');
    const link = make('a', '', item.title || 'Untitled');
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    heading.append(link);
    card.append(heading);
    card.append(make('div', 'card-meta', `${item.domain || ''} · ${item.category || 'General'} · ${item.status || 'unread'}`));

    const tags = make('div', 'tags');
    (item.tags || []).forEach(tag => tags.append(make('span', 'tag', tag)));
    if (tags.childElementCount) card.append(tags);
    if (item.notes) card.append(make('p', 'notes', item.notes));

    const actions = make('div', 'card-actions');
    const favorite = make('button', 'secondary', item.favorite ? '★ Favorite' : '☆ Favorite');
    favorite.addEventListener('click', async () => {
      await StorageService.saveBookmark({ ...item, favorite: !item.favorite });
      await refresh();
    });
    const edit = make('button', 'secondary', 'Edit');
    edit.addEventListener('click', () => openEditor(item));
    const remove = make('button', 'secondary', 'Delete');
    remove.addEventListener('click', async () => {
      if (confirm(`Delete "${item.title}"?`)) {
        await StorageService.deleteBookmark(item.id);
        await refresh();
      }
    });
    actions.append(favorite, edit, remove);
    card.append(actions);
    list.append(card);
  }
}

function openEditor(item) {
  editingId = item.id;
  $('#edit-title').value = item.title || '';
  $('#edit-tags').value = (item.tags || []).join(', ');
  $('#edit-notes').value = item.notes || '';
  $('#edit-status').value = item.status || 'unread';
  $('#edit-favorite').checked = Boolean(item.favorite);
  const select = $('#edit-category');
  select.replaceChildren(...categories.map(category => new Option(category, category)));
  if (item.category && !categories.includes(item.category)) select.add(new Option(item.category, item.category));
  select.value = item.category || 'General';
  $('#edit-error').textContent = '';
  $('#edit-dialog').showModal();
}

$('#edit-form').addEventListener('submit', async event => {
  if (event.submitter?.value !== 'save') return;
  event.preventDefault();
  const item = bookmarks.find(bookmark => bookmark.id === editingId);
  if (!item) return;
  try {
    await StorageService.saveBookmark({
      ...item,
      title: $('#edit-title').value,
      category: $('#edit-category').value,
      tags: $('#edit-tags').value.split(',').map(tag => tag.trim()).filter(Boolean),
      notes: $('#edit-notes').value,
      status: $('#edit-status').value,
      favorite: $('#edit-favorite').checked
    });
    $('#edit-dialog').close();
    await refresh();
  } catch (error) {
    $('#edit-error').textContent = error.message;
  }
});

$('#navigation').addEventListener('click', event => {
  const button = event.target.closest('[data-view]');
  if (!button) return;
  document.querySelectorAll('.nav-item').forEach(node => node.classList.toggle('active', node === button));
  activeView = button.dataset.view;
  const settings = activeView === 'settings';
  list.classList.toggle('hidden', settings);
  $('.topbar').classList.toggle('hidden', settings);
  $('#settings-view').classList.toggle('hidden', !settings);
  if (!settings) renderBookmarks();
});
$('#search-input').addEventListener('input', renderBookmarks);
$('#category-filter').addEventListener('change', renderBookmarks);

$('#add-category').addEventListener('click', async () => {
  const name = prompt('Enter a category name:');
  if (!name?.trim()) return;
  const next = [...categories, name.trim()];
  try {
    await StorageService.saveCategories(next);
    await refresh();
  } catch (error) { alert(error.message); }
});

$('#export-json').addEventListener('click', async () => {
  const data = await StorageService.exportData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `focus-and-save-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
});

const fileInput = $('#import-file');
$('#import-json').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error('File is larger than 10 MB.');
    const payload = JSON.parse(await file.text());
    const result = await StorageService.importData(payload);
    $('#import-status').textContent = `Import complete: ${result.addedCount} new bookmarks; ${result.totalCount} total.`;
    await refresh();
  } catch (error) {
    $('#import-status').textContent = `Import failed: ${error.message}`;
  } finally {
    fileInput.value = '';
  }
});

refresh().catch(error => {
  list.replaceChildren(make('p', 'muted', `Could not load bookmarks: ${error.message}`));
});