// FSRS Memory Web UI v2 - Application Logic with Tailwind CSS

const API_BASE = window.location.origin;

// State
let currentView = 'study';
let currentDeckId = null;
let dueCards = [];
let allCards = [];
let allDecks = [];
let currentCardIndex = 0;
let currentCard = null;
let isAnswerShown = false;
let currentTheme = 'light';

// ==================== Initialization ====================

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavigation();
  initKeyboardShortcuts();
  loadDecks();
  loadStats();
  loadDueCards();
});

// ==================== Theme ====================

async function initTheme() {
  try {
    const response = await fetch(`${API_BASE}/api/settings/theme`);
    const result = await response.json();
    if (result.success) {
      currentTheme = result.data || 'light';
      applyTheme(currentTheme);
    }
  } catch (error) {
    console.error('Failed to load theme:', error);
  }
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  const icon = document.getElementById('theme-icon');
  const text = document.getElementById('theme-text');
  if (theme === 'dark') {
    icon.className = 'ph ph-sun text-lg';
    text.textContent = '亮色模式';
  } else {
    icon.className = 'ph ph-moon text-lg';
    text.textContent = '暗色模式';
  }
  currentTheme = theme;
}

async function toggleTheme() {
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  try {
    await fetch(`${API_BASE}/api/settings/theme`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: newTheme })
    });
    applyTheme(newTheme);
    showToast(`已切换到${newTheme === 'dark' ? '暗色' : '亮色'}主题`, 'success');
  } catch (error) {
    console.error('Failed to save theme:', error);
    showToast('主题切换失败', 'error');
  }
}

// ==================== Mobile Menu ====================

function toggleMobileMenu() {
  document.querySelector('.sidebar').classList.toggle('open');
}

// ==================== Navigation ====================

function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      showView(view);
      // Close mobile menu on selection
      document.querySelector('.sidebar').classList.remove('open');
    });
  });
}

function showView(view) {
  // Update nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === view);
  });
  
  // Update view
  document.querySelectorAll('.view').forEach(v => {
    v.style.display = v.id === `${view}-view` ? 'block' : 'none';
  });
  
  currentView = view;
  
  // Update page title
  const titles = {
    templates: ['卡片模板', '管理和自定义卡片显示样式'],
    media: ['媒体文件', '管理卡片中的图片和音频'],
    export: ['导出卡片', '导出为 APKG、CSV 或 JSON 格式'],
    study: ['今日学习', '开始你的复习之旅'],
    cards: ['所有卡片', '管理和搜索你的卡片'],
    decks: ['牌组管理', '创建和组织牌组'],
    add: ['添加卡片', '创建新的记忆卡片'],
    import: ['导入卡包', '从 Anki 导入卡包'],
    stats: ['学习统计', '查看你的学习进度'],
    settings: ['设置', '管理学习限制、牌组配置和模板'],
    templates: ['卡片模板', '管理和自定义卡片显示样式'],
    media: ['媒体文件', '管理卡片中的图片和音频']
  };
  const [title, subtitle] = titles[view] || ['FSRS Memory', ''];
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-subtitle').textContent = subtitle;
  
  // Load data for specific views
  if (view === 'study') {
    loadDueCards();
  } else if (view === 'cards') {
    loadAllCards();
  } else if (view === 'decks') {
    loadDecksGrid();
  } else if (view === 'stats') {
    loadStats();
  }
}

// ==================== Deck Management ====================

async function loadDecks() {
  try {
    const response = await fetch(`${API_BASE}/api/decks`);
    const result = await response.json();
    
    if (result.success) {
      allDecks = result.data;
      updateDeckSelectors();
    }
  } catch (error) {
    console.error('Failed to load decks:', error);
  }
}

function updateDeckSelectors() {
  const selects = ['deck-select', 'deck-select-add', 'import-deck-select'];
  selects.forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    
    const isImport = id === 'import-deck-select';
    const options = allDecks.map(deck => 
      `<option value="${deck.id}">${deck.name} (${deck.due_count || 0}${isImport ? '' : ' 待复习'})</option>`
    ).join('');
    
    select.innerHTML = isImport ? '<option value="1">默认牌组</option>' + options : '<option value="">全部牌组</option>' + options;
  });
  
  if (allDecks.length > 0 && !currentDeckId) {
    const addSelect = document.getElementById('deck-select-add');
    if (addSelect) addSelect.value = allDecks[0].id;
  }
}

async function changeDeck(deckId) {
  currentDeckId = deckId ? parseInt(deckId) : null;
  
  if (currentView === 'study') {
    loadDueCards();
  } else if (currentView === 'cards') {
    loadAllCards();
  } else if (currentView === 'stats') {
    loadStats();
  }
}

async function loadDecksGrid() {
  try {
    const response = await fetch(`${API_BASE}/api/decks`);
    const result = await response.json();
    
    if (result.success) {
      renderDecksGrid(result.data);
    }
  } catch (error) {
    console.error('Failed to load decks:', error);
    showToast('加载失败', 'error');
  }
}

function renderDecksGrid(decks) {
  const container = document.getElementById('decks-grid');
  
  container.innerHTML = decks.map(deck => `
    <div class="deck-card bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
      <div class="deck-card-header flex justify-between items-start mb-4">
        <div class="deck-card-name text-xl font-semibold">${escapeHtml(deck.name)}</div>
        ${deck.id === 1 ? '<span class="text-xs bg-primary-600 text-white px-2 py-1 rounded">默认</span>' : ''}
      </div>
      <div class="deck-card-desc text-gray-600 dark:text-gray-400 text-sm mb-4">${escapeHtml(deck.description || '暂无描述')}</div>
      <div class="deck-card-stats flex gap-6 mb-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-primary-600">${deck.card_count || 0}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">卡片数</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-orange-600">${deck.due_count || 0}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">待复习</div>
        </div>
      </div>
      <div class="deck-card-actions flex gap-2">
        <button class="px-3 py-1.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm" onclick="showEditDeckModal(${deck.id})">编辑</button>
        ${deck.id !== 1 ? `<button class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm" onclick="confirmDeleteDeck(${deck.id})">删除</button>` : ''}
        <button class="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm" onclick="selectDeckAndStudy(${deck.id})">学习</button>
      </div>
    </div>
  `).join('');
}

function showCreateDeckModal() {
  document.getElementById('deck-modal-title').textContent = '新建牌组';
  document.getElementById('deck-name-input').value = '';
  document.getElementById('deck-desc-input').value = '';
  document.getElementById('save-deck-btn').onclick = createDeck;
  document.getElementById('deck-modal').style.display = 'flex';
}

function showEditDeckModal(deckId) {
  const deck = allDecks.find(d => d.id === deckId);
  if (!deck) return;
  
  document.getElementById('deck-modal-title').textContent = '编辑牌组';
  document.getElementById('deck-name-input').value = deck.name;
  document.getElementById('deck-desc-input').value = deck.description || '';
  document.getElementById('save-deck-btn').onclick = () => updateDeck(deckId);
  document.getElementById('deck-modal').style.display = 'flex';
}

function closeDeckModal() {
  document.getElementById('deck-modal').style.display = 'none';
}

async function createDeck() {
  const name = document.getElementById('deck-name-input').value.trim();
  const description = document.getElementById('deck-desc-input').value.trim();
  
  if (!name) {
    showToast('请输入牌组名称', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/decks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showToast('牌组创建成功', 'success');
      closeDeckModal();
      loadDecks();
      loadDecksGrid();
    } else {
      showToast(result.error || '创建失败', 'error');
    }
  } catch (error) {
    console.error('Failed to create deck:', error);
    showToast('创建失败', 'error');
  }
}

async function updateDeck(deckId) {
  const name = document.getElementById('deck-name-input').value.trim();
  const description = document.getElementById('deck-desc-input').value.trim();
  
  if (!name) {
    showToast('请输入牌组名称', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/decks/${deckId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showToast('牌组更新成功', 'success');
      closeDeckModal();
      loadDecks();
      loadDecksGrid();
    } else {
      showToast(result.error || '更新失败', 'error');
    }
  } catch (error) {
    console.error('Failed to update deck:', error);
    showToast('更新失败', 'error');
  }
}

function confirmDeleteDeck(deckId) {
  if (confirm('确定要删除这个牌组吗？该牌组中的卡片将移动到默认牌组。')) {
    deleteDeck(deckId);
  }
}

async function deleteDeck(deckId) {
  try {
    const response = await fetch(`${API_BASE}/api/decks/${deckId}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (result.success) {
      showToast('牌组已删除', 'success');
      loadDecks();
      loadDecksGrid();
      loadStats();
    } else {
      showToast(result.error || '删除失败', 'error');
    }
  } catch (error) {
    console.error('Failed to delete deck:', error);
    showToast('删除失败', 'error');
  }
}

function selectDeckAndStudy(deckId) {
  document.getElementById('deck-select').value = deckId;
  changeDeck(deckId);
  showView('study');
}

// ==================== Keyboard Shortcuts ====================

function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }
    
    if (currentView === 'study' && dueCards.length > 0) {
      if (!isAnswerShown) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          showAnswer();
        }
      } else {
        if (e.key >= '1' && e.key <= '5') {
          e.preventDefault();
          rateCard(parseInt(e.key));
        }
      }
    }
    
    if (e.altKey) {
      const viewMap = { '1': 'study', '2': 'cards', '3': 'decks', '4': 'add', '5': 'stats' };
      if (viewMap[e.key]) {
        e.preventDefault();
        showView(viewMap[e.key]);
      }
    }
  });
}

// ==================== Study View ====================

async function loadDueCards() {
  try {
    let url = `${API_BASE}/api/cards/due`;
    if (currentDeckId) {
      url += `?deck=${currentDeckId}`;
    }
    
    const response = await fetch(url);
    const result = await response.json();
    
    if (!result.success) {
      console.error('API error:', result.error);
      showToast(result.error || '加载失败', 'error');
      return;
    }
    
    dueCards = result.data;
    currentCardIndex = 0;
    isAnswerShown = false;
    updateStudyProgress();
    
    if (dueCards.length > 0) {
      showCard();
    } else {
      showEmptyState();
    }
  } catch (error) {
    console.error('Failed to load due cards:', error);
    showToast('加载失败', 'error');
  }
}

function updateStudyProgress() {
  const total = dueCards.length;
  const current = currentCardIndex;
  
  // Update text progress
  document.getElementById('study-progress').textContent = `${current} / ${total}`;
  document.getElementById('due-badge').textContent = total;
  
  // Update progress bar
  const percentage = total > 0 ? (current / total) * 100 : 0;
  const progressBar = document.getElementById('study-progress-bar');
  if (progressBar) {
    progressBar.style.width = percentage + '%';
  }
}

function showCard() {
  isAnswerShown = false;
  
  const cardArea = document.getElementById('card-flip-area');
  if (cardArea) {
    cardArea.classList.remove('card-flipped');
  }
  
  const emptyState = document.getElementById('no-cards-message');
  const ratingButtons = document.getElementById('rating-buttons');
  
  emptyState.style.display = 'none';
  cardArea.style.display = 'block';
  ratingButtons.style.display = 'none';
  
  currentCard = dueCards[currentCardIndex];
  
  document.getElementById('question-text').textContent = currentCard.question;
  document.getElementById('answer-text').textContent = currentCard.answer;
  
  updateIntervalPreview();
}


// Toggle card flip animation
function toggleCardFlip() {
  const cardArea = document.getElementById('card-flip-area');
  if (!cardArea) return;
  
  if (!isAnswerShown) {
    // Flip to show answer
    showAnswer();
  }
  // Once answer is shown, don't flip back - user should rate the card
}

async function showAnswer() {
  isAnswerShown = true;
  
  // Flip the card to show the answer
  const cardArea = document.getElementById('card-flip-area');
  if (cardArea) {
    cardArea.classList.add('card-flipped');
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/review/${currentCard.id}/preview`);
    const result = await response.json();
    
    if (result.success) {
      const previews = result.data;
      document.getElementById('interval-1').textContent = previews[1] || '1m';
      document.getElementById('interval-2').textContent = previews[2] || '10m';
      document.getElementById('interval-3').textContent = previews[3] || '1d';
      document.getElementById('interval-4').textContent = previews[4] || '4d';
      document.getElementById('interval-5').textContent = previews[5] || '10d';
    }
  } catch (error) {
    console.error('Failed to load preview:', error);
    const intervals = calculateIntervals(currentCard);
    document.getElementById('interval-1').textContent = intervals[0];
    document.getElementById('interval-2').textContent = intervals[1];
    document.getElementById('interval-3').textContent = intervals[2];
    document.getElementById('interval-4').textContent = intervals[3];
    document.getElementById('interval-5').textContent = intervals[4];
  }
  
  document.getElementById('rating-buttons').style.display = 'grid';
}

function updateIntervalPreview() {
  const intervals = calculateIntervals(currentCard);
  document.getElementById('interval-1').textContent = intervals[0];
  document.getElementById('interval-2').textContent = intervals[1];
  document.getElementById('interval-3').textContent = intervals[2];
  document.getElementById('interval-4').textContent = intervals[3];
  document.getElementById('interval-5').textContent = intervals[4];
}

function calculateIntervals(card) {
  let { interval, ease_factor, repetitions } = card;
  ease_factor = ease_factor || 2.5;
  interval = interval || 0;
  
  return [
    '1m',
    Math.max(1, Math.round(interval * 1.2)) + 'm',
    repetitions === 0 ? '1d' : (repetitions === 1 ? '6d' : Math.round(interval * ease_factor) + 'd'),
    repetitions === 0 ? '4d' : Math.round(interval * ease_factor * 1.3) + 'd',
    repetitions === 0 ? '10d' : Math.round(interval * ease_factor * 1.5) + 'd'
  ];
}

async function rateCard(rating) {
  try {
    const response = await fetch(`${API_BASE}/api/review/${currentCard.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating })
    });
    
    const result = await response.json();
    
    if (result.success) {
      currentCardIndex++;
      updateStudyProgress();
      
      if (currentCardIndex < dueCards.length) {
        showCard();
      } else {
        showCompleteState();
      }
      
      loadStats();
      loadDecks();
      
      showToast(`已评分 - 下次复习：${result.nextInterval}`, 'success');
    }
  } catch (error) {
    console.error('Failed to rate card:', error);
    showToast('评分失败', 'error');
  }
}

function showEmptyState() {
  document.getElementById('card-flip-area').style.display = 'none';
  document.getElementById('rating-buttons').style.display = 'none';
  const emptyState = document.getElementById('no-cards-message');
  emptyState.style.display = 'block';
  emptyState.innerHTML = `
    <i class="ph ph-check-circle text-6xl text-green-500 mb-4"></i>
    <h3 class="text-2xl font-bold mb-2">太棒了！</h3>
    <p class="text-gray-500 dark:text-gray-400 mb-6">${currentDeckId ? '这个牌组' : '今天'}没有需要复习的卡片了</p>
    <button class="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors" onclick="showView('add')">添加新卡片</button>
  `;
}

function showCompleteState() {
  document.getElementById('card-flip-area').style.display = 'none';
  document.getElementById('rating-buttons').style.display = 'none';
  const emptyState = document.getElementById('no-cards-message');
  emptyState.style.display = 'block';
  emptyState.innerHTML = `
    <i class="ph ph-trophy text-6xl text-yellow-500 mb-4"></i>
    <h3 class="text-2xl font-bold mb-2">完成！</h3>
    <p class="text-gray-500 dark:text-gray-400 mb-6">恭喜完成今日复习</p>
    <button class="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors" onclick="showView('stats')">查看统计</button>
  `;
}

// ==================== Cards List ====================

async function loadAllCards() {
  try {
    let url = `${API_BASE}/api/cards`;
    if (currentDeckId) {
      url += `?deck=${currentDeckId}`;
    }
    
    const response = await fetch(url);
    const result = await response.json();
    
    if (result.success) {
      allCards = result.data;
      renderCardsList();
    }
  } catch (error) {
    console.error('Failed to load cards:', error);
    showToast('加载失败', 'error');
  }
}

function renderCardsList() {
  const container = document.getElementById('cards-list');
  const searchTerm = document.getElementById('card-search').value.toLowerCase();
  
  const filteredCards = allCards.filter(card => 
    card.question.toLowerCase().includes(searchTerm) ||
    card.answer.toLowerCase().includes(searchTerm)
  );
  
  if (filteredCards.length === 0) {
    container.innerHTML = `
      <div class="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <i class="ph ph-inbox text-6xl text-gray-400 mb-4"></i>
        <h2 class="text-2xl font-bold mb-2">没有找到卡片</h2>
        <p class="text-gray-500 dark:text-gray-400">${searchTerm ? '尝试其他搜索词' : '添加你的第一张卡片吧'}</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = filteredCards.map(card => {
    const deck = allDecks.find(d => d.id === card.deck_id);
    return `
      <div class="card-item bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow flex justify-between items-start">
        <div class="card-item-content flex-1 min-w-0">
          <div class="card-item-header flex items-center gap-3 mb-2">
            <span class="text-sm text-gray-500 dark:text-gray-400">#${card.id}</span>
            <span class="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">${deck ? deck.name : '默认'}</span>
            <span class="text-xs uppercase font-semibold px-2 py-1 rounded ${card.state === 'new' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : card.state === 'learning' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'}">${card.state}</span>
          </div>
          <div class="card-item-question font-medium mb-1 truncate">${escapeHtml(card.question)}</div>
          <div class="card-item-answer text-sm text-gray-600 dark:text-gray-400 truncate">${escapeHtml(card.answer)}</div>
          <div class="card-item-meta flex gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
            <span>间隔：${card.interval || 0}天</span>
            <span>复习：${card.repetitions || 0}次</span>
            <span>难度：${(card.ease_factor || 2.5).toFixed(2)}</span>
          </div>
        </div>
        <div class="card-item-actions flex gap-2">
          <button class="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" onclick="editCard(${card.id})" title="编辑">
            <i class="ph ph-pencil-simple"></i>
          </button>
          <button class="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-red-600 hover:border-red-600 hover:text-white transition-colors" onclick="confirmDelete(${card.id})" title="删除">
            <i class="ph ph-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function filterCards() {
  renderCardsList();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== Add Card ====================

async function addCard() {
  const question = document.getElementById('question-input').value.trim();
  const answer = document.getElementById('answer-input').value.trim();
  const deckId = document.getElementById('deck-select-add').value;
  
  if (!question || !answer) {
    showToast('请填写问题和答案', 'error');
    return;
  }
  
  if (question.length > 1000 || answer.length > 5000) {
    showToast('输入内容过长', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer, deck_id: deckId || 1 })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showToast('卡片添加成功', 'success');
      document.getElementById('question-input').value = '';
      document.getElementById('answer-input').value = '';
      loadStats();
      loadDecks();
      if (currentView === 'study') {
        loadDueCards();
      }
    }
  } catch (error) {
    console.error('Failed to add card:', error);
    showToast('添加失败', 'error');
  }
}

async function quickAdd() {
  const input = document.getElementById('quick-add-input').value.trim();
  const deckId = document.getElementById('deck-select-add').value;
  
  if (!input) {
    showToast('请输入卡片内容', 'error');
    return;
  }
  
  const lines = input.split('\n').filter(line => line.includes('::'));
  if (lines.length === 0) {
    showToast('格式错误，请使用 "问题::答案" 格式', 'error');
    return;
  }
  
  let successCount = 0;
  
  for (const line of lines) {
    const [question, answer] = line.split('::').map(s => s.trim());
    if (question && answer) {
      try {
        await fetch(`${API_BASE}/api/cards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, answer, deck_id: deckId || 1 })
        });
        successCount++;
      } catch (error) {
        console.error('Failed to add card:', error);
      }
    }
  }
  
  showToast(`成功添加 ${successCount} 张卡片`, 'success');
  document.getElementById('quick-add-input').value = '';
  loadStats();
  loadDecks();
  if (currentView === 'study') {
    loadDueCards();
  }
}

// ==================== Stats ====================

async function loadStats() {
  try {
    let url = `${API_BASE}/api/stats`;
    if (currentDeckId) {
      url += `?deck=${currentDeckId}`;
    }
    
    const response = await fetch(url);
    const result = await response.json();
    
    if (result.success) {
      const stats = result.data;
      
      document.getElementById('total-cards').textContent = stats.total;
      document.getElementById('due-cards').textContent = stats.due;
      
      document.getElementById('stat-total').textContent = stats.total;
      document.getElementById('stat-due').textContent = stats.due;
      document.getElementById('stat-reviewed').textContent = stats.reviewed;
      document.getElementById('stat-new').textContent = stats.new;
      document.getElementById('stat-learning').textContent = stats.learning;
      document.getElementById('stat-ease').textContent = stats.avgEase;
      
      const total = stats.total || 1;
      document.getElementById('progress-new').style.width = `${(stats.new / total) * 100}%`;
      document.getElementById('progress-learning').style.width = `${(stats.learning / total) * 100}%`;
      document.getElementById('progress-review').style.width = `${(stats.reviewed / total) * 100}%`;
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

// ==================== Delete Card ====================

function confirmDelete(cardId) {
  document.getElementById('delete-modal').style.display = 'flex';
  document.getElementById('confirm-delete-btn').onclick = () => deleteCard(cardId);
}

function closeModal() {
  document.getElementById('delete-modal').style.display = 'none';
}

async function deleteCard(cardId) {
  try {
    const response = await fetch(`${API_BASE}/api/cards/${cardId}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (result.success) {
      showToast('卡片已删除', 'success');
      closeModal();
      loadAllCards();
      loadStats();
      loadDecks();
    }
  } catch (error) {
    console.error('Failed to delete card:', error);
    showToast('删除失败', 'error');
  }
}

// ==================== Edit Card ====================

async function editCard(cardId) {
  const card = allCards.find(c => c.id === cardId);
  if (!card) return;
  
  document.getElementById('deck-select-add').value = card.deck_id;
  document.getElementById('question-input').value = card.question;
  document.getElementById('answer-input').value = card.answer;
  
  await deleteCard(cardId);
  
  showView('add');
  showToast('已复制到编辑区，请修改后重新添加', 'success');
}

// ==================== Toast ====================

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast fixed bottom-6 right-6 px-6 py-4 rounded-lg shadow-lg transform transition-all duration-300 z-50 bg-white dark:bg-gray-800 border show ${type === 'success' ? 'border-green-500' : 'border-red-500'}`;
  toast.style.transform = 'translateY(0)';
  toast.style.opacity = '1';
  
  setTimeout(() => {
    toast.style.transform = 'translateY(100px)';
    toast.style.opacity = '0';
  }, 3000);
}

// ==================== APKG Import ====================

let selectedAPKGFile = null;
let apkgPreview = null;

function onFileSelected() {
  const fileInput = document.getElementById('apkg-file');
  const file = fileInput.files[0];
  
  if (!file) return;
  
  selectedAPKGFile = file;
  
  document.getElementById('file-name').textContent = file.name;
  document.getElementById('file-size').textContent = formatFileSize(file.size);
  document.getElementById('file-info').style.display = 'flex';
  
  previewAPKG(file);
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function previewAPKG(file) {
  const formData = new FormData();
  formData.append('apkg', file);
  
  try {
    const response = await fetch('/api/apkg/preview', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      apkgPreview = result;
      showPreview(result);
    } else {
      showToast('预览失败：' + result.error, 'error');
    }
  } catch (error) {
    showToast('预览失败：' + error.message, 'error');
  }
}

function showPreview(preview) {
  document.getElementById('preview-area').style.display = 'block';
  document.getElementById('preview-cards').textContent = preview.cardsCount;
  document.getElementById('preview-decks').textContent = preview.deckCount;
  document.getElementById('preview-models').textContent = preview.modelCount;
  
  const detailsDiv = document.getElementById('preview-details');
  let html = '<div class="grid grid-cols-2 gap-4">';
  html += '<div><h4 class="font-medium mb-2">牌组:</h4><ul class="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">';
  preview.decks.forEach(deck => {
    html += `<li>${deck.name} (${deck.id === 1 ? '默认' : '自定义'})</li>`;
  });
  html += '</ul></div><div><h4 class="font-medium mb-2">模型:</h4><ul class="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">';
  preview.models.forEach(model => {
    html += `<li><strong>${model.name}</strong>: ${model.fields.join(', ')}</li>`;
  });
  html += '</ul></div></div>';
  detailsDiv.innerHTML = html;
  
  document.getElementById('import-btn').disabled = false;
}

async function importAPKG() {
  if (!selectedAPKGFile) {
    showToast('请选择文件', 'error');
    return;
  }
  
  const deckId = document.getElementById('import-deck-select').value;
  const formData = new FormData();
  formData.append('apkg', selectedAPKGFile);
  formData.append('deckId', deckId);
  
  document.getElementById('import-progress').style.display = 'block';
  document.getElementById('import-btn').disabled = true;
  
  try {
    const response = await fetch('/api/apkg/import', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      document.getElementById('import-result').style.display = 'block';
      document.getElementById('import-result').innerHTML = `
        <div class="bg-green-50 dark:bg-green-900/30 border border-green-500 rounded-lg p-6">
          <h3 class="text-xl font-bold text-green-700 dark:text-green-300 mb-3">✅ 导入成功!</h3>
          <p class="text-gray-700 dark:text-gray-300 mb-2">成功导入 <strong class="text-green-700 dark:text-green-300">${result.importedCount}</strong> 张卡片</p>
          <p class="text-gray-600 dark:text-gray-400 text-sm mb-4">用时：${(result.duration / 1000).toFixed(1)} 秒</p>
          <button class="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors" onclick="showView('study')">开始学习</button>
        </div>
      `;
      
      await loadDecks();
      await loadStats();
      
      selectedAPKGFile = null;
      apkgPreview = null;
      document.getElementById('apkg-file').value = '';
    } else {
      showToast('导入失败：' + result.error, 'error');
      document.getElementById('import-result').innerHTML = `
        <div class="bg-red-50 dark:bg-red-900/30 border border-red-500 rounded-lg p-6">
          <h3 class="text-xl font-bold text-red-700 dark:text-red-300 mb-3">❌ 导入失败</h3>
          <p class="text-gray-700 dark:text-gray-300">${result.error}</p>
        </div>
      `;
      document.getElementById('import-result').style.display = 'block';
    }
  } catch (error) {
    showToast('导入失败：' + error.message, 'error');
  } finally {
    document.getElementById('import-progress').style.display = 'none';
    document.getElementById('import-btn').disabled = false;
  }
}

// ==================== Global Exports ====================

window.showView = showView;
window.showAnswer = showAnswer;
window.rateCard = rateCard;
window.addCard = addCard;
window.quickAdd = quickAdd;
window.filterCards = filterCards;
window.confirmDelete = confirmDelete;
window.closeModal = closeModal;
window.deleteCard = deleteCard;
window.editCard = editCard;
window.showToast = showToast;
window.toggleTheme = toggleTheme;
window.changeDeck = changeDeck;
window.showCreateDeckModal = showCreateDeckModal;
window.showEditDeckModal = showEditDeckModal;
window.closeDeckModal = closeDeckModal;
window.createDeck = createDeck;
window.updateDeck = updateDeck;
window.confirmDeleteDeck = confirmDeleteDeck;
window.deleteDeck = deleteDeck;
window.selectDeckAndStudy = selectDeckAndStudy;
window.onFileSelected = onFileSelected;
window.importAPKG = importAPKG;
window.toggleMobileMenu = toggleMobileMenu;

// ==================== Phase 3: Templates ====================

let allTemplates = [];

async function loadTemplates() {
  try {
    const response = await fetch(`${API_BASE}/api/templates`);
    const result = await response.json();
    if (result.success) {
      allTemplates = result.data;
      renderTemplates();
    }
  } catch (error) {
    console.error('Failed to load templates:', error);
  }
}

function renderTemplates() {
  const container = document.getElementById('templates-grid');
  if (!container) return;
  
  container.innerHTML = allTemplates.map(t => `
    <div class="template-card bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h3 class="font-bold text-lg">${t.name}</h3>
          <span class="text-xs px-2 py-1 rounded bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300">${t.type}</span>
        </div>
        <div class="flex gap-2">
          <button class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" onclick="editTemplate(${t.id})"><i class="ph ph-pencil"></i></button>
          ${!t.is_default ? `<button class="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600" onclick="deleteTemplate(${t.id})"><i class="ph ph-trash"></i></button>` : ''}
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div class="text-gray-500 dark:text-gray-400 mb-1">正面模板:</div>
          <div class="p-2 bg-gray-50 dark:bg-gray-700 rounded font-mono text-xs truncate">${t.front_template}</div>
        </div>
        <div>
          <div class="text-gray-500 dark:text-gray-400 mb-1">背面模板:</div>
          <div class="p-2 bg-gray-50 dark:bg-gray-700 rounded font-mono text-xs truncate">${t.back_template}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function showTemplateModal() {
  const modal = document.getElementById('template-modal');
  if (modal) {
    document.getElementById('template-name').value = '';
    document.getElementById('template-type').value = 'basic';
    document.getElementById('template-front').value = '{{question}}';
    document.getElementById('template-back').value = '{{question}}\n<hr>\n{{answer}}';
    document.getElementById('template-css').value = '';
    modal.style.display = 'flex';
  } else {
    const name = prompt('模板名称:');
    if (!name) return;
    const front = prompt('正面模板 (使用 {{question}} 等字段):', '{{question}}');
    const back = prompt('背面模板:', '{{question}}\n<hr>\n{{answer}}');
    if (front && back) {
      createTemplate(name, 'basic', front, back, '');
    }
  }
}

async function createTemplate(name, type, front, back, css) {
  try {
    const response = await fetch(`${API_BASE}/api/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, front_template: front, back_template: back, css })
    });
    const result = await response.json();
    if (result.success) {
      showToast('模板创建成功', 'success');
      loadTemplates();
    } else {
      showToast(result.error, 'error');
    }
  } catch (error) {
    showToast('创建失败', 'error');
  }
}

async function editTemplate(id) {
  const template = allTemplates.find(t => t.id === id);
  if (!template) return;
  
  const name = prompt('模板名称:', template.name);
  if (!name) return;
  const front = prompt('正面模板:', template.front_template);
  const back = prompt('背面模板:', template.back_template);
  const css = prompt('CSS 样式:', template.css);
  
  try {
    const response = await fetch(`${API_BASE}/api/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type: template.type, front_template: front, back_template: back, css })
    });
    const result = await response.json();
    if (result.success) {
      showToast('模板更新成功', 'success');
      loadTemplates();
    }
  } catch (error) {
    showToast('更新失败', 'error');
  }
}

async function deleteTemplate(id) {
  if (!confirm('确定删除此模板？')) return;
  try {
    const response = await fetch(`${API_BASE}/api/templates/${id}`, { method: 'DELETE' });
    const result = await response.json();
    if (result.success) {
      showToast('模板已删除', 'success');
      loadTemplates();
    } else {
      showToast(result.error, 'error');
    }
  } catch (error) {
    showToast('删除失败', 'error');
  }
}

// ==================== Phase 3: Media ====================

async function uploadMedia(input) {
  const file = input.files[0];
  if (!file) return;
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch(`${API_BASE}/api/media/upload`, { method: 'POST', body: formData });
    const result = await response.json();
    if (result.success) {
      showToast(`文件上传成功: ${result.data.original_name}`, 'success');
      loadMedia();
    } else {
      showToast(result.error, 'error');
    }
  } catch (error) {
    showToast('上传失败', 'error');
  }
  input.value = '';
}

async function loadMedia() {
  try {
    const response = await fetch(`${API_BASE}/api/media`);
    const result = await response.json();
    if (result.success) {
      renderMedia(result.data);
    }
  } catch (error) {
    console.error('Failed to load media:', error);
  }
}

function renderMedia(mediaFiles) {
  const container = document.getElementById('media-grid');
  if (!container) return;
  
  container.innerHTML = mediaFiles.map(m => {
    const isImage = m.mime_type.startsWith('image/');
    const isAudio = m.mime_type.startsWith('audio/');
    
    return `
      <div class="media-item bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="aspect-square flex items-center justify-center bg-gray-100 dark:bg-gray-700">
          ${isImage ? `<img src="/media/${m.filename}" class="w-full h-full object-cover">` : ''}
          ${isAudio ? `<div class="text-4xl">🎵</div>` : ''}
          ${!isImage && !isAudio ? `<div class="text-4xl">📄</div>` : ''}
        </div>
        <div class="p-3">
          <div class="text-sm font-medium truncate">${m.original_name}</div>
          <div class="text-xs text-gray-500">${(m.file_size / 1024).toFixed(1)} KB</div>
          <button class="mt-2 w-full text-xs text-red-600 hover:text-red-700" onclick="deleteMedia(${m.id})">删除</button>
        </div>
      </div>
    `;
  }).join('');
}

async function deleteMedia(id) {
  if (!confirm('确定删除此文件？')) return;
  try {
    const response = await fetch(`${API_BASE}/api/media/${id}`, { method: 'DELETE' });
    const result = await response.json();
    if (result.success) {
      showToast('文件已删除', 'success');
      loadMedia();
    }
  } catch (error) {
    showToast('删除失败', 'error');
  }
}

// ==================== Phase 3: Export ====================

async function exportCards() {
  const format = document.querySelector('input[name="export-format"]:checked')?.value || 'apkg';
  const deckId = document.getElementById('export-deck-select')?.value || '';
  const resultDiv = document.getElementById('export-result');
  
  try {
    const response = await fetch(`${API_BASE}/api/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format, deck_id: deckId ? parseInt(deckId) : null })
    });
    const result = await response.json();
    
    if (result.success) {
      resultDiv.style.display = 'block';
      resultDiv.className = 'mt-4 p-4 rounded-lg bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      resultDiv.innerHTML = `
        <div class="font-medium">✅ 导出成功!</div>
        <div class="text-sm mt-1">导出 ${result.data.count} 张卡片</div>
        <a href="${API_BASE}/api/export/${result.data.exportId}/download?format=${format}" 
           class="inline-block mt-3 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg">
          <i class="ph ph-download-simple mr-2"></i>下载文件
        </a>
      `;
    } else {
      showToast(result.error, 'error');
    }
  } catch (error) {
    showToast('导出失败', 'error');
  }
}

// ==================== Phase 3: Enhanced Stats with Charts ====================

let dailyChart, deckChart, retentionChart;

async function loadStatsWithCharts() {
  await loadStats();
  await loadDailyStats();
  await loadDeckStats();
  await loadRetentionStats();
}

async function loadDailyStats() {
  try {
    const response = await fetch(`${API_BASE}/api/stats/daily?days=30`);
    const result = await response.json();
    if (result.success) {
      renderDailyChart(result.data);
    }
  } catch (error) {
    console.error('Failed to load daily stats:', error);
  }
}

function renderDailyChart(data) {
  const ctx = document.getElementById('daily-chart');
  if (!ctx) return;
  
  if (dailyChart) dailyChart.destroy();
  
  dailyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.date.slice(5)),
      datasets: [{
        label: '学习量',
        data: data.map(d => d.count),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  });
}

async function loadDeckStats() {
  try {
    const response = await fetch(`${API_BASE}/api/stats/decks`);
    const result = await response.json();
    if (result.success) {
      renderDeckChart(result.data);
    }
  } catch (error) {
    console.error('Failed to load deck stats:', error);
  }
}

function renderDeckChart(data) {
  const ctx = document.getElementById('deck-chart');
  if (!ctx) return;
  
  if (deckChart) deckChart.destroy();
  
  const colors = ['#2563eb', '#16a34a', '#ea580c', '#dc2626', '#9333ea', '#0891b2'];
  
  deckChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.name),
      datasets: [{
        data: data.map(d => d.count),
        backgroundColor: colors
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

async function loadRetentionStats() {
  try {
    const response = await fetch(`${API_BASE}/api/stats/retention`);
    const result = await response.json();
    if (result.success) {
      renderRetentionChart(result.data);
    }
  } catch (error) {
    console.error('Failed to load retention stats:', error);
  }
}

function renderRetentionChart(data) {
  const ctx = document.getElementById('retention-chart');
  if (!ctx) return;
  
  if (retentionChart) retentionChart.destroy();
  
  retentionChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.bucket),
      datasets: [{
        label: '保持率 (%)',
        data: data.map(d => d.retention),
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22, 163, 74, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, max: 100 } }
    }
  });
}

// ==================== Update Navigation ====================

// Update showView function to handle new views
const originalShowView = window.showView;
window.showView = function(view) {
  if (originalShowView) originalShowView(view);
  
  // Load data for new views
  if (view === 'templates') loadTemplates();
  if (view === 'media') loadMedia();
  if (view === 'export') {
    loadDecks();
    setTimeout(() => {
      const select = document.getElementById('export-deck-select');
      if (select && allDecks) {
        select.innerHTML = '<option value="">全部牌组</option>' + 
          allDecks.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
      }
    }, 100);
  }
  if (view === 'stats') loadStatsWithCharts();
};

console.log('Phase 3 features loaded!');

async function saveTemplate() {
  const name = document.getElementById('template-name').value;
  const type = document.getElementById('template-type').value;
  const front = document.getElementById('template-front').value;
  const back = document.getElementById('template-back').value;
  const css = document.getElementById('template-css').value;
  
  if (!name || !front || !back) {
    showToast('请填写必填字段', 'error');
    return;
  }
  
  await createTemplate(name, type, front, back, css);
  document.getElementById('template-modal').style.display = 'none';
}

// ==================== Settings Page Functions ====================

// Show settings tab
function showSettingsTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.style.display = 'none';
  });
  
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active', 'border-primary-600', 'text-primary-600');
    btn.classList.add('border-transparent', 'text-gray-500');
  });
  
  // Show selected tab
  document.getElementById(`settings-${tabName}`).style.display = 'block';
  event.target.classList.add('active', 'border-primary-600', 'text-primary-600');
  event.target.classList.remove('border-transparent', 'text-gray-500');
  
  // Load data for specific tabs
  if (tabName === 'decks') loadDeckSettings();
  if (tabName === 'templates') loadTemplatesList();
}

// Load learning settings
async function loadLearningSettings() {
  try {
    const response = await fetch(`${API_BASE}/api/settings/limits`);
    const result = await response.json();
    
    if (result.success) {
      document.getElementById('daily-new-limit').value = result.data.daily_new_limit || 20;
      document.getElementById('daily-review-limit').value = result.data.daily_review_limit || 9999;
      document.getElementById('ignore-review-limit').checked = result.data.new_cards_ignore_review_limit || false;
    }
    
    // Load progress
    await loadDailyProgress();
  } catch (error) {
    console.error('Failed to load learning settings:', error);
  }
}

// Load daily progress
async function loadDailyProgress() {
  try {
    const response = await fetch(`${API_BASE}/api/daily/progress`);
    const result = await response.json();
    
    if (result.success) {
      const data = result.data;
      document.getElementById('progress-new').textContent = data.new_count;
      document.getElementById('limit-new').textContent = data.new_limit;
      document.getElementById('progress-new-bar').style.width = `${(data.new_count / data.new_limit) * 100}%`;
      
      document.getElementById('progress-review').textContent = data.review_count;
      document.getElementById('limit-review').textContent = data.review_limit;
      document.getElementById('progress-review-bar').style.width = `${(data.review_count / Math.min(data.review_limit, 1000)) * 100}%`;
    }
  } catch (error) {
    console.error('Failed to load daily progress:', error);
  }
}

// Save learning settings
async function saveLearningSettings() {
  try {
    const dailyNewLimit = parseInt(document.getElementById('daily-new-limit').value);
    const dailyReviewLimit = parseInt(document.getElementById('daily-review-limit').value);
    const ignoreReviewLimit = document.getElementById('ignore-review-limit').checked;
    
    const response = await fetch(`${API_BASE}/api/settings/limits`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        daily_new_limit: dailyNewLimit,
        daily_review_limit: dailyReviewLimit,
        new_cards_ignore_review_limit: ignoreReviewLimit
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showToast('设置已保存', 'success');
      await loadDailyProgress();
    } else {
      showToast('保存失败：' + result.error, 'error');
    }
  } catch (error) {
    showToast('保存失败：' + error.message, 'error');
  }
}

// Reset daily progress
async function resetDailyProgress() {
  if (!confirm('确定要重置今日进度吗？')) return;
  
  try {
    const response = await fetch(`${API_BASE}/api/daily/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reset_new: true, reset_review: true })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showToast('进度已重置', 'success');
      await loadDailyProgress();
    } else {
      showToast('重置失败：' + result.error, 'error');
    }
  } catch (error) {
    showToast('重置失败：' + error.message, 'error');
  }
}

// Load deck settings
async function loadDeckSettings() {
  try {
    const decksResponse = await fetch(`${API_BASE}/api/decks`);
    const decksResult = await decksResponse.json();
    
    if (!decksResult.success) return;
    
    const container = document.getElementById('decks-settings-list');
    container.innerHTML = '';
    
    for (const deck of decksResult.data) {
      const limitsResponse = await fetch(`${API_BASE}/api/decks/${deck.id}/limits`);
      const limitsResult = await limitsResponse.json();
      
      const limits = limitsResult.success ? limitsResult.data : {};
      
      const deckEl = document.createElement('div');
      deckEl.className = 'p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between';
      deckEl.innerHTML = `
        <div>
          <div class="font-medium">${deck.name}</div>
          <div class="text-sm text-gray-500 dark:text-gray-400">
            新卡：<input type="number" id="deck-${deck.id}-new" value="${limits.new_limit || ''}" 
              placeholder="使用全局" min="1" max="1000"
              class="w-20 px-2 py-1 ml-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
            复习：<input type="number" id="deck-${deck.id}-review" value="${limits.review_limit || ''}" 
              placeholder="使用全局" min="1" max="9999"
              class="w-20 px-2 py-1 ml-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
          </div>
        </div>
        <button class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm" 
          onclick="saveDeckLimits(${deck.id})">
          保存
        </button>
      `;
      container.appendChild(deckEl);
    }
  } catch (error) {
    console.error('Failed to load deck settings:', error);
  }
}

// Save deck limits
async function saveDeckLimits(deckId) {
  try {
    const newLimit = document.getElementById(`deck-${deckId}-new`).value;
    const reviewLimit = document.getElementById(`deck-${deckId}-review`).value;
    
    const body = {};
    if (newLimit) body.new_limit = parseInt(newLimit);
    if (reviewLimit) body.review_limit = parseInt(reviewLimit);
    
    const response = await fetch(`${API_BASE}/api/decks/${deckId}/limits`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const result = await response.json();
    
    if (result.success) {
      showToast('牌组设置已保存', 'success');
    } else {
      showToast('保存失败：' + result.error, 'error');
    }
  } catch (error) {
    showToast('保存失败：' + error.message, 'error');
  }
}

// Load templates list
async function loadTemplatesList() {
  try {
    const response = await fetch(`${API_BASE}/api/templates`);
    const result = await response.json();
    
    if (!result.success) return;
    
    const container = document.getElementById('templates-list');
    container.innerHTML = '';
    
    for (const template of result.data) {
      const templateEl = document.createElement('div');
      templateEl.className = 'p-4 border border-gray-200 dark:border-gray-700 rounded-lg';
      templateEl.innerHTML = `
        <div class="flex justify-between items-start mb-2">
          <div>
            <div class="font-medium">${template.name}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">${template.type}</div>
          </div>
          <div class="flex gap-2">
            <button class="text-gray-500 hover:text-primary-600" onclick="previewTemplate(${template.id})">
              <i class="ph ph-eye"></i>
            </button>
            <button class="text-gray-500 hover:text-primary-600" onclick="cloneTemplate(${template.id})">
              <i class="ph ph-copy"></i>
            </button>
            ${!template.is_default ? `<button class="text-gray-500 hover:text-red-600" onclick="deleteTemplate(${template.id})">
              <i class="ph ph-trash"></i>
            </button>` : ''}
          </div>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
          ${template.front_template}
        </div>
      `;
      container.appendChild(templateEl);
    }
  } catch (error) {
    console.error('Failed to load templates:', error);
  }
}

// Preview template
async function previewTemplate(templateId) {
  const question = prompt('请输入测试问题:', '示例问题');
  if (!question) return;
  
  const answer = prompt('请输入测试答案:', '示例答案');
  if (!answer) return;
  
  try {
    const response = await fetch(`${API_BASE}/api/templates/${templateId}/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: { question, answer }
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('正面:\n' + result.data.front + '\n\n背面:\n' + result.data.back);
    }
  } catch (error) {
    showToast('预览失败：' + error.message, 'error');
  }
}

// Clone template
async function cloneTemplate(templateId) {
  const newName = prompt('请输入新模板名称:');
  if (!newName) return;
  
  try {
    const response = await fetch(`${API_BASE}/api/templates/${templateId}/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_name: newName })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showToast('模板已克隆', 'success');
      loadTemplatesList();
    } else {
      showToast('克隆失败：' + result.error, 'error');
    }
  } catch (error) {
    showToast('克隆失败：' + error.message, 'error');
  }
}

// Delete template
async function deleteTemplate(templateId) {
  if (!confirm('确定要删除此模板吗？此操作不可撤销。')) return;
  
  try {
    const response = await fetch(`${API_BASE}/api/templates/${templateId}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (result.success) {
      showToast('模板已删除', 'success');
      loadTemplatesList();
    } else {
      showToast('删除失败：' + result.error, 'error');
    }
  } catch (error) {
    showToast('删除失败：' + error.message, 'error');
  }
}

// Set theme
function setTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
  showToast('主题已切换', 'success');
}

// Update font size
function updateFontSize(size) {
  document.getElementById('font-size-value').textContent = size;
  document.documentElement.style.setProperty('--font-size', size + 'px');
  localStorage.setItem('font-size', size);
}

// Export data
function exportData(format) {
  window.location.href = `${API_BASE}/api/export/${format}`;
  showToast('导出已开始', 'success');
}

// Clear progress
async function clearProgress() {
  if (!confirm('警告：这将清空所有学习进度，但保留卡片内容。确定继续吗？')) return;
  
  showToast('功能开发中...', 'info');
}

// Backup database
async function backupDatabase() {
  showToast('数据库备份功能开发中...', 'info');
}

// Initialize settings when view is shown
window.showView = function(viewName) {
  if (originalShowView) originalShowView(viewName);
  
  if (viewName === 'settings') {
    loadLearningSettings();
  }
};

console.log('Settings page functions loaded!');
