/* Хранитель из скруглённых объёмов: тело, лицо, плащ, шапка, питомец.
   Общие геометрии не уничтожаем вместе с одной фигурой. */
import * as THREE from 'three'

const TINTS = [0xf59e0b, 0x38bdf8, 0xf472b6, 0x4ade80]
const GEO = new Map()

function geo(key, build) {
  if (!GEO.has(key)) GEO.set(key, build())
  return GEO.get(key)
}

export function tintColor(index) {
  return TINTS[index] || TINTS[0]
}

export function makeHero(kind, look) {
  const tint = tintColor(look?.tint || 0)
  const group = new THREE.Group()
  const cloth = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.35, metalness: 0.08 })
  const skin = new THREE.MeshStandardMaterial({ color: 0xffe0c2, roughness: 0.55, metalness: 0 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.4 })
  const body = new THREE.Mesh(geo('body', () => new THREE.CapsuleGeometry(0.34, 0.55, 6, 12)), cloth)
  body.position.y = 0.95
  body.castShadow = true
  const head = new THREE.Mesh(geo('head', () => new THREE.SphereGeometry(0.32, 24, 16)), skin)
  head.position.y = 1.72
  head.castShadow = true
  const eyeGeo = geo('eye', () => new THREE.SphereGeometry(0.045, 10, 8))
  const leftEye = new THREE.Mesh(eyeGeo, dark)
  const rightEye = new THREE.Mesh(eyeGeo, dark)
  leftEye.position.set(-0.1, 1.76, 0.26)
  rightEye.position.set(0.1, 1.76, 0.26)
  const smile = new THREE.Mesh(
    geo('smile', () => new THREE.TorusGeometry(0.08, 0.018, 6, 12, Math.PI)),
    new THREE.MeshStandardMaterial({ color: 0x9f1239, roughness: 0.4 })
  )
  smile.position.set(0, 1.62, 0.28)
  smile.rotation.z = Math.PI
  const armGeo = geo('arm', () => new THREE.CapsuleGeometry(0.08, 0.28, 4, 8))
  const leftArm = new THREE.Mesh(armGeo, cloth)
  const rightArm = new THREE.Mesh(armGeo, cloth)
  leftArm.position.set(-0.48, 1.05, 0)
  rightArm.position.set(0.48, 1.05, 0)
  leftArm.castShadow = rightArm.castShadow = true
  const legGeo = geo('leg', () => new THREE.CapsuleGeometry(0.1, 0.28, 4, 8))
  const leftLeg = new THREE.Mesh(legGeo, dark)
  const rightLeg = new THREE.Mesh(legGeo, dark)
  leftLeg.position.set(-0.16, 0.32, 0)
  rightLeg.position.set(0.16, 0.32, 0)
  group.add(body, head, leftEye, rightEye, smile, leftArm, rightArm, leftLeg, rightLeg)
  addEars(group, kind, cloth, skin)
  addHat(group, look?.hat || 'none', cloth)
  addCape(group, look?.cape || 'none', tint)
  group.userData = {
    kind,
    body,
    leftEye,
    rightEye,
    rightArm,
    baseY: 0,
    hop: 0,
    wave: 0
  }
  return group
}

function addEars(group, kind, cloth, skin) {
  if (kind === 'rys') {
    const ear = geo('ear', () => new THREE.ConeGeometry(0.1, 0.28, 8))
    const left = new THREE.Mesh(ear, cloth)
    const right = new THREE.Mesh(ear, cloth)
    left.position.set(-0.18, 2.05, 0)
    right.position.set(0.18, 2.05, 0)
    group.add(left, right)
  } else if (kind === 'misha') {
    const ear = geo('round-ear', () => new THREE.SphereGeometry(0.12, 12, 10))
    const left = new THREE.Mesh(ear, cloth)
    const right = new THREE.Mesh(ear, cloth)
    left.position.set(-0.28, 1.95, 0)
    right.position.set(0.28, 1.95, 0)
    group.add(left, right)
  } else if (kind === 'chizh') {
    const wing = geo('wing', () => new THREE.CapsuleGeometry(0.08, 0.34, 4, 8))
    const left = new THREE.Mesh(wing, cloth)
    const right = new THREE.Mesh(wing, cloth)
    left.position.set(-0.42, 1.15, -0.1)
    right.position.set(0.42, 1.15, -0.1)
    left.rotation.z = 0.8
    right.rotation.z = -0.8
    group.add(left, right)
  } else {
    const star = new THREE.Mesh(
      geo('star', () => new THREE.OctahedronGeometry(0.12, 0)),
      new THREE.MeshStandardMaterial({ color: 0xfde68a, emissive: 0xfbbf24, emissiveIntensity: 0.6, roughness: 0.3 })
    )
    star.position.y = 2.08
    group.add(star)
  }
  const nose = new THREE.Mesh(geo('nose', () => new THREE.SphereGeometry(0.04, 8, 8)), skin)
  nose.position.set(0, 1.68, 0.3)
  group.add(nose)
}

function addHat(group, hat, cloth) {
  if (hat === 'none') return
  if (hat === 'crown') {
    const crown = new THREE.Mesh(
      geo('crown', () => new THREE.CylinderGeometry(0.2, 0.24, 0.16, 6)),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.6, roughness: 0.25, emissive: 0xf59e0b, emissiveIntensity: 0.2 })
    )
    crown.position.y = 2.05
    group.add(crown)
    return
  }
  if (hat === 'helm') {
    const helm = new THREE.Mesh(
      geo('helm', () => new THREE.SphereGeometry(0.36, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2)),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.2 })
    )
    helm.position.y = 1.78
    group.add(helm)
    return
  }
  const cap = new THREE.Mesh(geo('cap', () => new THREE.CapsuleGeometry(0.18, 0.16, 4, 8)), cloth)
  cap.rotation.z = Math.PI / 2
  cap.position.set(0.08, 2.0, 0.08)
  group.add(cap)
}

function addCape(group, cape, tint) {
  if (cape === 'none') return
  const height = cape === 'long' ? 1.15 : 0.62
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, height),
    new THREE.MeshStandardMaterial({
      color: tint,
      roughness: 0.6,
      side: THREE.DoubleSide,
      emissive: tint,
      emissiveIntensity: 0.08
    })
  )
  mesh.position.set(0, 1.15 - (cape === 'long' ? 0.15 : 0), -0.28)
  group.add(mesh)
  group.userData.cape = mesh
}

export function makePet(kind) {
  const group = new THREE.Group()
  if (kind === 'owl') {
    const body = new THREE.Mesh(
      geo('owl', () => new THREE.SphereGeometry(0.22, 16, 12)),
      new THREE.MeshStandardMaterial({ color: 0xddd6fe, roughness: 0.5 })
    )
    const eye = new THREE.Mesh(geo('eye', () => new THREE.SphereGeometry(0.045, 10, 8)), new THREE.MeshStandardMaterial({ color: 0x1e1b4b }))
    const eye2 = eye.clone()
    eye.position.set(-0.08, 0.05, 0.18)
    eye2.position.set(0.08, 0.05, 0.18)
    group.add(body, eye, eye2)
  } else if (kind === 'hedge') {
    const body = new THREE.Mesh(
      geo('hedge', () => new THREE.DodecahedronGeometry(0.24, 0)),
      new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.7 })
    )
    group.add(body)
  } else {
    const body = new THREE.Mesh(
      geo('fly', () => new THREE.CapsuleGeometry(0.08, 0.18, 4, 8)),
      new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xfacc15, emissiveIntensity: 0.8, roughness: 0.3 })
    )
    group.add(body)
  }
  return group
}

export function tickHero(group, time, active) {
  const data = group.userData
  const bob = Math.sin(time * 2 + group.position.x) * 0.03
  const hop = data.hop > time ? Math.abs(Math.sin((data.hop - time) * 10)) * 0.45 : 0
  group.position.y = data.baseY + bob + hop
  data.body.scale.y = 1 + Math.sin(time * 2.4) * 0.03
  const blink = Math.sin(time * 1.7 + group.position.x) > 0.97
  data.leftEye.scale.y = blink ? 0.15 : 1
  data.rightEye.scale.y = blink ? 0.15 : 1
  if (data.wave > time) data.rightArm.rotation.z = -0.8 + Math.sin(time * 12) * 0.6
  else data.rightArm.rotation.z = active ? Math.sin(time * 2) * 0.15 : 0
  if (data.cape) data.cape.rotation.x = Math.sin(time * 3) * 0.08
  group.rotation.y += active ? 0.01 : 0.004
}

export function cheer(group) {
  group.userData.hop = performance.now() / 1000 + 0.8
  group.userData.wave = performance.now() / 1000 + 1.2
}
