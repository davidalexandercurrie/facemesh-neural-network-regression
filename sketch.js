let facemesh;
let video;
let predictions = [];

let model;
let targetLabel = [];
let state = 'collection';

let nnResults;
let loopBroken = false;

let socket;

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO);
  video.size(width, height);

  socket = io.connect();

  facemesh = ml5.facemesh(video, modelReady);

  let options = {
    inputs: 1404,
    outputs: 10,
    task: 'regression',
    debug: 'false',
  };

  model = ml5.neuralNetwork(options);
  // autoStartPredict();

  // This sets up an event that fills the global variable "predictions"
  // with an array every time new predictions are made
  facemesh.on('predict', results => {
    predictions = results;
  });

  // Hide the video element, and just show the canvas
  video.hide();

  createButton('Load Model').mousePressed(onLoadModelClick);
  createButton('Start Prediction').mousePressed(onPredictClick);
}

function autoStartPredict() {
  if (state == 'prediction') {
    onLoadModelClick();
    onPredictClick();
  }
}

function dataLoaded() {
  console.log(model.data);
}

function modelReady() {
  console.log('Model ready!');
}

function draw() {
  image(video, 0, 0, width, height);

  // We can call both functions to draw all keypoints
  drawKeypoints();
  restartPredictions();
}

// A function to draw ellipses over the detected keypoints
function drawKeypoints() {
  for (let i = 0; i < predictions.length; i += 1) {
    const keypoints = predictions[i].scaledMesh;

    // Draw facial keypoints.
    for (let j = 0; j < keypoints.length; j += 1) {
      const [x, y] = keypoints[j];

      fill(0, 255, 0);
      ellipse(x, y, 5, 5);
    }
  }
}

function mousePressed() {
  if (predictions[0] != undefined) {
    let inputs = predictions[0].mesh.flat();
    if (state == 'collection') {
      let target = targetLabel;
      if (targetLabel != undefined) {
        model.addData(inputs, target);
        console.log(`Data recorded for label ${targetLabel}`);
      } else {
        console.log('Target label not set.');
      }
    } else if (state == 'prediction') {
      model.predict(inputs, gotResults);
    }
  }
}

function gotResults(error, results) {
  if (error) {
    console.error(error);
    return;
  }
  console.log(results);
  nnResults = results;
  sendToServer();
  classify();
}

function keyPressed() {
  if (key == 't') {
    console.log('starting training');
    state = 'training';
    model.normalizeData();
    let options = {
      epochs: 200,
    };
    model.train(options, whileTraining, finishedTraining);
  } else if (key == 's') {
    model.saveData();
  } else if (key == 'm') {
    model.save();
  } else if (key == 'r') {
    targetLabel = [
      random(),
      random(),
      random(),
      random(),
      random(),
      random(),
      random(),
      random(),
      random(),
      random(),
    ];
    console.log(targetLabel);
  }
}

function whileTraining(epoch, loss) {
  console.log(epoch, loss);
}
function finishedTraining() {
  console.log('finished training');
}

function classify() {
  if (predictions[0] != undefined) {
    let inputs = predictions[0].mesh.flat();
    model.predict(inputs, gotResults);
  } else {
    loopBroken = true;
  }
}

function onPredictClick() {
  state = 'prediction';
}
function onLoadModelClick() {
  const modelInfo = {
    model: 'model/model.json',
    metadata: 'model/model_meta.json',
    weights: 'model/model.weights.bin',
  };
  model.load(modelInfo, () => console.log('Model Loaded.'));
}

function restartPredictions() {
  if (loopBroken) {
    loopBroken = false;
    classify();
  }
}

const sendToServer = () => {
  socket.emit('facemesh', nnResults);
};
