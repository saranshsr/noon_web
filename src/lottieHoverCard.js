/* Hover-in / hover-out Lottie pair — state machine.
 * Two stacked players share one slot. Their hand-off frames are identical
 * (in.last === out.first, out.last === in.first), so swapping players is invisible.
 *
 *   rest ──enter──▶ in ──complete──▶ hold ──leave──▶ out ──complete──▶ rest
 *                    │ leave: queue out      ▲              │ enter: reverse out
 *                    ▼ (wave finishes first) └──reverse done┘ (back to hold)
 */
function lottieHoverCard(el, inData, outData) {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mk = function (data) {
    var box = document.createElement('div');
    box.style.cssText = 'position:absolute;inset:0;opacity:0';
    el.appendChild(box);
    return {box: box, anim: lottie.loadAnimation({container: box, renderer: 'svg', loop: false, autoplay: false, animationData: data,
      rendererSettings: {preserveAspectRatio: 'xMidYMid meet', progressiveLoad: false}})};
  };
  var A = mk(inData), B = mk(outData);
  var state = 'rest', hovered = false, pendingOut = false;
  var show = function (p) { A.box.style.opacity = p === A ? 1 : 0; B.box.style.opacity = p === B ? 1 : 0; };
  var last = function (p) { return p.anim.totalFrames - 1; };

  function playIn() { state = 'in'; pendingOut = false; show(A); A.anim.setDirection(1); A.anim.goToAndPlay(0, true); }
  function playOut(fromFrame) { state = 'out'; show(B); B.anim.setDirection(1);
    if (fromFrame == null) B.anim.goToAndPlay(0, true); else B.anim.play(); }

  A.anim.addEventListener('complete', function () {
    state = 'hold';
    if (pendingOut || !hovered) { pendingOut = false; playOut(); }
  });
  B.anim.addEventListener('complete', function () {
    if (B.anim.playDirection === -1) { state = 'hold'; if (!hovered) playOut(); return; }   // reversed back to the hover state
    state = 'rest'; A.anim.goToAndStop(0, true); show(A);                                  // finished: identical to rest frame
    if (hovered) playIn();
  });

  function enter() {
    hovered = true;
    if (reduce) { state = 'hold'; A.anim.goToAndStop(last(A), true); show(A); return; }
    if (state === 'rest') playIn();
    else if (state === 'in') pendingOut = false;
    else if (state === 'out') { state = 'reversing'; B.anim.setDirection(-1); B.anim.play(); }   // ease back into hover
  }
  function leave() {
    hovered = false;
    if (reduce) { state = 'rest'; A.anim.goToAndStop(0, true); show(A); return; }
    if (state === 'hold') playOut();
    else if (state === 'in') pendingOut = true;                                                 // let the wave finish
    else if (state === 'reversing') { state = 'out'; B.anim.setDirection(1); B.anim.play(); }
  }

  var ready = 0, onReady = function () { if (++ready === 2) { A.anim.goToAndStop(0, true); B.anim.goToAndStop(0, true); show(A); } };
  [A, B].forEach(function (p) { if (p.anim.isLoaded) onReady(); else p.anim.addEventListener('DOMLoaded', onReady); });

  var mouse = function (e) { return e.pointerType === 'mouse' || e.pointerType === 'pen'; };
  el.addEventListener('pointerenter', function (e) { if (mouse(e)) enter(); });
  el.addEventListener('pointerleave', function (e) { if (mouse(e)) leave(); });
  el.addEventListener('pointerdown', function (e) { if (!mouse(e)) { hovered ? leave() : enter(); } });   // touch: tap toggles
  el.addEventListener('focus', function () { if (el.matches(':focus-visible')) enter(); });
  el.addEventListener('blur', leave);
  return {enter: enter, leave: leave, get state() { return state; }};
}
