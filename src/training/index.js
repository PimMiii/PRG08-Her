import dataFile from "../data/files/poseData.json" assert { type: "json" };

// DOM
const statusDisplay = document.getElementById("status");
const saveModelBtn = document.getElementById("saveModel");
saveModelBtn.disabled = true;

const nn = ml5.neuralNetwork({
  task: "classification",
  hiddenUnits: 32,
  debug: true,
});
let trainingData;
let testData;
let chartdata;

function loadData() {
  const data = dataFile;
  console.log("data loaded");
  prepareData(data);
}

function prepareData(data) {
  data.sort(() => Math.random() - 0.5);

  trainingData = data.slice(0, Math.floor(data.length * 0.8));
  testData = data.slice(Math.floor(data.length * 0.8) + 1);
  console.log(
    `prepared data: Training: ${trainingData.length} | testData: ${testData.length}`
  );
  trainModel(trainingData);
}

function trainModel(trainingData) {
  console.log("prepping to train");
  for (let pose of trainingData) {
    let poseLandmarks = {};
    for (const landmarkIndex of Object.keys(pose.landmarks)) {
      poseLandmarks[`l${landmarkIndex}x`] = pose.landmarks[landmarkIndex][0];
      poseLandmarks[`l${landmarkIndex}y`] = pose.landmarks[landmarkIndex][1];
    }
    nn.addData(poseLandmarks, { tag: pose.tag });
  }

  nn.normalizeData();
  nn.train({ epochs: 32 }, () => validateModel());
}

async function validateModel() {
  statusDisplay.innerHTML = "Predicting, please wait...";
  let predictions = [];
  let amountCorrect = 0;
  for (let pose of testData) {
    let poseLandmarks = {};
    for (const landmarkIndex of Object.keys(pose.landmarks)) {
      poseLandmarks[`l${landmarkIndex}x`] = pose.landmarks[landmarkIndex][0];
      poseLandmarks[`l${landmarkIndex}y`] = pose.landmarks[landmarkIndex][1];
    }
    const prediction = await nn.classify(poseLandmarks);
    if (prediction[0].label === pose.tag) {
      amountCorrect++;
    }
    predictions.push({
      actual: pose.tag,
      predciction: prediction[0].label,
      confidence: prediction[0].confidence,
    });
  }
  const accuracy = amountCorrect / predictions.length;
  console.log(predictions, accuracy);
  statusDisplay.innerHTML = "All done...";
  saveModelBtn.disabled = false;
  saveModelBtn.addEventListener("click", saveModel);
}

function saveModel() {
  nn.save();
}

loadData();
