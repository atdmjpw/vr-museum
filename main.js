import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// シーン
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeeeeee);

// カメラ
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

camera.position.set(-10, 27, 80);

// レンダラー
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ライト
scene.add(new THREE.AmbientLight(0xffffff, 1.5));

const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// 操作
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = true;
controls.enablePan = false;
controls.minDistance = 8;
controls.maxDistance = 120;

controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: null
};

controls.target.set(0, 5, 0);
controls.update();

// 初期位置保存
const defaultCameraPos = camera.position.clone();
const defaultTarget = controls.target.clone();

// 管理用
const warpPoints = [];
const artClickObjects = [];
const clock = new THREE.Clock();

let currentArtKey = null;

// 作品データ
const artData = {
  click01: {
    title: "内なる光の顕現",
    text: "人間の意識の深層に潜むエネルギーを、光と有機的な構造で表現した作品。中心から放たれる光は知覚や精神性の象徴であり、外側へ広がる複雑な形態は、思考や感情のネットワークを暗示している。"
  },
  click02: {
    title: "浮遊する存在",
    text: "現実の重力から解放された身体を描いた作品。足元の煙状の質量は、存在の不確かさや変化を象徴し、鮮やかな色彩は個のアイデンティティの拡張を示唆する。"
  },
  click03: {
    title: "再構築される神話",
    text: "高度に発展した都市と神話的存在が共存する世界を描いた作品。機械的な構造と有機的なドラゴンの対比により、技術と自然、未来と過去の融合を表現している。"
  },
  click04: {
    title: "都市の光",
    text: "夜の都市に溶け込む人物を描いた作品。ネオンの光が衣服と身体に反射することで、個人と都市空間が一体化する瞬間を切り取っている。"
  },
  click05: {
    title: "無垢の境界",
    text: "幼さと機械的な要素が共存する存在を描いた作品。柔らかなフォルムと無機質なディテールの対比により、純粋さと人工性の境界が曖昧になる瞬間を表現している。"
  },
  click06: {
    title: "拡張された日常",
    text: "現実とゲーム的世界観が交錯する都市を舞台に、多様なキャラクターたちの躍動を描いた作品。誇張された動きと色彩は、情報社会における刺激とエネルギーを象徴している。"
  }
};

// GLB読み込み
const loader = new GLTFLoader();

loader.load(
  './model/museum.glb',
  function (gltf) {
    scene.add(gltf.scene);

    gltf.scene.traverse(function (obj) {
      // ワープポイント
      if (obj.name.startsWith('warp')) {
        warpPoints.push(obj);

        obj.position.y += 0.5;
        obj.userData.baseY = obj.position.y;

        obj.scale.set(
          obj.scale.x * 0.45,
          obj.scale.y * 0.45,
          obj.scale.z * 0.45
        );

        console.log('ワープ登録:', obj.name);
      }

      // 作品クリック用透明Plane
      if (obj.name.startsWith('click')) {
        artClickObjects.push(obj);
        obj.userData.clickName = obj.name;

        console.log('作品クリック登録:', obj.name);
      }
    });

    console.log('GLB読み込み成功');
  },
  function (xhr) {
    console.log((xhr.loaded / xhr.total * 100) + '% 読み込み中');
  },
  function (error) {
    console.error('GLB読み込みエラー:', error);
  }
);

// クリック判定
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', function (event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // 作品クリック判定
  const artHits = raycaster.intersectObjects(artClickObjects, true);

  if (artHits.length > 0) {
    const clicked = artHits[0].object;
    const clickName = clicked.userData.clickName || clicked.name;

    console.log('作品クリック:', clickName);

    currentArtKey = clickName;

    moveToObject(clicked);
    showMagnifier();

    document.getElementById('artInfo').style.display = 'none';

    return;
  }

  // ワープポイント判定
  const warpHits = raycaster.intersectObjects(warpPoints, true);

  if (warpHits.length > 0) {
    let clicked = warpHits[0].object;

    while (clicked.parent && !clicked.name.startsWith('warp')) {
      clicked = clicked.parent;
    }

    moveToWarp(clicked);

    // ワープ時は虫眼鏡・説明を消す
    currentArtKey = null;
    document.getElementById('magnifierButton').style.display = 'none';
    document.getElementById('artInfo').style.display = 'none';
  }
});

// ワープ処理
function moveToWarp(warpObj) {
  const pos = new THREE.Vector3();
  warpObj.getWorldPosition(pos);

  camera.position.set(
    pos.x,
    pos.y + 6,
    pos.z + 25
  );

  controls.target.set(
    pos.x,
    pos.y + 1.5,
    pos.z
  );

  limitCameraPosition();
  controls.update();

  console.log(warpObj.name + ' にワープしました');
}

// 作品の前へ移動
function moveToObject(obj) {
  const pos = new THREE.Vector3();
  obj.getWorldPosition(pos);

  camera.position.set(
    pos.x,
    pos.y + 6,
    pos.z + 28
  );

  controls.target.set(
    pos.x,
    pos.y,
    pos.z
  );

  limitCameraPosition();
  controls.update();
}

// 虫眼鏡表示
function showMagnifier() {
  const magnifierButton = document.getElementById('magnifierButton');
  magnifierButton.style.display = 'block';
}

// 虫眼鏡クリック
const magnifierButton = document.getElementById('magnifierButton');

magnifierButton.addEventListener('click', function () {
  if (!currentArtKey) return;

  showArtInfo(currentArtKey);
});

// 作品情報表示
function showArtInfo(clickName) {
  const data = artData[clickName];

  if (!data) {
    console.log('作品データなし:', clickName);
    return;
  }

  document.getElementById('artTitle').innerText = data.title;
  document.getElementById('artText').innerText = data.text;
  document.getElementById('artInfo').style.display = 'block';
}

// ×ボタン
const closeInfo = document.getElementById('closeInfo');

closeInfo.addEventListener('click', function () {
  document.getElementById('artInfo').style.display = 'none';
});

// 初期位置へ戻す
function resetCamera() {
  camera.position.copy(defaultCameraPos);
  controls.target.copy(defaultTarget);
  controls.update();
}

// 建物外に出ない制限
function limitCameraPosition() {
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -140, 140);
  camera.position.y = THREE.MathUtils.clamp(camera.position.y, 3, 40);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -150, 150);
}

// 描画ループ
function animate() {
  requestAnimationFrame(animate);

  const time = clock.getElapsedTime();

  warpPoints.forEach(function (warp, index) {
    warp.position.y =
      warp.userData.baseY + Math.sin(time * 2 + index) * 0.25;
  });

  limitCameraPosition();

  controls.update();
  renderer.render(scene, camera);
}

animate();

// 画面サイズ変更対応
window.addEventListener('resize', function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});