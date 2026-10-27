/**
 * YouTube Premium × noon — promo card with three hover choreographies.
 *
 * Built for React Native + React Native Web:
 *  - motion: RN core `Animated` springs (retargetable — interrupting a hover continues
 *    from the current position *and* velocity, so hover-in/out never snaps)
 *  - shapes: react-native-svg, geometry 1:1 from Figma (see geometry.ts)
 *  - input: Pressable onHoverIn/onHoverOut (web mouse), onPressIn/onPressOut (touch),
 *    View pointer events for the Magnetic field (web + RN ≥ 0.71 pointer events)
 *
 * View-only values (translate / scale / rotate / opacity on <Animated.View>) use the native
 * driver on device; values that drive SVG props use the JS driver (required by react-native-svg).
 */
import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import Svg, {ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop} from 'react-native-svg';
import {BOTTOM_ROW, CARD, HERO_GRADIENT, ICONS, IconKey, LOGO, TILE, TOP_ROW, TileDef} from './geometry';

export type HoverVariant = 'spotlight' | 'ripple' | 'magnet';

const AG = Animated.createAnimatedComponent(G);
const NATIVE = Platform.OS !== 'web';
const TW = TILE.width, TH = TILE.height;
const LIGHT = '#FFE5EB';
const HALO_PAD_X = 46, HALO_PAD_Y = 40, HALO_W = TW + HALO_PAD_X * 2, HALO_H = TH + HALO_PAD_Y * 2;

/* ------------------------------------------------------------------ motion primitives */

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled?.().then(v => { reduceMotion = !!v; }).catch(() => {});

/** Spring described like UIKit/SwiftUI: response (s) and damping ratio (ζ). */
function spring(v: Animated.Value, toValue: number, response = 0.5, zeta = 0.85, native = NATIVE, velocity?: number) {
  return Animated.spring(v, {
    toValue, velocity, useNativeDriver: native, mass: 1,
    stiffness: (2 * Math.PI / response) ** 2, damping: (4 * Math.PI * zeta) / response,
    restDisplacementThreshold: 0.001, restSpeedThreshold: 0.01,
  });
}
const go = (v: Animated.Value, to: number, r?: number, z?: number, native?: boolean) =>
  reduceMotion ? v.setValue(to) : spring(v, to, r, z, native).start();
const kick = (v: Animated.Value, rest: number, velocity: number, r = 0.5, z = 0.35, native = NATIVE) => {
  if (!reduceMotion) spring(v, rest, r, z, native, velocity).start();
};
const tween = (v: Animated.Value, toValue: number, duration: number, easing = Easing.out(Easing.cubic), native = NATIVE) =>
  Animated.timing(v, {toValue, duration, easing, useNativeDriver: native});
const deg = (v: Animated.Value) => v.interpolate({inputRange: [-360, 360], outputRange: ['-360deg', '360deg']});

/* ------------------------------------------------------------------ tile model */

type Tile = {
  key: string; icon: IconKey; hero: boolean; row: 0 | 1; col: number;
  x: number; y: number; cx: number; cy: number; strokeOpacity: number; strokeWidth: number;
  // tile body (view)
  tx: Animated.Value; ty: Animated.Value; sc: Animated.Value; op: Animated.Value; lit: Animated.Value; edge: Animated.Value;
  // icon (view)
  ix: Animated.Value; iy: Animated.Value; ir: Animated.Value; is: Animated.Value; isy: Animated.Value; glow: Animated.Value;
  // svg-driven
  arm: Animated.Value; parts: Animated.Value[]; dot: Animated.Value;
  // hero extras (view)
  halo: Animated.Value; drift: Animated.Value;
  timers: ReturnType<typeof setTimeout>[];
};

function makeTiles(): Tile[] {
  const V = (n = 0) => new Animated.Value(n);
  const mk = (row: 0 | 1) => ([x, y, icon, sa, sw]: TileDef, col: number): Tile => ({
    key: `${row}-${col}`, icon, hero: icon === 'film', row, col, x, y, cx: x + TW / 2, cy: y + TH / 2,
    strokeOpacity: sa ?? 0, strokeWidth: sw,
    tx: V(), ty: V(), sc: V(1), op: V(1), lit: V(), edge: V(),
    ix: V(), iy: V(), ir: V(), is: V(1), isy: V(1), glow: V(),
    arm: V(), parts: [V(), V(), V(), V(), V()], dot: V(1),
    halo: V(), drift: V(), timers: [],
  });
  return [...TOP_ROW.map(mk(0)), ...BOTTOM_ROW.map(mk(1))];
}

/* ------------------------------------------------------------------ icon signatures
 * Each icon has its own small, physical move: anticipation → action → settle.
 * They're one-shots that always end at rest, so leaving mid-move is still seamless. */

const PIVOT: Record<IconKey, [number, number]> = {
  film: [26, 44], cap: [26, 40], music: [11, 45], bulb: [20.6, 51], vr: [25.8, 28],
  note: [20.6, 51], live: [25.8, 13], game: [25.8, 39], bag: [20.5, 1],
};

function play(t: Tile, strength = 1) {
  if (reduceMotion) return;
  const s = strength;
  const seq = (...a: Animated.CompositeAnimation[]) => Animated.sequence(a).start();
  switch (t.icon) {
    case 'film': // clapper: arm lifts with a little anticipation, snaps shut, body takes the impact
      seq(tween(t.arm, -27 * s, 170, Easing.out(Easing.quad), false), spring(t.arm, 0, 0.26, 0.42, false));
      t.timers.push(setTimeout(() => { kick(t.isy, 1, -1.5 * s, 0.4, 0.4); kick(t.iy, 0, 40 * s, 0.4, 0.5); }, 200));
      break;
    case 'cap': // toss: crouch, fly up with a tilt, land with a soft squash
      seq(tween(t.isy, 0.9, 90), spring(t.isy, 1, 0.35, 0.5));
      seq(Animated.delay(80), tween(t.iy, -13 * s, 230, Easing.out(Easing.cubic)), spring(t.iy, 0, 0.42, 0.55));
      seq(Animated.delay(80), tween(t.ir, -14 * s, 230), spring(t.ir, 0, 0.5, 0.45));
      break;
    case 'music': // two-beat bounce, leaning into each beat
      seq(tween(t.iy, -9 * s, 150), spring(t.iy, 0, 0.3, 0.7), tween(t.iy, -5 * s, 120), spring(t.iy, 0, 0.32, 0.55));
      seq(tween(t.ir, 10 * s, 150), tween(t.ir, -7 * s, 260, Easing.inOut(Easing.quad)), spring(t.ir, 0, 0.45, 0.5));
      break;
    case 'live': { // broadcast: dot pulses, then inner and outer arcs push out in turn — twice
      const [innerL, outerR, outerL, innerR] = t.parts;
      const pulse = (d: number) => {
        seq(Animated.delay(d), tween(t.dot, 1.32, 120, Easing.out(Easing.quad), false), spring(t.dot, 1, 0.38, 0.45, false));
        [[innerL, -1], [innerR, 1]].forEach(([v, k]) => seq(Animated.delay(d + 60), tween(v as Animated.Value, 3.2 * (k as number) * s, 130, Easing.out(Easing.quad), false), spring(v as Animated.Value, 0, 0.4, 0.5, false)));
        [[outerL, -1], [outerR, 1]].forEach(([v, k]) => seq(Animated.delay(d + 130), tween(v as Animated.Value, 4.2 * (k as number) * s, 140, Easing.out(Easing.quad), false), spring(v as Animated.Value, 0, 0.45, 0.5, false)));
      };
      pulse(0); pulse(420);
      break;
    }
    case 'game': // hop + rumble
      seq(tween(t.iy, -6 * s, 120), spring(t.iy, 0, 0.36, 0.6));
      kick(t.ir, 0, 260 * s, 0.32, 0.22);
      break;
    case 'bag': // pendulum swing from the handle, lifted slightly
      seq(tween(t.iy, -4 * s, 140), spring(t.iy, 0, 0.5, 0.7));
      kick(t.ir, 0, 170 * s, 0.7, 0.2);
      break;
    case 'bulb': // switches on: pop, flicker, warm glow
      kick(t.is, 1, 1.6 * s, 0.4, 0.4);
      seq(tween(t.glow, 0.7, 70), tween(t.glow, 0.35, 70), tween(t.glow, 1, 160));
      t.timers.push(setTimeout(() => { if (!(t as any).holdGlow) tween(t.glow, 0, 520, Easing.inOut(Easing.quad)).start(); }, 900));
      break;
    case 'vr': // looks around: left, right, centre
      seq(tween(t.ix, -4.5 * s, 170, Easing.inOut(Easing.quad)), tween(t.ix, 4.5 * s, 260, Easing.inOut(Easing.quad)), spring(t.ix, 0, 0.45, 0.6));
      seq(tween(t.ir, -5 * s, 170), tween(t.ir, 5 * s, 260), spring(t.ir, 0, 0.45, 0.6));
      break;
    case 'note': // flip-wobble
      seq(tween(t.iy, -7 * s, 150), spring(t.iy, 0, 0.4, 0.5));
      seq(tween(t.ir, -16 * s, 150), spring(t.ir, 0, 0.5, 0.35));
      break;
  }
}

function settle(t: Tile) {
  t.timers.forEach(clearTimeout); t.timers = [];
  go(t.tx, 0); go(t.ty, 0); go(t.sc, 1); go(t.op, 1); go(t.lit, 0, 0.4, 1); go(t.edge, 0, 0.4, 1);
}

/* ------------------------------------------------------------------ choreographies */

type Ctl = { enter(): void; leave(): void; move?(x: number, y: number): void };

function spotlight(tiles: Tile[]): Ctl {
  const hero = tiles.find(t => t.hero)!;
  const heroCol = hero.col;
  let loop: Animated.CompositeAnimation | null = null;
  return {
    enter() {
      // hero: grows and lifts into a soft glow; gradient + slow shimmer drift
      go(hero.sc, 1.12, 0.55, 0.78); go(hero.ty, -3, 0.55, 0.8); go(hero.lit, 1, 0.45, 1); go(hero.halo, 1, 0.6, 1);
      loop?.stop();
      if (!reduceMotion) {
        loop = Animated.loop(Animated.sequence([tween(hero.drift, 1, 2100, Easing.inOut(Easing.sin)), tween(hero.drift, 0, 2100, Easing.inOut(Easing.sin))]));
        loop.start();
      }
      hero.timers.push(setTimeout(() => play(hero), 110));
      // everyone else steps back evenly, keeping the rhythm of the grid:
      // top row opens symmetric gaps around the hero, bottom row drops and parts under it
      for (const t of tiles) {
        if (t.hero) continue;
        let dx: number, dy: number, delay: number;
        if (t.row === 0) {
          const d = t.col - heroCol, n = Math.abs(d);
          dx = Math.sign(d) * (n === 1 ? 16 : 30); dy = 0; delay = (n - 1) * 35;
        } else {
          const rel = t.cx - hero.cx;
          dx = Math.sign(rel) * (Math.abs(rel) < 120 ? 12 : 22); dy = 9; delay = 40 + (Math.abs(rel) < 120 ? 0 : 35);
        }
        t.timers.forEach(clearTimeout);
        t.timers = [setTimeout(() => { go(t.tx, dx, 0.55, 0.85); go(t.ty, dy, 0.55, 0.85); go(t.sc, 0.95, 0.55, 0.85); go(t.op, 0.82, 0.5, 1); }, reduceMotion ? 0 : delay)];
      }
    },
    leave() {
      loop?.stop(); loop = null;
      go(hero.drift, 0, 0.6, 1); go(hero.halo, 0, 0.45, 1);
      tiles.forEach(settle);
    },
  };
}

function ripple(tiles: Tile[], logo: {y: Animated.Value; s: Animated.Value}): Ctl {
  const hero = tiles.find(t => t.hero)!;
  const SPEED = 0.62;      // px per ms — front crosses the card in ~⅔ s
  const IMPACT = 190;      // ms — the clapper arm snaps shut here; the wave is born on impact
  const ECHO = 340;        // ms — a softer second ring follows the first
  let lastWave = -1e9, loop: Animated.CompositeAnimation | null = null;

  // one ring passing a tile: pushed outward along the wave, lifted, outline lights up, then settles back
  const ring = (t: Tile, ux: number, uy: number, amp: number, withIcon: boolean) => {
    const out = 7 * amp;
    Animated.sequence([tween(t.tx, ux * out, 170, Easing.out(Easing.cubic)), spring(t.tx, 0, 0.6, 0.55)]).start();
    Animated.sequence([tween(t.ty, uy * out - 4 * amp, 170, Easing.out(Easing.cubic)), spring(t.ty, 0, 0.6, 0.55)]).start();
    Animated.sequence([tween(t.sc, 1 + 0.035 * amp, 170, Easing.out(Easing.quad)), spring(t.sc, 1, 0.6, 0.6)]).start();
    Animated.sequence([tween(t.edge, 0.8 * amp, 140, Easing.out(Easing.quad)), tween(t.edge, 0, 620, Easing.inOut(Easing.quad))]).start();
    Animated.sequence([tween(t.lit, 0.08 * amp, 140), tween(t.lit, 0, 520, Easing.inOut(Easing.quad))]).start();
    if (withIcon) play(t, 0.85);
  };

  return {
    enter() {
      // hero: fills with the gradient and keeps a slow shimmer while you stay
      go(hero.lit, 1, 0.45, 1);
      loop?.stop();
      if (!reduceMotion) {
        loop = Animated.loop(Animated.sequence([tween(hero.drift, 1, 2100, Easing.inOut(Easing.sin)), tween(hero.drift, 0, 2100, Easing.inOut(Easing.sin))]));
        loop.start();
      }
      // don't re-fire the wave on a quick out-and-back-in
      const now = Date.now();
      if (now - lastWave < 900 || reduceMotion) return;
      lastWave = now;

      // the drop: hero presses in while the clapper lifts, then springs back on the clap
      play(hero);
      Animated.sequence([tween(hero.sc, 0.95, IMPACT - 20, Easing.out(Easing.quad)), spring(hero.sc, 1, 0.42, 0.42, NATIVE, 1.4)]).start();

      for (const t of tiles) {
        if (t.hero) continue;
        const dx = t.cx - hero.cx, dy = t.cy - hero.cy, d = Math.hypot(dx, dy) || 1;
        const ux = dx / d, uy = dy / d;
        const arrive = IMPACT + d / SPEED;
        // energy falls off with distance, like a real ripple
        const amp = Math.max(0.55, Math.min(1, 1.18 - d / 520));
        t.timers.forEach(clearTimeout);
        t.timers = [
          setTimeout(() => ring(t, ux, uy, amp, true), arrive),
          setTimeout(() => ring(t, ux, uy, 0.38 * amp, false), arrive + ECHO),
        ];
      }

      // impact: a soft glow pulses under the play tile on the clap
      hero.timers.forEach(clearTimeout);
      hero.timers = [setTimeout(() => {
        Animated.sequence([tween(hero.halo, 0.85, 110, Easing.out(Easing.quad)), tween(hero.halo, 0, 760, Easing.inOut(Easing.quad))]).start();
      }, IMPACT - 30)];

      // the wave reaches the YouTube Premium lockup last — it lifts and settles
      const ld = Math.hypot(LOGO.x + LOGO.width / 2 - hero.cx, LOGO.y + LOGO.height / 2 - CARD.tilesTop - hero.cy);
      hero.timers.push(setTimeout(() => {
        Animated.sequence([tween(logo.y, -3, 160, Easing.out(Easing.cubic)), spring(logo.y, 0, 0.55, 0.5)]).start();
        Animated.sequence([tween(logo.s, 1.04, 160, Easing.out(Easing.quad)), spring(logo.s, 1, 0.55, 0.5)]).start();
      }, IMPACT + ld / SPEED));
    },
    leave() {
      loop?.stop(); loop = null;
      go(hero.drift, 0, 0.6, 1); go(hero.halo, 0, 0.45, 1);
      go(logo.y, 0, 0.5, 0.9); go(logo.s, 1, 0.5, 0.9);
      tiles.forEach(settle);
    },
  };
}

function magnet(tiles: Tile[], layer: {x: Animated.Value; y: Animated.Value}): Ctl {
  const hero = tiles.find(t => t.hero)!;
  const rows = [tiles.filter(t => t.row === 0), tiles.filter(t => t.row === 1)];
  const ROW_CY = [TOP_ROW[0][1] + TH / 2, BOTTOM_ROW[0][1] + TH / 2];
  const HOT = 1.08, MIN_GAP = 9, A = 14, SIGMA = 90;
  const centres = new Map<Tile, number>(tiles.map(t => [t, t.cx]));
  let hot: Tile | null = null, loop: Animated.CompositeAnimation | null = null;

  // smooth, odd push away from the cursor along the row (peaks at ±σ)
  const field = (u: number) => (u / SIGMA) * Math.exp(0.5 - (u * u) / (2 * SIGMA * SIGMA));

  const layout = (mx: number, my: number, inside: boolean) => {
    // which tile is under the cursor (hit-test against where tiles are heading)
    let over: Tile | null = null;
    if (inside) for (const t of tiles) {
      const c = centres.get(t)!, dy = t.row === 1 && hot && hot.row === 0 ? 4 : t.row === 0 && hot && hot.row === 1 ? -4 : 0;
      if (Math.abs(mx - c) < TW / 2 && Math.abs(my - (t.cy + dy)) < TH / 2) { over = t; break; }
    }
    if (over !== hot) {
      if (hot && hot.icon === 'bulb') { (hot as any).holdGlow = false; tween(hot.glow, 0, 420, Easing.inOut(Easing.quad)).start(); }
      if (over) { (over as any).holdGlow = true; play(over, 0.85); }
      hot = over;
    }
    rows.forEach((row, r) => {
      const weight = inside ? Math.exp(-((my - ROW_CY[r]) ** 2) / (2 * 70 * 70)) : 0;
      const scale = row.map(t => (t === hot ? HOT : 1));
      const c = row.map(t => t.cx + (inside ? A * weight * field(t.cx - mx) : 0));
      // never let neighbours overlap: relax outward from the tile nearest the cursor
      let a = 0, best = Infinity;
      row.forEach((t, i) => { const d = Math.abs(t.cx - mx); if (d < best) { best = d; a = i; } });
      for (let i = a + 1; i < row.length; i++) c[i] = Math.max(c[i], c[i - 1] + (TW * (scale[i - 1] + scale[i])) / 2 + MIN_GAP);
      for (let i = a - 1; i >= 0; i--) c[i] = Math.min(c[i], c[i + 1] - (TW * (scale[i + 1] + scale[i])) / 2 - MIN_GAP);
      row.forEach((t, i) => {
        centres.set(t, c[i]);
        go(t.tx, c[i] - t.cx, 0.42, 0.9);
        go(t.ty, hot && hot.row !== r ? (r === 1 ? 4 : -4) : 0, 0.42, 0.9);
        go(t.sc, scale[i], 0.38, 0.72);
        go(t.lit, t.hero ? (inside ? 1 : 0) : t === hot ? 1 : 0, 0.32, 1);
      });
    });
    go(layer.x, inside ? (CARD.width / 2 - mx) * 0.02 : 0, 0.6, 1);
    go(layer.y, inside ? (113 - my) * 0.02 : 0, 0.6, 1);
  };

  return {
    enter() {
      loop?.stop();
      if (!reduceMotion) {
        loop = Animated.loop(Animated.sequence([tween(hero.drift, 1, 2100, Easing.inOut(Easing.sin)), tween(hero.drift, 0, 2100, Easing.inOut(Easing.sin))]));
        loop.start();
      }
    },
    move(x, y) { layout(x, y, true); },
    leave() {
      loop?.stop(); loop = null; go(hero.drift, 0, 0.6, 1);
      layout(0, 0, false);
      tiles.forEach(t => { t.timers.forEach(clearTimeout); t.timers = []; });
    },
  };
}

/* ------------------------------------------------------------------ rendering */

const tileClip = (id: string) => (
  <ClipPath id={id}><Path d={TILE.d} /></ClipPath>
);

function heroGradient(id: string, off = 0) {
  const dx = (HERO_GRADIENT.x2 - HERO_GRADIENT.x1) * TW, dy = (HERO_GRADIENT.y2 - HERO_GRADIENT.y1) * TH;
  return (
    <LinearGradient id={id} gradientUnits="userSpaceOnUse"
      x1={TW + dx * off} y1={dy * off} x2={TW + dx * (1 + off)} y2={dy * (1 + off)}>
      <Stop offset="0" stopColor={HERO_GRADIENT.from} />
      <Stop offset="1" stopColor={HERO_GRADIENT.to} />
    </LinearGradient>
  );
}

const IconArt = React.memo(function IconArt({t, uid, fill}: {t: Tile; uid: string; fill: string}) {
  const ic = ICONS[t.icon];
  if (t.icon === 'film') {
    return (
      <Svg width={ic.w} height={ic.h} viewBox={`0 0 ${ic.w} ${ic.h}`} style={styles.visible}>
        <Defs>
          <ClipPath id={`${uid}arm`}><Rect x={-10} y={-10} width={80} height={22.35} /></ClipPath>
          <ClipPath id={`${uid}body`}><Rect x={-10} y={12.35} width={80} height={50} /></ClipPath>
        </Defs>
        <AG rotation={t.arm as any} originX={1.6} originY={12.4}>
          <Path d={ic.d} fill={fill} clipPath={`url(#${uid}arm)`} />
        </AG>
        <Path d={ic.d} fill={fill} clipPath={`url(#${uid}body)`} />
      </Svg>
    );
  }
  if (ic.parts) {
    const [innerL, outerR, outerL, innerR, dot] = ic.parts;
    const [vIL, vOR, vOL, vIR] = t.parts;
    return (
      <Svg width={ic.w} height={ic.h} viewBox={`0 0 ${ic.w} ${ic.h}`} style={styles.visible}>
        <AG x={vIL as any}><Path d={innerL} fill={fill} /></AG>
        <AG x={vIR as any}><Path d={innerR} fill={fill} /></AG>
        <AG x={vOL as any}><Path d={outerL} fill={fill} /></AG>
        <AG x={vOR as any}><Path d={outerR} fill={fill} /></AG>
        <AG scale={t.dot as any} originX={25.83} originY={13.06}><Path d={dot} fill={fill} /></AG>
      </Svg>
    );
  }
  return (
    <Svg width={ic.w} height={ic.h} viewBox={`0 0 ${ic.w} ${ic.h}`} style={styles.visible}>
      <Path d={ic.d} fill={fill} fillRule={ic.evenOdd ? 'evenodd' : 'nonzero'} />
    </Svg>
  );
});

const TileView = React.memo(function TileView({t, uid}: {t: Tile; uid: string}) {
  const ic = ICONS[t.icon];
  const [px, py] = PIVOT[t.icon];
  const iconTransform = [
    {translateX: t.ix}, {translateY: t.iy},
    {translateX: px - ic.w / 2}, {translateY: py - ic.h / 2},
    {rotate: deg(t.ir)}, {scale: t.is}, {scaleY: t.isy},
    {translateX: ic.w / 2 - px}, {translateY: ic.h / 2 - py},
  ];
  const id = `${uid}-${t.key}`;
  return (
    <Animated.View pointerEvents="none" testID={`tile-${t.key}`} style={[styles.tile, {left: t.x, top: t.y, opacity: t.op,
      transform: [{translateX: t.tx}, {translateY: t.ty}, {scale: t.sc}]}]}>
      {/* base: hero is solid #FF0033, others are an inside 2px outline */}
      <Svg width={TW} height={TH} style={StyleSheet.absoluteFill}>
        <Defs>{tileClip(`${id}clip`)}</Defs>
        {t.hero
          ? <Path d={TILE.d} fill="#FF0033" />
          : <Path d={TILE.d} fill="none" stroke="rgb(255,183,198)" strokeOpacity={t.strokeOpacity} strokeWidth={t.strokeWidth * 2} clipPath={`url(#${id}clip)`} />}
      </Svg>

      {/* the Figma gradient, exact tile shape; fades in (opacity only) */}
      <Animated.View style={[StyleSheet.absoluteFill, {opacity: t.lit}]}>
        <Svg width={TW} height={TH}><Defs>{heroGradient(`${id}g`)}</Defs><Path d={TILE.d} fill={`url(#${id}g)`} /></Svg>
      </Animated.View>

      {!t.hero && (
        // wave front: the outline briefly takes the hero's gradient
        <Animated.View style={[StyleSheet.absoluteFill, {opacity: t.edge}]}>
          <Svg width={TW} height={TH}>
            <Defs>{tileClip(`${id}eclip`)}{heroGradient(`${id}eg`)}</Defs>
            <Path d={TILE.d} fill="none" stroke={`url(#${id}eg)`} strokeWidth={4} clipPath={`url(#${id}eclip)`} />
          </Svg>
        </Animated.View>
      )}

      {t.hero && (
        <>
          {/* shimmer: cross-fades to the same gradient slid half-way along its axis */}
          <Animated.View style={[StyleSheet.absoluteFill, {opacity: Animated.multiply(t.lit, t.drift)}]}>
            <Svg width={TW} height={TH}><Defs>{heroGradient(`${id}g2`, 0.5)}</Defs><Path d={TILE.d} fill={`url(#${id}g2)`} /></Svg>
          </Animated.View>
        </>
      )}

      {/* icon */}
      <Animated.View style={{position: 'absolute', left: ic.x, top: ic.y, width: ic.w, height: ic.h, transform: iconTransform as any}}>
        {t.icon === 'bulb' && (
          <Animated.View style={[styles.glow, {opacity: t.glow}]}>
            <Svg width={90} height={90}>
              <Defs>
                <RadialGradient id={`${id}glow`} cx="50%" cy="50%" rx="50%" ry="50%">
                  <Stop offset="0" stopColor="#FFE680" stopOpacity={0.95} />
                  <Stop offset="0.45" stopColor="#FF8CC4" stopOpacity={0.45} />
                  <Stop offset="1" stopColor="#FF2791" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Ellipse cx={45} cy={45} rx={45} ry={45} fill={`url(#${id}glow)`} />
            </Svg>
          </Animated.View>
        )}
        <IconArt t={t} uid={`${id}a`} fill={t.hero ? LIGHT : ic.color} />
        {!t.hero && (
          <Animated.View style={[StyleSheet.absoluteFill, {opacity: t.lit}]}>
            <IconArt t={t} uid={`${id}b`} fill={LIGHT} />
          </Animated.View>
        )}
      </Animated.View>
    </Animated.View>
  );
});

/** Spotlight glow — its own layer under every tile, so it sits behind neighbouring icons. */
const HeroHalo = React.memo(function HeroHalo({t, uid}: {t: Tile; uid: string}) {
  const id = `${uid}-halo`;
  return (
    <Animated.View pointerEvents="none" style={{position: 'absolute', left: t.x - HALO_PAD_X, top: t.y - HALO_PAD_Y + 4,
      width: HALO_W, height: HALO_H, opacity: t.halo,
      transform: [{translateX: t.tx}, {translateY: t.ty}, {scale: t.sc}]}}>
      <Svg width={HALO_W} height={HALO_H}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
            <Stop offset="0" stopColor="#FF2791" stopOpacity={0.24} />
            <Stop offset="0.5" stopColor="#FF2791" stopOpacity={0.14} />
            <Stop offset="0.78" stopColor="#FF2791" stopOpacity={0.04} />
            <Stop offset="1" stopColor="#FF2791" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={HALO_W / 2} cy={HALO_H / 2} rx={HALO_W / 2 - 1} ry={HALO_H / 2 - 1} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
});

let uidSeq = 0;

export function YouTubePremiumCard({variant}: {variant: HoverVariant}) {
  const uid = useRef(`yp${++uidSeq}`).current;
  const tiles = useMemo(makeTiles, []);
  const layer = useMemo(() => ({x: new Animated.Value(0), y: new Animated.Value(0)}), []);
  const logo = useMemo(() => ({y: new Animated.Value(0), s: new Animated.Value(1)}), []);
  const ctl = useMemo(() => variant === 'spotlight' ? spotlight(tiles) : variant === 'ripple' ? ripple(tiles, logo) : magnet(tiles, layer), [variant, tiles, layer, logo]);
  const active = useRef(false);
  const zone = useRef<View>(null);
  const raf = useRef<number | null>(null);

  const hovered = useRef(false);
  const enter = useCallback(() => { if (!active.current) { active.current = true; ctl.enter(); } }, [ctl]);
  const leave = useCallback(() => { if (active.current) { active.current = false; ctl.leave(); } }, [ctl]);
  useEffect(() => () => { tiles.forEach(t => t.timers.forEach(clearTimeout)); }, [tiles]);

  // Magnetic: only the tile field reacts — the headline and logo are inert
  const onPointerMove = useCallback((e: any) => {
    const ne = e.nativeEvent;
    let x: number, y: number;
    const node: any = zone.current;
    if (Platform.OS === 'web' && node?.getBoundingClientRect) {
      const r = node.getBoundingClientRect(), k = r.width / CARD.width;
      x = (ne.clientX - r.left) / k; y = (ne.clientY - r.top) / k;
    } else { x = ne.locationX; y = ne.locationY; }
    if (raf.current != null) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => { raf.current = null; enter(); ctl.move?.(x, y); });
  }, [ctl, enter]);

  const field = (
    <Animated.View style={[styles.field, {transform: [{translateX: layer.x}, {translateY: layer.y}]}]} pointerEvents="none">
      {variant !== 'magnet' && <HeroHalo t={tiles.find(t => t.hero)!} uid={uid} />}
      {tiles.map(t => <TileView key={t.key} t={t} uid={uid} />)}
    </Animated.View>
  );

  const face = (
    <>
      <Text style={styles.headline} selectable={false}>{'Skip the ads,\nstream offline'}</Text>
      <Animated.View style={[styles.logo, {transform: [{translateY: logo.y}, {scale: logo.s}]}]}>
        <Svg width={LOGO.width} height={LOGO.height} viewBox={`0 0 ${LOGO.width} ${LOGO.height}`}>
          {LOGO.paths.map((p, i) => <Path key={i} d={p.d} fill={p.fill} />)}
        </Svg>
      </Animated.View>
      {field}
    </>
  );

  if (variant === 'magnet') {
    return (
      <View style={styles.card} accessibilityRole="image" accessibilityLabel="Skip the ads, stream offline. YouTube Premium">
        {face}
        <View ref={zone} style={styles.zone}
          // @ts-ignore — pointer events: react-native-web, and RN ≥ 0.71 with pointer events enabled
          onPointerMove={onPointerMove} onPointerLeave={leave} onPointerCancel={leave} />
      </View>
    );
  }
  return (
    <Pressable style={styles.card}
      onHoverIn={() => { hovered.current = true; enter(); }} onHoverOut={() => { hovered.current = false; leave(); }}
      // touch: press-and-hold previews the hover; ignored while a mouse is hovering
      onPressIn={() => { if (!hovered.current) enter(); }} onPressOut={() => { if (!hovered.current) leave(); }}
      onFocus={enter} onBlur={leave} accessibilityRole="image" accessibilityLabel="Skip the ads, stream offline. YouTube Premium">
      {face}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {width: CARD.width, height: CARD.height, borderRadius: CARD.radius, overflow: 'hidden', backgroundColor: '#FFE6EB'},
  headline: {position: 'absolute', left: 24, top: 24, width: 230, fontFamily: Platform.select({web: 'Figtree, system-ui, -apple-system, sans-serif', default: 'Figtree'}), fontWeight: '600', fontSize: 32, lineHeight: 38.4, letterSpacing: -1, color: '#000'},
  logo: {position: 'absolute', left: LOGO.x, top: LOGO.y},
  field: {position: 'absolute', left: 0, top: CARD.tilesTop, width: CARD.width, height: CARD.height - CARD.tilesTop},
  zone: {position: 'absolute', left: 0, top: CARD.tilesTop, width: CARD.width, height: CARD.height - CARD.tilesTop},
  tile: {position: 'absolute', width: TW, height: TH},
  glow: {position: 'absolute', left: 20.6 - 45, top: 22 - 45},
  visible: {overflow: 'visible'},
});
