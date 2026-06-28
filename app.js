// app.js - 感染性疾病辅助检索工具 主程序

// ============ 全局变量 ============
var allData = [];
var favorites = [];
var isRecognizing = false;
var recognition = null;
var SEARCH_KEY = 'rebing_last_search'; // 存储上次搜索的key

// ============ 初始化 ============
function init() {
  console.log('初始化...');
  
  // 1. 检查密码
  if (!checkPassword()) return;
  
  // 2. 加载数据
  loadData();
  
  // 3. 加载收藏
  loadFavorites();
  
  // 4. 绑定事件
  bindEvents();
  
  // 5. 读取上次搜索内容
  loadLastSearch();
  
  // 6. 读取剪贴板
  setTimeout(readClipboard, 300);
  
  console.log('初始化完成');
}

// ============ 密码检查 ============
function checkPassword() {
  // 检查是否已登录（1天内）
  var logged = localStorage.getItem('rebing_logged');
  if (logged && (Date.now() - parseInt(logged)) < 24 * 60 * 60 * 1000) {
    console.log('已登录，跳过密码');
    return true;
  }
  
  // 弹出密码输入框
  var pwd = prompt('请输入访问密码：', '');
  
  // 读取key.txt（同步请求）
  var correctPwd = '1989'; // 默认值
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'key.txt', false); // 同步
    xhr.send(null);
    if (xhr.status === 200) {
      var encrypted = xhr.responseText.trim();
      // 解密（Base64反转）
      var decoded = encrypted.split('').reverse().join('');
      correctPwd = atob(decoded);
    }
  } catch(e) {
    console.log('读取key.txt失败，使用默认密码');
  }
  
  // 验证密码
  if (pwd === correctPwd) {
    localStorage.setItem('rebing_logged', Date.now().toString());
    return true;
  } else {
    document.body.innerHTML = '<div style="text-align:center;padding:50px;color:#ef4444;"><h2>密码错误</h2><p>无法访问此页面</p></div>';
    return false;
  }
}

// ============ 数据加载 ============
function loadData() {
  allData = window.DATA || [];
  console.log('数据条数:', allData.length);
  
  var info = document.getElementById('info');
  if (info) {
    info.textContent = '共 ' + allData.length + ' 个条目 | 资源来自网络，如有侵权请联系微信 zh52662006';
  }
  
  // 渲染所有条目
  renderResults(allData);
}

// ============ 搜索记忆功能 ============
function loadLastSearch() {
  var lastSearch = localStorage.getItem(SEARCH_KEY) || '';
  var input = document.getElementById('searchInput');
  if (input && lastSearch) {
    input.value = lastSearch;
    // 触发搜索
    input.dispatchEvent(new Event('input'));
  }
}

function saveSearch(text) {
  if (text && text.trim()) {
    localStorage.setItem(SEARCH_KEY, text.trim());
  } else {
    localStorage.removeItem(SEARCH_KEY);
  }
}

function clearSearch() {
  var input = document.getElementById('searchInput');
  if (input) {
    input.value = '';
    input.focus();
    
    // 清空保存的搜索
    try {
      localStorage.removeItem('rebing_last_search');
    } catch(e) {}
    
    // 显示所有结果
    renderResults(allData);
    
    // 提示
    showToast('已清空');
  }
}

// ============ 收藏功能 ============
function loadFavorites() {
  try {
    favorites = JSON.parse(localStorage.getItem('rebing_favorites') || '[]');
  } catch(e) {
    favorites = [];
  }
  updateFavCount();
}

function updateFavCount() {
  var countEl = document.getElementById('favCount');
  if (countEl) {
    if (favorites.length > 0) {
      countEl.textContent = favorites.length;
      countEl.style.display = 'inline';
    } else {
      countEl.style.display = 'none';
    }
  }
}

function isFav(id) {
  return favorites.some(function(f) { return f.id == id; });
}

function toggleFav(id) {
  event.stopPropagation(); // 阻止冒泡
  
  var idx = favorites.findIndex(function(f) { return f.id == id; });
  
  if (idx >= 0) {
    favorites.splice(idx, 1);
    showToast('已取消收藏');
  } else {
    var item = allData.find(function(d) { return d.id == id; });
    if (item) {
      favorites.push({
        id: item.id,
        title: item.title || item.keywords.split(';')[0] || '未命名',
        keywords: item.keywords
      });
      showToast('已收藏');
    }
  }
  
  localStorage.setItem('rebing_favorites', JSON.stringify(favorites));
  updateFavCount();
  
  // 重新渲染当前结果
  var query = document.getElementById('searchInput').value;
  renderResults(search(query));
}

// ============ 搜索功能 ============
function search(query) {
  if (!query || !query.trim()) return allData;
  
  // 分割关键词（支持 ; ； + 三种分隔符）
  var keywords = query.split(/[;；+]/)
    .map(function(s) { return s.trim(); })
    .filter(function(s) { return s.length > 0; });
  
  if (keywords.length === 0) return allData;
  
  // 过滤：必须包含所有关键词
  return allData.filter(function(item) {
    var text = (item.keywords + ' ' + (item.title || '')).toLowerCase();
    return keywords.every(function(kw) {
      return text.indexOf(kw.toLowerCase()) !== -1;
    });
  });
}

// ============ 渲染结果 ============
function renderResults(results) {
  var container = document.getElementById('results');
  if (!container) return;
  
  // 更新结果计数
  var countEl = document.getElementById('resultCount');
  if (countEl) {
    var query = document.getElementById('searchInput').value;
    if (query && query.trim()) {
      countEl.textContent = '找到 ' + results.length + ' 个匹配结果';
    } else {
      countEl.textContent = '共 ' + results.length + ' 个条目';
    }
  }
  
  // 生成HTML
  var html = '';
  
  if (results.length === 0) {
    html = '<div style="text-align:center;padding:40px;color:#94a3b8;">🔍 无匹配结果</div>';
  } else {
    for (var i = 0; i < results.length; i++) {
      var item = results[i];
      var title = item.title || item.keywords.split(';')[0] || '未命名';
      var keywords = item.keywords || '';
      
      // 截断过长的内容
      if (title.length > 60) title = title.substring(0, 60) + '...';
      if (keywords.length > 120) keywords = keywords.substring(0, 120) + '...';
      
      // 高亮关键词
      var query = document.getElementById('searchInput').value;
      if (query && query.trim()) {
        var kws = query.split(/[;；+]/).map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
        for (var j = 0; j < kws.length; j++) {
          var kw = kws[j];
          if (kw) {
            var regex = new RegExp('(' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
            title = title.replace(regex, '<mark>$1</mark>');
            keywords = keywords.replace(regex, '<mark>$1</mark>');
          }
        }
      }
      
      html += '<div class="result-card" onclick="openPage(' + item.id + ')">' +
        '<span class="result-id">#' + item.id + '</span>' +
        '<div class="result-title">' + title + '</div>' +
        '<div class="result-keywords">' + keywords + '</div>' +
        '<div class="result-actions">' +
          '<button class="action-btn ' + (isFav(item.id) ? 'favorited' : '') + '" onclick="toggleFav(' + item.id + ')">' +
            (isFav(item.id) ? '★ 已收藏' : '☆ 收藏') +
          '</button>' +
        '</div>' +
      '</div>';
    }
  }
  
  container.innerHTML = html;
}

// ============ 打开页面 ============
function openPage(id) {
  // 复制编辑框内容
  var text = document.getElementById('searchInput').value;
  if (navigator.clipboard && text) {
    navigator.clipboard.writeText(text).then(function() {
      console.log('已复制到剪贴板:', text);
    });
  }
  
  // 跳转到 {id}.html
  var url = id + '.html';
  console.log('跳转:', url);
  window.location.href = url;
}

// ============ 收藏夹模态框 ============
function showFavorites() {
  var listEl = document.getElementById('favList');
  if (!listEl) return;
  
  var html = '';
  
  if (favorites.length === 0) {
    html = '<div style="text-align:center;padding:30px;color:#94a3b8;">暂无收藏</div>';
  } else {
    for (var i = 0; i < favorites.length; i++) {
      var f = favorites[i];
      html += '<div class="fav-item">' +
        '<div class="fav-item-info">' +
          '<div class="fav-item-id">#' + f.id + '</div>' +
          '<div class="fav-item-title">' + (f.title || '') + '</div>' +
        '</div>' +
        '<div class="fav-item-actions">' +
          '<button class="action-btn" onclick="openPage(' + f.id + ')">打开</button>' +
          '<button class="action-btn" onclick="removeFav(' + f.id + ')">移除</button>' +
        '</div>' +
      '</div>';
    }
  }
  
  listEl.innerHTML = html;
  
  // 显示模态框
  var modal = document.getElementById('favModal');
  if (modal) modal.classList.add('active');
}

function removeFav(id) {
  favorites = favorites.filter(function(f) { return f.id != id; });
  localStorage.setItem('rebing_favorites', JSON.stringify(favorites));
  updateFavCount();
  showFavorites(); // 重新渲染
}

// ============ 添加网页 ============
function addNew() {
  var id = document.getElementById('addId').value.trim();
  var title = document.getElementById('addTitle').value.trim();
  var keywords = document.getElementById('addKeywords').value.trim();
  
  if (!id || !keywords) {
    alert('请输入ID和关键词');
    return;
  }
  
  // 添加到数据
  allData.push({
    id: parseInt(id) || id,
    title: title,
    keywords: keywords
  });
  
  // 保存到localStorage
  localStorage.setItem('rebing_data', JSON.stringify(allData));
  
  alert('添加成功！');
  closeModal('addModal');
  
  // 重新渲染
  renderResults(allData);
  
  // 清空输入框
  document.getElementById('addId').value = '';
  document.getElementById('addTitle').value = '';
  document.getElementById('addKeywords').value = '';
}

// ============ 语音输入 ============
function startVoice() {
  // 检查浏览器支持
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('当前浏览器不支持语音输入\n请使用Chrome或Edge浏览器');
    return;
  }
  
  var btn = document.getElementById('voiceBtn');
  
  if (isRecognizing) {
    // 停止识别
    if (recognition) recognition.stop();
    return;
  }
  
  // 创建识别对象
  recognition = new SpeechRecognition();
  recognition.lang = 'zh-CN';
  recognition.continuous = false;
  recognition.interimResults = false;
  
  recognition.onstart = function() {
    isRecognizing = true;
    btn.classList.add('recording');
    btn.textContent = '🔴';
    showToast('请开始说话...');
  };
  
  recognition.onresult = function(event) {
    var text = event.results[0][0].transcript;
    var input = document.getElementById('searchInput');
    input.value = input.value ? input.value + ' ' + text : text;
    input.dispatchEvent(new Event('input'));
    showToast('识别完成：' + text);
  };
  
  recognition.onerror = function(event) {
    console.error('语音识别错误:', event.error);
    isRecognizing = false;
    btn.classList.remove('recording');
    btn.textContent = '🎤';
    
    if (event.error === 'not-allowed') {
      alert('请允许麦克风权限');
    } else if (event.error === 'network') {
      alert('网络错误，请检查网络连接');
    }
  };
  
  recognition.onend = function() {
    isRecognizing = false;
    btn.classList.remove('recording');
    btn.textContent = '🎤';
  };
  
  try {
    recognition.start();
  } catch(e) {
    console.error('启动失败:', e);
    alert('启动语音识别失败');
  }
}

// ============ 剪贴板 ============
function readClipboard() {
  if (navigator.clipboard && navigator.clipboard.readText) {
    navigator.clipboard.readText().then(function(text) {
      if (text && text.trim()) {
        var input = document.getElementById('searchInput');
        if (!input.value) {
          input.value = text.trim();
          input.dispatchEvent(new Event('input'));
          console.log('已从剪贴板读取:', text);
        }
      }
    }).catch(function(err) {
      console.log('无法读取剪贴板:', err);
    });
  }
}

// ============ 模态框 ============
function closeModal(id) {
  var modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

// ============ Toast提示 ============
function showToast(msg) {
  var toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = msg;
  toast.classList.add('show');
  
  setTimeout(function() {
    toast.classList.remove('show');
  }, 2000);
}

// ============ 事件绑定 ============
function bindEvents() {
  // 搜索框实时搜索
  var searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      var query = this.value;
      var results = search(query);
      renderResults(results);
      // 保存搜索内容
      saveSearch(query);
    });
    
    // 回车搜索
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        this.blur();
      }
    });
  }
  
  // 收藏夹按钮
  var favBtn = document.getElementById('favBtn');
  if (favBtn) {
    favBtn.addEventListener('click', showFavorites);
  }
  
  // 添加按钮
  var addBtn = document.getElementById('addBtn');
  if (addBtn) {
    addBtn.addEventListener('click', function() {
      var modal = document.getElementById('addModal');
      if (modal) modal.classList.add('active');
    });
  }
  
  // 语音按钮
  var voiceBtn = document.getElementById('voiceBtn');
  if (voiceBtn) {
    voiceBtn.addEventListener('click', startVoice);
  }
  
  // 分割按钮
  var splitBtn = document.getElementById('splitBtn');
  if (splitBtn) {
    splitBtn.addEventListener('click', function() {
      var input = document.getElementById('searchInput');
      input.value = input.value + '+ ';
      input.focus();
      saveSearch(input.value);
    });
  }
  
  // 清空按钮
  var clearBtn = document.getElementById('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearSearch);
  }
  
  // 添加确认按钮
  var addConfirm = document.getElementById('addConfirm');
  if (addConfirm) {
    addConfirm.addEventListener('click', addNew);
  }
  
  // 模态框关闭按钮
  var closeButtons = document.querySelectorAll('[data-close]');
  for (var i = 0; i < closeButtons.length; i++) {
    closeButtons[i].addEventListener('click', function() {
      var modal = this.closest('.modal-overlay');
      if (modal) modal.classList.remove('active');
    });
  }
  
  // 点击模态框背景关闭
  var modals = document.querySelectorAll('.modal-overlay');
  for (var j = 0; j < modals.length; j++) {
    modals[j].addEventListener('click', function(e) {
      if (e.target === this) {
        this.classList.remove('active');
      }
    });
  }
}

// ============ 页面加载 ============
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
