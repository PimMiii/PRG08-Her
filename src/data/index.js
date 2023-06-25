let model;
let videoWidth, videoHeight;
let ctx, canvas;
const log = document.querySelector("#array");
const VIDEO_WIDTH = 720;
const VIDEO_HEIGHT = 405;
// init buttons
const buttonDiv = document.querySelector("#buttons");
const closedFistBTN = document.querySelector("#closedFistBTN");
const countOneBTN = document.querySelector("#countOneBTN");
const countTwoBTN = document.querySelector("#countTwoBTN");
const countThreeBTN = document.querySelector("#countThreeBTN");
const countFourBTN = document.querySelector("#countFourBTN");
const countFiveBTN = document.querySelector("#countFiveBTN");
const thumbUpBTN = document.querySelector("#thumbUpBTN");
// init hints
const hintDiv = document.querySelector("#hint");
const hintText = document.querySelector("#hintText");

buttonDiv.addEventListener("click", (e) => clickHandler(e));

let tag = null;
let savedPoses = [];

function clickHandler(e) {
  switch (e.target.id) {
    case "closedFistBTN":
      tag = "closedFist";
      changeHintText();
      break;
    case "countOneBTN":
      tag = "countOne";
      changeHintText();
      break;
    case "countTwoBTN":
      tag = "countTwo";
      changeHintText();
      break;
    case "countThreeBTN":
      tag = "countThree";
      changeHintText();
      break;
    case "countFourBTN":
      tag = "countFour";
      changeHintText();
      break;
    case "countFiveBTN":
      tag = "countFive";
      changeHintText();
      break;
    case "thumbUpBTN":
      tag = "thumbUp";
      changeHintText();
      break;
    case "exportBTN":
      console.log(savedPoses.length, savedPoses);
      changeHintText(true);
      break;
    default:
      console.log(`no clickable case found for ${e.target}`);
      break;
  }
  setTimeout(() => {
    tag = null;
    changeHintText();
  }, 5000);
}

function changeHintText(exp = false) {
  if (tag) {
    hintText.innerHTML = `recording poses with tag: ${tag}`;
    return;
  }
  if (exp) {
    hintText.innerHTML = `exporting saved poses...`;
    download(JSON.stringify(savedPoses), "savedPoses.json", "text/plain");
    return;
  }
  hintText.innerHTML = `Click a pose button to start recording poses. saved poses: ${savedPoses.length}`;
  return;
}

function download(content, fileName, contentType) {
  const a = document.createElement("a");
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  savedPoses = [];
  changeHintText();
}

//
// start de applicatie
//
async function main() {
  model = await handpose.load();
  const video = await setupCamera();
  video.play();
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
  ctx.strokeStyle = "red";
  ctx.fillStyle = "red";

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
  const predictions = await model.estimateHands(video); // ,true voor flip
  if (predictions.length > 0) {
    drawHand(ctx, predictions[0].landmarks, predictions[0].annotations);
    if (tag) {
      //console.log(predictions[0].landmarks);
      const boundingBox = predictions[0].boundingBox;
      const pose = {
        tag: tag,
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
      //console.log(pose);
      savedPoses.push(pose);
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
  log.innerText = keypoints.flat();

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
  ctx.arc(x, y, r, 0, 2 * Math.PI);
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
main();
