import { getDeviceFingerprint } from './dist/fingerprint.js';

async function runTest() {
  const statusEl = document.getElementById('status');
  const fpEl = document.getElementById('fingerprint');

  try {
    statusEl.innerText = 'Initializing SDK and getting fingerprint...';
    console.log('Fetching fingerprint from SDK...');
    
    const fp = await getDeviceFingerprint();
    
    console.log('Success! Fingerprint:', fp);
    statusEl.innerText = 'Fingerprint successfully obtained:';
    fpEl.innerText = fp;
  } catch (error) {
    console.error('Failed to get fingerprint:', error);
    statusEl.innerText = 'Error getting fingerprint: ' + error.message;
    statusEl.style.color = 'red';
  }
}

// Run the test when the page loads
window.onload = runTest;
