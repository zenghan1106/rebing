// auth.js - 通用密码验证模块（修订版）
// 适用于所有本地HTML页面
// 功能：正确解密key.txt + 一次验证全目录通行

// ============ 配置 ============
var STORAGE_KEY = 'rebing_auth_status'; // localStorage的key
var STORAGE_EXPIRE = 24 * 60 * 60 * 1000; // 1天（毫秒）
var PASSWORD_FILE = 'key.txt'; // 密码文件路径

// ============ 解密函数 ============
function decryptPassword(encrypted) {
  try {
    // 1. 反转字符串
    var reversed = encrypted.split('').reverse().join('');
    
    // 2. Base64解码
    var decoded = atob(reversed);
    
    return decoded;
  } catch(e) {
    console.error('解密失败：', e);
    return null;
  }
}

// ============ 读取并验证密码 ============
function verifyPassword(inputPwd) {
  try {
    // 读取key.txt（同步请求）
    var xhr = new XMLHttpRequest();
    xhr.open('GET', PASSWORD_FILE, false);
    xhr.send(null);
    
    if (xhr.status !== 200) {
      console.error('读取密码文件失败');
      return false;
    }
    
    var encrypted = xhr.responseText.trim();
    var correctPwd = decryptPassword(encrypted);
    
    if (!correctPwd) {
      console.error('解密密码失败');
      return false;
    }
    
    // 验证密码
    return inputPwd === correctPwd;
    
  } catch(e) {
    console.error('验证过程出错：', e);
    // 如果读取失败，使用默认密码1989
    return inputPwd === '1989';
  }
}

// ============ 设置登录状态 ============
function setAuth() {
  var authData = {
    status: 'logged',
    timestamp: Date.now()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
}

// ============ 检查登录状态 ============
function checkAuth() {
  // 1. 检查localStorage
  var authDataStr = localStorage.getItem(STORAGE_KEY);
  
  if (authDataStr) {
    try {
      var authData = JSON.parse(authDataStr);
      
      // 检查是否过期
      if (authData.status === 'logged' && 
          (Date.now() - authData.timestamp) < STORAGE_EXPIRE) {
        console.log('登录状态有效');
        return true;
      } else {
        // 过期，清除
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch(e) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  
  // 2. 未登录，弹出密码框
  var pwd = prompt('请输入访问密码：', '');
  
  if (!pwd) {
    // 用户取消输入
    document.body.innerHTML = '<div style="text-align:center;padding:50px;color:#ef4444;"><h2>需要密码才能访问</h2><p>请刷新页面重新输入密码</p></div>';
    return false;
  }
  
  // 3. 验证密码
  if (verifyPassword(pwd)) {
    setAuth();
    alert('登录成功！\n\n✓ 1天内无需重复登录\n✓ 同目录下所有网页自动通行');
    return true;
  } else {
    document.body.innerHTML = '<div style="text-align:center;padding:50px;color:#ef4444;"><h2>密码错误</h2><p>无法访问此页面</p></div>';
    return false;
  }
}

// ============ 退出登录 ============
function logout() {
  localStorage.removeItem(STORAGE_KEY);
  alert('已退出登录');
  location.reload();
}

// ============ 自动验证（页面加载时调用）============
function initAuth() {
  if (!checkAuth()) {
    // 验证失败，阻止页面显示
    document.body.style.display = 'none';
    throw new Error('未授权访问');
  }
}

// ============ 页面加载时自动验证 ============
window.addEventListener('load', function() {
  try {
    initAuth();
  } catch(e) {
    console.log('验证失败', e);
  }
});
