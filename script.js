const audioInput = document.getElementById("audio");
let noise = new SimplexNoise();
const area = document.getElementById("visualiser");

let audio = new Audio("vrabec.mp3");

let width = 20;
let height = 20;
let depth = 20;
let widthSegments = 20;
let heightSegments = 20;
let depthSegments = 20;

let analyser = null;
let dataArray = [];

area.addEventListener("click", () => {
  setupAudio();
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
});

startVis();

function clearScene() {
  const canvas = area.firstElementChild;
  area.removeChild(canvas);
}

function setupAudio() {
  if (analyser) return;

  const context = new AudioContext();
  const src = context.createMediaElementSource(audio);
  analyser = context.createAnalyser();
  src.connect(analyser);
  analyser.connect(context.destination);
  analyser.fftSize = 512;
  const bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);
}

function startVis() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 100;
  scene.add(camera);

  const renderer = new THREE.WebGLRenderer( { alpha: true } ); // init like this
  renderer.setSize(window.innerWidth, window.innerHeight);
  //renderer.setClearColor("#ced0ce");
  
  renderer.setClearColor( 0xffffff, 0 ); // second param is opacity, 0 => transparent
  

  area.appendChild(renderer.domElement);
  const geometry = new THREE.BoxGeometry(
    width,
    height,
    depth,
    widthSegments,
    heightSegments,
    depthSegments
  );
  const material = new THREE.MeshLambertMaterial({
    color: "#FFFFFF",
    wireframe: true,
  });
  const cube = new THREE.Mesh(geometry, material);

  const light = new THREE.DirectionalLight("#ffffff", 1000);
  light.position.set(0, 50, 100);
  scene.add(light);
  scene.add(cube);

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  function render() {
    let lowerMaxFr = 0;
    let upperAvgFr = 0;

    if (analyser) {
      analyser.getByteFrequencyData(dataArray);

      const lowerHalf = dataArray.slice(0, dataArray.length / 2 - 1);
      const upperHalf = dataArray.slice(
        dataArray.length / 2 - 1,
        dataArray.length - 1
      );

      lowerMaxFr = max(lowerHalf) / lowerHalf.length;
      upperAvgFr = avg(upperHalf) / upperHalf.length;
    }

    cube.rotation.x += 0.001;
    cube.rotation.y += 0.003;
    cube.rotation.z += 0.005;

    warpCube(
      cube,
      modulate(Math.pow(lowerMaxFr, 0.8), 0, 1, 0, 8),
      modulate(upperAvgFr, 0, 1, 0, 4)
    );

    requestAnimationFrame(render);
    renderer.render(scene, camera);
  }

  function warpCube(mesh, bassFr, treFr) {
    mesh.geometry.vertices.forEach(function (vertex, i) {
      var offset = mesh.geometry.parameters.width / 0.5;
      var amp = 5;
      var time = window.performance.now();
      vertex.normalize();
      var rf = 0.00001;
      var distance =
        offset +
        bassFr +
        noise.noise3D(
          vertex.x + time * rf * 4,
          vertex.y + time * rf * 6,
          vertex.z + time * rf * 7
        ) *
          amp *
          treFr *
          2;
      vertex.multiplyScalar(distance);
    });
    mesh.geometry.verticesNeedUpdate = true;
    mesh.geometry.normalsNeedUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeFaceNormals();
  }

  render();
}

//helper functions
function fractionate(val, minVal, maxVal) {
  return (val - minVal) / (maxVal - minVal);
}

function modulate(val, minVal, maxVal, outMin, outMax) {
  var fr = fractionate(val, minVal, maxVal);
  var delta = outMax - outMin;
  return outMin + fr * delta;
}

function avg(arr) {
  var total = arr.reduce(function (sum, b) {
    return sum + b;
  });
  return total / arr.length;
}

function max(arr) {
  return arr.reduce(function (a, b) {
    return Math.max(a, b);
  });
}
