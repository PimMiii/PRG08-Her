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
const questionDisplay = document.querySelector("#question");
const questionText = document.querySelector("#questionText");
// answers
const answersDisplay = document.querySelector("#answersDisplay");
const answerOne = document.querySelector("#answerOne");
const answerTwo = document.querySelector("#answerTwo");
const answerThree = document.querySelector("#answerThree");
const answerFour = document.querySelector("#answerFour");

// explainer
const explainer = document.querySelector("#explainer");
const explainerTitle = document.querySelector("#explainerTitle");
const explainerCredits = document.querySelector("#explainerCredits");
const explainerParagraph = document.querySelector("#explainerParagraph");
const explainerBTN = document.querySelector("#explainerBTN");
// clasifierResult display
const classifierResult = document.querySelector("#classifierResult");
const poseDisplay = document.querySelector("#poseDisplay");
const confidenceDisplay = document.querySelector("#confidenceDisplay");

// scoreboard
const scoreboard = document.querySelector("#scoreboard");
const scoreDisplay = document.querySelector("#scoreDisplay");
const skipsDisplay = document.querySelector("#skipsDisplay");

// confirmation
const confirmationDialogue = document.querySelector("#confirmationDialogue");
const confirmationTitle = document.querySelector("#confirmationTitle");
const confirmationText = document.querySelector("#confirmationText");

// endscreen
const endScreen = document.querySelector("#endScreen");
const endScreenTitle = document.querySelector("#endScreenTitle");
const endScreenText = document.querySelector("#endScreenText");
const endScreenBTN = document.querySelector("#endScreenBTN");

// content setup
let currentScene = 2;
let contentLength;
let activeContent = 0;
let scenes = [
  {
    title: "confirmation",
    content: [
      {
        title: "Stop Game",
        text: "Are you sure you want to stop the game? <br/><strong><font color='aqua'>accept: Thumbs up</font> | <font color='crimson'>Cancel: Closed fist</font></strong>",
      },
      {
        title: "Skip Question",
        text: "Are you sure you want to skip this question?<br/><strong><font color='aqua'>accept: Thumbs up</font> | <font color='crimson'>Cancel: Closed fist</font></strong>",
      },
    ],
  },
  {
    title: "endscreen",
    content: [
      {
        title: "YOU WIN",
        text: "<strong><font color='aqua'>Congratulations!<br/>You are a Handpose Millonaire!</font><strong><br/>To play again please reload the page.",
      },
      {
        title: "GAME OVER",
        text: "<strong><font color='crimson'>Sorry, that was the wrong answer!<br/>You are not the Handpose Millionaire.</font><strong><br/>To play again please reload the page.",
      },
    ],
  },
  {
    // start here : 2
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
             Skips have not yet been implemented`,
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

let savedPredictions = [];
let screen;
const saveBuffer = 50;
let correctQuestions = [];
let incorrectQuestions = [];
let skippedQuestions = [];
const allowedSkips = 3;
let awaitingConfirmation = null;

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
  switch (scene.title) {
    case "explainer":
      questionDisplay.hidden = true;
      explainer.hidden = false;
      endScreen.hidden = true;
      answersDisplay.hidden = true;
      scoreboard.hidden = true;
      confirmationDialogue.hidden = true;
      classifierResult.hidden = true;

      answerOne.hidden = true;
      answerTwo.hidden = true;
      answerThree.hidden = true;
      answerFour.hidden = true;

      explainerTitle.innerHTML = screen.title;
      explainerParagraph.innerHTML = screen.text;
      explainerBTN.innerHTML = screen.button;
      explainerBTN.disabled = false;
      break;
    case "pose-explainer":
      questionDisplay.hidden = true;
      explainer.hidden = false;
      endScreen.hidden = true;
      answersDisplay.hidden = true;
      scoreboard.hidden = true;
      confirmationDialogue.hidden = true;
      classifierResult.hidden = false;

      answerOne.hidden = true;
      answerTwo.hidden = true;
      answerThree.hidden = true;
      answerFour.hidden = true;

      explainerCredits.hidden = true;
      explainerTitle.innerHTML = screen.title;
      explainerParagraph.innerHTML = screen.text;
      explainerBTN.innerHTML = screen.button;
      // turn off the button as we make switch to gesture navigation
      explainerBTN.disabled = true;
      explainerBTN.hidden = true;
      // turn on landmark predictions
      predictFlag = true;
      break;
    case "questions":
      questionDisplay.hidden = false;
      explainer.hidden = true;
      endScreen.hidden = true;
      answersDisplay.hidden = false;
      scoreboard.hidden = false;
      confirmationDialogue.hidden = true;
      classifierResult.hidden = false;

      answerOne.hidden = false;
      answerTwo.hidden = false;
      answerThree.hidden = false;
      answerFour.hidden = false;

      predictFlag = true;

      // turn on question and answers
      console.log(screen);
      questionText.innerHTML = screen.question.text;

      //answers
      answerOne.innerHTML = screen.answers[0];
      answerTwo.innerHTML = screen.answers[1];
      answerThree.innerHTML = screen.answers[2];
      answerFour.innerHTML = screen.answers[3];

      break;
    case "endscreen":
      questionDisplay.hidden = true;
      explainer.hidden = true;
      endScreen.hidden = false;
      answersDisplay.hidden = true;
      scoreboard.hidden = false;
      confirmationDialogue.hidden = true;
      classifierResult.hidden = true;

      answerOne.hidden = true;
      answerTwo.hidden = true;
      answerThree.hidden = true;
      answerFour.hidden = true;

      endScreenTitle.innerHTML = screen.title;
      endScreenText.innerHTML = screen.text;
      endScreenBTN.hidden = false;
      endScreenBTN.disabled = false;
      endScreenBTN.addEventListener("click", () => {
        location.reload();
      });
      break;
    case "confirmation":
      questionDisplay.hidden = true;
      explainer.hidden = true;
      endScreen.hidden = true;
      answersDisplay.hidden = true;
      scoreboard.hidden = false;
      confirmationDialogue.hidden = false;
      classifierResult.hidden = false;

      answerOne.hidden = true;
      answerTwo.hidden = true;
      answerThree.hidden = true;
      answerFour.hidden = true;

      confirmationTitle.innerHTML = screen.title;
      confirmationText.innerHTML = screen.text;

      predictFlag = true;

      break;

    default:
      currentScene = 1;
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
      await checkAnswer(answer);
      break;
    case "confirmation":
      await checkAnswer(answer);
      break;
    default:
      console.log("something went wrong");
      break;
  }
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
    predictFlag = true;
  }
}

function answeredCorrectly(asnwerNode) {
  correctQuestions.push(activeContent);
  scoreDisplay.innerHTML = `Correct Answers: ${correctQuestions.length}/15`;
  asnwerNode.style.backgroundColor = "rgba(63, 195, 128, 0.8)";
  savedPredictions = [];
  if (correctQuestions.length < 15) {
    setTimeout(() => {
      explainerClickHandler();
      asnwerNode.style.backgroundColor = "rgba(46,26,71,0.8)";
      predictFlag = true;
    }, 1000);
  } else {
    activeContent = 0;
    currentScene = 1;
    setTimeout(() => {
      drawScene();
    }, 1000);
  }
}

function answeredIncorrectly(answerNode) {
  incorrectQuestions.push(activeContent);
  answerNode.style.backgroundColor = "rgba(255,0,0,0.8)";
  savedPredictions = [];
  setTimeout(() => {
    answerNode.style.backgroundColor = "rgba(46,26,71,0.8)";
    currentScene = 1;
    activeContent = 1;
    drawScene();
  }, 1000);
}

async function checkAnswer(answer) {
  switch (answer) {
    case "thumbUp":
      if (awaitingConfirmation) {
        switch (awaitingConfirmation.reason) {
          case "stop":
            break;
          case "skip":
            break;
        }
      } else {
        predictFlag = true;
      }
      break;
    case "countOne":
      if (awaitingConfirmation) {
        return;
      }
      if (answerOne.innerHTML === screen.correctAnswer) {
        answeredCorrectly(answerOne);
      } else {
        answeredIncorrectly(answerOne);
      }
      break;
    case "countTwo":
      if (awaitingConfirmation) {
        return;
      }
      if (answerTwo.innerHTML === screen.correctAnswer) {
        answeredCorrectly(answerTwo);
      } else {
        answeredIncorrectly(answerTwo);
      }
      break;
    case "countThree":
      if (awaitingConfirmation) {
        return;
      }
      if (answerThree.innerHTML === screen.correctAnswer) {
        answeredCorrectly(answerThree);
      } else {
        answeredIncorrectly(answerThree);
      }
      break;
    case "countFour":
      if (awaitingConfirmation) {
        return;
      }
      if (answerFour.innerHTML === screen.correctAnswer) {
        answeredCorrectly(answerFour);
      } else {
        answeredIncorrectly(answerFour);
      }
      break;
    case "countFive":
      if (!awaitingConfirmation) {
        awaitingConfirmation = {
          reason: "stop",
          screenNumber: activeContent,
          sceneNumber: currentScene,
        };
        currentScene = 0;
        activeContent = 0;
        drawScene();
      }
      break;
    case "closedFist":
      if (awaitingConfirmation) {
        console.log(`${awaitingConfirmation.reason} | Cancelled`);
        savedPredictions = [];
        setTimeout(() => {
          currentScene = awaitingConfirmation.sceneNumber;
          activeContent = awaitingConfirmation.screenNumber;
          awaitingConfirmation = null;
          drawScene();
        }, 1000);
      } else {
        awaitingConfirmation = {
          reason: "skip",
          screenNumber: activeContent,
          sceneNumber: currentScene,
        };
        currentScene = 0;
        activeContent = 1;
        drawScene();
      }
      break;
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
