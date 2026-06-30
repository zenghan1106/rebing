// machine_auth_v2.js - 增强版机器码授权（自动记忆）
// 特性：首次验证后自动记忆，永久免验证
// 编码：UTF-8 with BOM

// ============ 配置 ============
// 已授权的机器码列表（由作者提供）
var AUTHORIZED_MACHINES = [
  'MAC-3A7F9C2D',  // 示例：已授权的设备
  'MAC-36D49C42',  // 示例：已授权的设备
  'MAC-03D4FA7C',  // 示例：已授权的设备
  'MAC-535BE5EA',  // 示例：已授权的设备
'MAC-39B2D393',  // 示例：已授权的设备
  'MAC-0FA277E5',  // 示例：已授权的设备
  'MAC-4E791BA9',  // 示例：已授权的设备
  'MAC-5730E878',  // 示例：已授权的设备
  'MAC-7BAE41AD',  // 示例：已授权的设备
  'MAC-50CB2435',  // 示例：已授权的设备
 'MAC-09BA3666',  // 示例：已授权的设备 
 'MAC-78DB330B',  // 示例：已授权的设备 
 'MAC-1896257B',  // 示例：已授权的设备 
 'MAC-1ADC7868',  // 示例：已授权的设备 
 'MAC-5A503514',  // 示例：已授权的设备 
 'MAC-7BAE41AD',  // 示例：已授权的设备 
 'MAC-2EB29732',  // 示例：已授权的设备 
 'MAC-5A7015E2',  // 示例：已授权的设备
 'MAC-2EB29732',  // 示例：已授权的设备
 'MAC-06AFAD22',  // 示例：已授权的设备
 'MAC-5A7015E2',  // 示例：已授权的设备
 'MAC-02EBA54B',  // 示例：已授权的设备
  // 在此添加更多已授权设备...
];

// 授权存储 Key（修改这个值会让所有用户重新验证）
var AUTH_STORAGE_KEY = 'rebing_machine_auth_v1';

// 授权有效期（天），0 = 永久
var AUTH_EXPIRE_DAYS = 0;

// 加密密钥（用于简单加密 localStorage）
var ENCRYPT_KEY = 'ReBing2024SecureKey';

// ============ 设备指纹（多重特征）============
function generateDeviceFingerprint() {
  var fp = [];

  // 1. 浏览器信息
  fp.push('UA:' + navigator.userAgent);

  // 2. 屏幕信息
  fp.push('SCR:' + screen.width + 'x' + screen.height + 'x' + screen.colorDepth);

  // 3. 时区
  fp.push('TZ:' + new Date().getTimezoneOffset());

  // 4. 语言
  fp.push('LANG:' + (navigator.language || ''));

  // 5. 平台
  fp.push('PLAT:' + (navigator.platform || ''));

  // 6. CPU 核心数
  fp.push('CPU:' + (navigator.hardwareConcurrency || ''));

  // 7. 内存
  fp.push('MEM:' + (navigator.deviceMemory || ''));

  // 8. 触摸屏
  fp.push('TOUCH:' + (navigator.maxTouchPoints || 0));

  // 9. Cookie 启用
  fp.push('CK:' + navigator.cookieEnabled);

  // 10. WebGL 渲染器
  try {
    var canvas = document.createElement('canvas');
    var gl = canvas.getContext('webgl');
    if (gl) {
      var ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        fp.push('GL:' + gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
      }
    }
  } catch (e) {}

  return fp.join('|');
}

// ============ 生成机器码 ============
function generateMachineCode() {
  var fp = generateDeviceFingerprint();
  var hash = simpleHash(fp);
  return 'MAC-' + hash.toUpperCase();
}

// ============ 简单哈希 ============
function simpleHash(str) {
  var hash = 0;
  if (str.length === 0) return hash.toString(16);

  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  var hex = Math.abs(hash).toString(16).toUpperCase();
  while (hex.length < 8) {
    hex = '0' + hex;
  }
  return hex;
}

// ============ 简单加密（XOR + Base64）============
function encryptData(data, key) {
  var result = '';
  for (var i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(unescape(encodeURIComponent(result)));
}

function decryptData(data, key) {
  try {
    var text = decodeURIComponent(escape(atob(data)));
    var result = '';
    for (var i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch (e) {
    return null;
  }
}

// ============ 保存授权到 localStorage ============
function saveAuthorization(machineCode, fingerprint) {
  var authData = {
    code: machineCode,
    fp: fingerprint,
    time: Date.now(),
    ua: navigator.userAgent.substring(0, 100)
  };

  var encrypted = encryptData(JSON.stringify(authData), ENCRYPT_KEY);

  try {
    localStorage.setItem(AUTH_STORAGE_KEY, encrypted);
    console.log('授权信息已保存到本地存储');
    return true;
  } catch (e) {
    console.error('保存授权失败:', e);
    return false;
  }
}

// ============ 从 localStorage 读取授权 ============
function loadAuthorization() {
  try {
    var encrypted = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!encrypted) return null;

    var decrypted = decryptData(encrypted, ENCRYPT_KEY);
    if (!decrypted) return null;

    return JSON.parse(decrypted);
  } catch (e) {
    console.error('读取授权失败:', e);
    return null;
  }
}

// ============ 检查是否过期 ============
function isAuthExpired(authTime) {
  if (AUTH_EXPIRE_DAYS === 0) return false; // 永久有效

  var expireMs = AUTH_EXPIRE_DAYS * 24 * 60 * 60 * 1000;
  return (Date.now() - authTime) > expireMs;
}

// ============ 检查授权是否有效 ============
function checkStoredAuth() {
  var auth = loadAuthorization();

  if (!auth) {
    console.log('本地无授权记录');
    return false;
  }

  if (isAuthExpired(auth.time)) {
    console.log('授权已过期');
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return false;
  }

  var currentCode = generateMachineCode();
  var currentFp = generateDeviceFingerprint();

  // 双重验证：机器码 + 设备指纹
  if (auth.code === currentCode && auth.fp === currentFp) {
    console.log('授权验证通过（已记住此设备）');
    return true;
  }

  // 机器码不匹配，可能是设备更换了
  if (auth.code !== currentCode) {
    console.log('设备指纹不匹配，需要重新验证');
  }

  return false;
}

// ============ 清除授权 ============
function clearAuthorization() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  console.log('授权已清除');
}

// ============ 验证机器码 ============
function verifyMachineCode() {
  var machineCode = generateMachineCode();

  // 测试模式
  if (AUTHORIZED_MACHINES.indexOf('*') !== -1) {
    console.log('测试模式：所有设备允许');
    return true;
  }

  // 检查授权列表
  for (var i = 0; i < AUTHORIZED_MACHINES.length; i++) {
    if (AUTHORIZED_MACHINES[i] === machineCode) {
      console.log('机器码验证通过:', machineCode);
      return true;
    }
  }

  // 未授权
  showMachineCodePrompt(machineCode);
  return false;
}

// ============ 显示机器码提示 ============
function showMachineCodePrompt(machineCode) {
  copyToClipboard(machineCode);

  var message = '请将此机器码发送给作者以获取授权：\n\n' +
                '【 ' + machineCode + ' 】\n\n' +
                '（已自动复制到剪贴板）';

  alert(message);
}

// ============ 复制到剪贴板 ============
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(function() {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  var textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } catch (e) {}
  document.body.removeChild(textarea);
}

// ============ 初始化授权 ============
function initMachineAuth() {
  // 1. 先确保页面是显示的
  document.body.style.display = 'block';

  // 2. 检查本地是否已有授权记录
  if (checkStoredAuth()) {
    console.log('✓ 已授权设备，自动放行');
    return true;
  }

  // 3. 本地无记录，验证机器码
  if (!verifyMachineCode()) {
    // 验证失败
    document.body.style.display = 'none';
    document.body.innerHTML = '<div style="text-align:center;padding:50px;color:#ef4444;">' +
      '<h2>❌ 未授权设备</h2>' +
      '<p>请联系作者获取授权</p>' +
      '<button onclick="location.reload()" style="margin-top:20px;padding:10px 20px;background:#0ea5e9;color:white;border:none;border-radius:5px;cursor:pointer;">🔄 刷新页面</button>' +
      '<br><button onclick="clearAuthAndReload()" style="margin-top:10px;padding:8px 16px;background:#64748b;color:white;border:none;border-radius:5px;cursor:pointer;">🔓 清除授权重新验证</button>' +
    '</div>';
    throw new Error('未授权设备');
  }

  // 4. 验证通过，保存到本地（下次自动通过）
  var machineCode = generateMachineCode();
  var fingerprint = generateDeviceFingerprint();
  saveAuthorization(machineCode, fingerprint);

  console.log('✓ 首次验证通过，已记住此设备');
  return true;
}

// ============ 清除授权工具函数 ============
function clearAuthAndReload() {
  if (confirm('确定要清除本地授权记录吗？\n清除后需要重新验证。')) {
    clearAuthorization();
    location.reload();
  }
}

// ============ 调试工具（可选）============
// 在控制台输入以下命令可以查看信息：
// showMyInfo() - 显示当前设备信息
// clearMyAuth() - 清除授权
function showMyInfo() {
  console.log('========== 设备信息 ==========');
  console.log('机器码:', generateMachineCode());
  console.log('设备指纹:', generateDeviceFingerprint());
  console.log('授权记录:', loadAuthorization());
  console.log('==============================');
}

function clearMyAuth() {
  clearAuthorization();
  console.log('授权已清除，请刷新页面');
}
