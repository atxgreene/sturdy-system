import { VRButton } from 'three/addons/webxr/VRButton.js';

export function initVR(renderer) {
  if (!navigator.xr) return;

  navigator.xr.isSessionSupported('immersive-vr').then(supported => {
    if (!supported) return;

    const vrBtn = VRButton.createButton(renderer);
    vrBtn.id = 'vr-button';
    document.body.appendChild(vrBtn);
  });
}
