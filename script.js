const audioInput = document.getElementById("audio");
let noise = new SimplexNoise();
const area = document.getElementById("visualiser");

let audio = new Audio("vrabec.mp3");

function isMobile() {
    return window.innerWidth <= 768;
}

let width, height, depth;
function updatevalues() {
    if (isMobile()) {
        width = 16;
        height = 16;
        depth = 16;
    } else {
        width = 20;
        height = 20;
        depth = 20;
    }
}

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
updatevalues();
startVis(width, height, depth);

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

function startVis(width, height, depth) {
    console.log("vis", width, height, depth);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
        65,
        window.innerWidth / window.innerHeight,
        0.1,
        98
    );
    if (isMobile()) {
        camera.position.z = 100;
        // camera.position.y = 6;
    } else {
        camera.position.z = 100;
    }

    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.setClearColor(0xffffff, 0);

    area.appendChild(renderer.domElement);
    const geometry = new THREE.BoxGeometry(width, height, depth, 7, 7, 7);
    //const geometry = new THREE.TorusKnotGeometry(1, 1, 20, 10);
    const material = new THREE.MeshStandardMaterial({
        // color: "#FFFFFF",
        // wireframe: true,
        color: "#6C0000",
        roughness: 0,
        wireframe: true,
    });
    const cube = new THREE.Mesh(geometry, material);

    const light = new THREE.DirectionalLight("#FFFFFF", 10);
    light.position.set(0, 1, 10000000);
    //light.position.z = 100;
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
