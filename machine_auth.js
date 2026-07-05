// machine_auth.js - Machine Code Authorization Module
// Note: This file must be saved as UTF-8 with BOM encoding

// ============ Configuration ============
// Add authorized machine codes here (provided by author)
// Example: 'MAC-ABC123DEF456',
var AUTHORIZED_MACHINES = [
  // Add authorized machine codes here
  // To allow all machines (test mode), add: '*'
'MAC-03D4FA7C'
];

// ============ Generate Machine Code (Browser Fingerprint) ============
function generateMachineCode() {
  var components = [];

  // 1. Browser UserAgent
  components.push(navigator.userAgent || '');

  // 2. Screen Resolution
  components.push(screen.width + 'x' + screen.height);

  // 3. Timezone
  components.push(new Date().getTimezoneOffset());

  // 4. Language
  components.push(navigator.language || '');

  // 5. Platform
  components.push(navigator.platform || '');

  // 6. CPU Cores
  components.push(navigator.hardwareConcurrency || '');

  // 7. Memory (approximate)
  components.push(navigator.deviceMemory || '');

  // Concatenate and hash
  var raw = components.join('|');
  var hash = simpleHash(raw);

  // Format as machine code (e.g., MAC-ABC123DEF456)
  var machineCode = 'MAC-' + hash.toUpperCase();

  return machineCode;
}

// ============ Simple Hash Function ============
function simpleHash(str) {
  var hash = 0;
  if (str.length === 0) return hash.toString(16);

  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to hex and pad
  var hex = Math.abs(hash).toString(16).toUpperCase();
  while (hex.length < 8) {
    hex = '0' + hex;
  }

  return hex;
}

// ============ Copy to Clipboard ============
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() {
      console.log('Copied to clipboard');
    });
  } else {
    // Fallback
    var textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

// ============ Show Machine Code Prompt ============
function showMachineCodePrompt(machineCode) {
  // Copy to clipboard
  copyToClipboard(machineCode);

  // Show alert
  var message = 'Please send this machine code to the author for authorization.\n\n' +
                'Your machine code:\n' + machineCode + '\n\n' +
                '(Copied to clipboard automatically)';

  alert(message);
}

// ============ Verify Machine Code ============
function verifyMachineCode() {
  var machineCode = generateMachineCode();

  // Check if wildcard is enabled (test mode)
  if (AUTHORIZED_MACHINES.indexOf('*') !== -1) {
    console.log('Test mode: All machines allowed. Code:', machineCode);
    return true;
  }

  // Check if in authorized list
  var isAuthorized = false;
  for (var i = 0; i < AUTHORIZED_MACHINES.length; i++) {
    if (AUTHORIZED_MACHINES[i] === machineCode) {
      isAuthorized = true;
      break;
    }
  }

  if (isAuthorized) {
    console.log('Machine code verified:', machineCode);
    return true;
  } else {
    // Not authorized, show machine code
    showMachineCodePrompt(machineCode);
    return false;
  }
}

// ============ Init Authorization ============
function initMachineAuth() {
  // Ensure page is visible
  document.body.style.display = 'block';

  if (!verifyMachineCode()) {
    // Verification failed, block page
    document.body.style.display = 'none';
    document.body.innerHTML = '<div style="text-align:center;padding:50px;color:#ef4444;">' +
      '<h2>Unauthorized Device</h2>' +
      '<p>Please contact the author for authorization</p>' +
      '<button onclick="location.reload()" style="margin-top:20px;padding:10px 20px;">Refresh Page</button>' +
    '</div>';
    throw new Error('Unauthorized device');
  }

  // Verification passed, ensure page is visible
  document.body.style.display = 'block';
  console.log('Machine code verified, page unlocked');
}