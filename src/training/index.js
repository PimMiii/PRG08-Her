let predictions = [];
const video = document.getElementById("video");

// Create a new handpose method
const handpose = ml5.handpose(video, modelLoaded);

// When the model is loaded
function modelLoaded() {
  console.log("Model Loaded!");
}

// Listen to new 'hand' events
handpose.on("hand", (results) => {
  predictions = results;
});
