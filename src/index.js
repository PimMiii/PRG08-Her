let model;
let videoWidth, videoHeight;
let ctx, canvas;
const log = document.querySelector("#array");
const VIDEO_WIDTH = window.innerWidth;
const VIDEO_HEIGHT = window.innerHeight;

//Neural Network
const NNoptions = {
  task: "classification", // or 'regression'
};
const nn = ml5.neuralNetwork(NNoptions);
const NNmodelDetails = {
  model: "./src/model/model.json",
  metadata: "./src/model/model_meta.json",
  weights: "./src/model/model.weights.bin",
};

//setup trivia
const triviaBaseUrl = "https://the-trivia-api.com/v2/";
let questions = null;

// setup overlay
const overlay = document.querySelector("#overlay");
const question = document.querySelector("#question");
// answers
const answers = document.querySelector("#answers");
const answerOne = document.querySelector("#answerOne");
const answerTwo = document.querySelector("#answerOne");
const answerThree = document.querySelector("#answerOne");
const answerFour = document.querySelector("#answerOne");
const clockDisplay = document.querySelector("#clockDisplay");
// explainer
const explainer = document.querySelector("#explainer");
const explainerTitle = document.querySelector("#explainerTitle");
const explainerParagraph = document.querySelector("#explainerParagraph");
const explainerBTN = document.querySelector("#explainerBTN");
// clasifierResult display
const classifierResult = document.querySelector("#classifierResult");
const poseDisplay = document.querySelector("#poseDisplay");
const confidenceDisplay = document.querySelector("#confidenceDisplay");

// content setup
let contentLength;
let activeContent = 0;
scenes = [
  {
    title: "explainer",
    content: [
      {
        title: "Welcome to Handpose Millionaires.",
        text: `in this trivia game you use your hands to answer the questions! <br/>
          So please make sure your camera is turned on, and that this site has been granted permissions to use the camera. <br/>
          But dont worry, all the image processing and pose recognition is happening locally in your browser.<br/> So nothing is send to a server!`,
        button: "What are the rules?",
      },
      {
        title: "Welcome to Handpose Millionaires.",
        text: `You will have to answer 15 questions correctly to win this game <br/> Answer correctly and you get a point. Answer wrong, and it's game over. Simple really.<br/>
             But to help you out, in case the questions are too difficult, you get a total of 3 skips. <br/> This will replace the question you skipped with another question.<br/>`,
        button: "Take me to the poses!",
      },
    ],
  },
  {
    title: "pose-explainer",
    content: [
      {
        title: "Answer A",
        tag: "countOne",
        text: "hold up your <strong><font color='aqua'>indexfinger</font></strong>, to pick answer A",
        imgSource: "",
      },
      {
        title: "Answer B",
        tag: "countTwo",
        text: "hold up your <strong><font color='aqua'>index- and middlefinger</font></strong>, to pick answer B",
        imgSource: "",
      },
      {
        title: "Answer C",
        tag: "countThree",
        text: "hold up your <strong><font color='aqua'>index-,middle-, and ringfinger</font></strong>, to pick answer C",
        imgSource: "",
      },
      {
        title: "Answer D",
        tag: "countFour",
        text: "hold up your <strong><font color='aqua'>index-, middle-, ring-, and little finger</font></strong>, to pick answer D<br/> NOTE: this pose is easiest recognised by the model if you hold your fingers together and your palm to the camera",
        imgSource: "",
      },
      {
        title: "Skip Question",
        tag: "closedFist",
        text: "to skip a question hold up a <strong><font color='aqua'>closed fist</font></strong>. <i>NOTE: this works best with fingers towards the camera.</i> <br/> This pose is also used as cancel.",
        imgSource: "",
      },
      {
        title: "Stop Game",
        tag: "countFive",
        text: "you can stop the game at any time by holding up <strong><font color='aqua'>all of your fingers.</font></strong>",
        imgSource: "",
      },
      {
        title: "Accept",
        tag: "thumbUp",
        text: "The game will sometimes ask for confirmation, for example if it isnt quite sure it's recognized the right handpose. <br/> To give confirmation give the camera a <strong><font color='aqua'>thumbs up.</font></strong>",
        imgSource: "",
      },
    ],
  },
];
let currentScene = 0;
let savedPredictions = [];
let screen;
const saveBuffer = 50;

// prediction Flag
let predictFlag = false;

// code
nn.load(NNmodelDetails, modelLoaded);

async function fetchQuestions(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const message = `an error occured: ${response.status}`;
    throw new Error(message);
  }

  const questions = await response.json().catch((error) => {
    console.log(error);
  });
  let questionArray = [];
  for (const question of questions) {
    let answers = [];
    answers.push(question.correctAnswer);
    for (const incAnswer of question.incorrectAnswers) {
      answers.push(incAnswer);
    }
    question.answers = answers.sort(() => Math.random() - 0.5);
    questionArray.push(question);
  }
  scenes.push({
    title: "questions",
    content: questionArray,
  });
  return questions;
}

function drawScene() {
  const scene = scenes[currentScene];
  contentLength = scene.content.length;
  screen = scene.content[activeContent];
  switch (currentScene) {
    case 0:
      explainer.hidden = false;
      explainerTitle.innerHTML = screen.title;
      explainerParagraph.innerHTML = screen.text;
      explainerBTN.innerHTML = screen.button;
      explainerBTN.disabled = false;
      break;
    case 1:
      explainer.hidden = false;
      classifierResult.hidden = false;
      explainerTitle.innerHTML = screen.title;
      explainerParagraph.innerHTML = screen.text;
      explainerBTN.innerHTML = screen.button;
      explainerBTN.disabled = true;
      explainerBTN.hidden = true;
      predictFlag = true;
      break;
    default:
      currentScene = 0;
      break;
  }
}
// handle advancement of the explainer scenes/screens
function explainerClickHandler() {
  if (activeContent + 1 < contentLength) {
    activeContent++;
    drawScene();
  } else if (activeContent + 1 >= contentLength) {
    currentScene++;
    activeContent = 0;
    drawScene();
  } else {
    console.log("something went wrong");
  }
}

function modelLoaded() {
  console.log("model loaded");
  main();
}

function prepLandmarks(pose) {
  let poseLandmarks = {};
  for (const landmarkIndex of Object.keys(pose.landmarks)) {
    poseLandmarks[`l${landmarkIndex}x`] = pose.landmarks[landmarkIndex][0];
    poseLandmarks[`l${landmarkIndex}y`] = pose.landmarks[landmarkIndex][1];
  }
  return poseLandmarks;
}

async function classifyPose(pose) {
  const classification = await nn.classify(prepLandmarks(pose));
  if (classification) {
    await savePrediction(classification[0]);
    drawPredictions(classification[0]);
  }
}

async function savePrediction(classification) {
  savedPredictions.push(classification);
  if (savedPredictions.length > saveBuffer) {
    savedPredictions.shift();
  }
  if (savedPredictions.length === saveBuffer) {
    await checkSavedPredictions();
  }
}

async function checkSavedPredictions() {
  const allEqual = (arr) => arr.every((v) => v.label === arr[0].label);

  if (allEqual(savedPredictions)) {
    await handleAnswer(savedPredictions[0].label);
  } else {
    console.log("Not all equal");
  }
}

async function handleAnswer(answer) {
  predictFlag = false;
  switch (scenes[currentScene].title) {
    case "pose-explainer":
      await checkPose(answer);
      break;
    case "questions":
      checkAnswer(answer);
      break;
    default:
      console.log("something went wrong");
      break;
  }

  predictFlag = true;
}

async function checkPose(answer) {
  if (answer === screen.tag) {
    console.log(`correct pose| ${answer}`);
    explainerTitle.style.color = "rgba(63, 195, 128)";
    await setTimeout(() => {
      explainerTitle.style.color = "white";
      explainerClickHandler();
    }, 1000);
    savedPredictions = [];
  } else {
    console.log(`wrong pose| expected: ${screen.tag}, answered: ${answer}`);
  }
}

function drawPredictions(classification) {
  poseDisplay.innerHTML = classification.label;
  confidenceDisplay.innerHTML = `${(classification.confidence * 100).toFixed(
    2
  )}%`;
}

//
// start de applicatie
//
async function main() {
  model = await handpose.load();
  const video = await setupCamera();
  questions = await fetchQuestions(
    `${triviaBaseUrl}questions?limit=20&region=NL`
  );
  video.play();
  explainerBTN.addEventListener("click", explainerClickHandler);
  drawScene();
  startLandmarkDetection(video);
}

//
// start de webcam
//
async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Webcam not available");
  }

  const video = document.getElementById("video");
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      width: VIDEO_WIDTH,
      height: VIDEO_HEIGHT,
    },
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

//
// predict de vinger posities in de video stream
//
async function startLandmarkDetection(video) {
  videoWidth = video.videoWidth;
  videoHeight = video.videoHeight;

  canvas = document.getElementById("output");

  canvas.width = videoWidth;
  canvas.height = videoHeight;

  ctx = canvas.getContext("2d");

  video.width = videoWidth;
  video.height = videoHeight;

  ctx.clearRect(0, 0, videoWidth, videoHeight);
  ctx.strokeStyle = "yellow";
  ctx.fillStyle = "yellow";
  ctx.lineWidth = 5;

  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1); // video omdraaien omdat webcam in spiegelbeeld is
  predictLandmarks();
}

//
// predict de locatie van de vingers met het model
//
async function predictLandmarks() {
  ctx.drawImage(
    video,
    0,
    0,
    videoWidth,
    videoHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );
  // prediction!
  if (predictFlag) {
    const predictions = await model.estimateHands(video); // ,true voor flip
    let classifications = [];
    if (predictions.length > 0) {
      drawHand(ctx, predictions[0].landmarks, predictions[0].annotations);

      //console.log(predictions[0].landmarks);
      const boundingBox = predictions[0].boundingBox;
      const pose = {
        landmarks: predictions[0].landmarks.reduce(
          (accumulator, currentValue) => {
            accumulator.push([
              //x
              (currentValue[0] - boundingBox.topLeft[0]) /
                (boundingBox.bottomRight[0] - boundingBox.topLeft[0]),
              //y
              (currentValue[1] - boundingBox.topLeft[1]) /
                (boundingBox.bottomRight[1] - boundingBox.topLeft[1]),
            ]);
            return accumulator;
          },
          []
        ),
      };
      await classifyPose(pose);
    }
  }
  // 60 keer per seconde is veel, gebruik setTimeout om minder vaak te predicten
  requestAnimationFrame(predictLandmarks);
  //setTimeout(() => predictLandmarks(), 1000);
}

//
// teken hand en vingers met de x,y coordinaten. de z waarde tekenen we niet.
//
function drawHand(ctx, keypoints, annotations) {
  // toon alle x,y,z punten van de hele hand in het log venster

  // punten op alle kootjes kan je rechtstreeks uit keypoints halen
  for (let i = 0; i < keypoints.length; i++) {
    const y = keypoints[i][0];
    const x = keypoints[i][1];
    drawPoint(ctx, x - 2, y - 2, 3);
  }

  // palmbase als laatste punt toevoegen aan elke vinger
  let palmBase = annotations.palmBase[0];
  for (let key in annotations) {
    const finger = annotations[key];
    finger.unshift(palmBase);
    drawPath(ctx, finger, false);
  }
}

//
// teken een punt
//
function drawPoint(ctx, y, x, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 4 * Math.PI);
  ctx.fill();
}
//
// teken een lijn
//
function drawPath(ctx, points, closePath) {
  const region = new Path2D();
  region.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    region.lineTo(point[0], point[1]);
  }

  if (closePath) {
    region.closePath();
  }
  ctx.stroke(region);
}

//
// start
//
