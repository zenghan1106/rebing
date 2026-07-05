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

  // 1. 检查机器码授权（已记住设备则免验证）
  if (!initMachineAuth()) return;

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

// ============ 机器码验证（由 machine_auth_v2.js 提供）============
// checkPassword() 已废弃，请使用 initMachineAuth()

// ============ 数据加载 ============
function loadData() {
  allData = window.DATA || [];
  console.log('数据条数:', allData.length);
  
  var info = document.getElementById('info');
  if (info) {
    info.textContent = '共 ' + allData.length + ' 个条目 | 资源来自网络，如有侵权请联系微信 zh52662006删除';
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
  
  // 生成HTML（表格形式）
  var html = '';
  
  if (results.length === 0) {
    html = '<div class="table-empty">🔍 无匹配结果</div>';
  } else {
    // 表头
    html = '<div class="results-table">' +
           '<div class="table-header">' +
             '<div class="table-cell cell-id">ID</div>' +
             '<div class="table-cell cell-title">标题 / 关键词</div>' +
             '<div class="table-cell cell-action">操作</div>' +
           '</div>';
    
    // 数据行
    for (var i = 0; i < results.length; i++) {
      var item = results[i];
      var title = item.title || item.keywords.split(';')[0] || '未命名';
      var keywords = item.keywords || '';
      var favClass = isFav(item.id) ? 'favorited' : '';
      var favText = isFav(item.id) ? '★ 已收藏' : '☆ 收藏';
      
      // 截断过长的内容
      if (title.length > 50) title = title.substring(0, 50) + '...';
      if (keywords.length > 80) keywords = keywords.substring(0, 80) + '...';
      
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
      
      html += '<div class="table-row" onclick="openPage(' + item.id + ')">' +
        '<div class="table-cell cell-id"><span>#' + item.id + '</span></div>' +
        '<div class="cell-title-wrap">' +
          '<div class="cell-title">' + title + '</div>' +
          '<div class="cell-keywords-text" title="' + (item.keywords || '') + '">' + keywords + '</div>' +
        '</div>' +
        '<div class="table-cell cell-action">' +
          '<button class="' + favClass + '" onclick="event.stopPropagation();toggleFav(' + item.id + ')">' + favText + '</button>' +
        '</div>' +
      '</div>';
    }
    
    html += '</div>'; // 关闭 results-table
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
  
  // ✅ 调试：显示实际跳转的URL
  alert('调试信息:\n\nID: ' + id + '\nURL: ' + url + '\n\n类型: ' + typeof id);
  
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
    alert('当前浏览器不支持语音输入\n\n请使用以下浏览器：\n• Chrome (推荐)\n• Edge\n• Safari');
    return;
  }
  
  var btn = document.getElementById('voiceBtn');
  
  // 如果正在识别，先停止
  if (isRecognizing) {
    try {
      if (recognition) {
        recognition.abort(); // 使用abort而不是stop，避免aborted错误
      }
    } catch(e) {}
    isRecognizing = false;
    btn.classList.remove('recording');
    btn.textContent = '🎤';
    return;
  }
  
  // 创建识别对象
  try {
    recognition = new SpeechRecognition();
  } catch(e) {
    alert('创建语音识别对象失败');
    return;
  }
  
  recognition.lang = 'zh-CN';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  
  // 设置超时（5秒无响应自动停止）
  var timeoutId = setTimeout(function() {
    if (isRecognizing) {
      try {
        recognition.stop();
      } catch(e) {}
      showToast('识别超时，请重试');
    }
  }, 5000);
  
  recognition.onstart = function() {
    isRecognizing = true;
    btn.classList.add('recording');
    btn.textContent = '🔴';
    showToast('请开始说话...');
  };
  
  recognition.onresult = function(event) {
    clearTimeout(timeoutId); // 清除超时
    var text = '';
    if (event.results && event.results.length > 0) {
      text = event.results[0][0].transcript;
    }
    
    if (text && text.trim()) {
      var input = document.getElementById('searchInput');
      input.value = input.value ? input.value + ' ' + text : text;
      input.dispatchEvent(new Event('input'));
      saveSearch(input.value); // 保存搜索
      showToast('识别完成 ✓');
    } else {
      showToast('未识别到内容，请重试');
    }
  };
  
  recognition.onerror = function(event) {
    clearTimeout(timeoutId); // 清除超时
    console.error('语音识别错误:', event.error);
    isRecognizing = false;
    btn.classList.remove('recording');
    btn.textContent = '🎤';
    
    // 不显示错误提示的情况
    if (event.error === 'aborted' || event.error === 'canceled') {
      // 用户主动停止或取消，不显示错误
      return;
    }
    
    // 显示友好的错误提示
    var errorMsg = '';
    switch(event.error) {
      case 'not-allowed':
        errorMsg = '请允许使用麦克风\n\n操作方法：\n点击浏览器地址栏左侧的🔒图标 → 允许麦克风权限';
        break;
      case 'network':
        errorMsg = '网络错误，请检查网络连接\n\n语音识别需要联网使用';
        break;
      case 'no-speech':
        errorMsg = '未检测到语音，请重试';
        break;
      case 'audio-capture':
        errorMsg = '无法访问麦克风\n\n请检查：\n• 麦克风是否已连接\n• 其他程序是否正在使用麦克风';
        break;
      default:
        errorMsg = '识别失败，请重试';
    }
    alert(errorMsg);
  };
  
  recognition.onend = function() {
    clearTimeout(timeoutId); // 清除超时
    isRecognizing = false;
    btn.classList.remove('recording');
    btn.textContent = '🎤';
  };
  
  // 启动识别
  try {
    recognition.start();
  } catch(e) {
    clearTimeout(timeoutId);
    console.error('启动失败:', e);
    alert('启动失败，请重试');
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
