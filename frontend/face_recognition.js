// Face Recognition part
const URL = "ws://localhost:8765"

function loadLabeledImages() {
    const labels = ['Ishan', 'Anoop', 'Sonu']
    return Promise.all(
      labels.map(async label => {
        const descriptions = []
        for (let i = 1; i <= 2; i++) {
          const img = await faceapi.fetchImage(`labeled_images/${label}/${i}.jpg`)
          const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
          descriptions.push(detections.descriptor)
        }
  
        return new faceapi.LabeledFaceDescriptors(label, descriptions)
      })
    )
  }

const interests = {
  "Ishan": ["Tennis", "Football", "AI", "Education"],
  "Anoop": ["Business", "Beer", "Table Tennis"],
  "Sonu": ["Mathematics", "Teaching", "Crochet", "Biology"],
};

function getIntroduction(personName) {
  const personInterests = interests[personName];
  return `Hi, my name is ${personName} and my interests are ${personInterests.join(", ")}`;
}

function sayGoodbye(personName) {
  return "I have left abruptly. Say bye to me by name."
}

const run = async(url)=>{
    const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
    })
    const videoFeedEl = document.getElementById('video')
    videoFeedEl.srcObject = stream
    //we need to load our models
    // pre-trained machine learning for our facial detection!
    await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri('./models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
    ])
    
    //make the canvas the same size and in the same location
    // as our video feed
    const canvas = document.getElementById('canvas')
    canvas.style.left = videoFeedEl.offsetLeft
    canvas.style.top = videoFeedEl.offsetTop
    canvas.height = videoFeedEl.height
    canvas.width = videoFeedEl.width

    /////OUR FACIAL RECOGNITION DATA
    let refFaceAiData = await loadLabeledImages()
    let faceMatcher = new faceapi.FaceMatcher(refFaceAiData)

    let processThisFrame = true;
    let lastKnownProfile = null;
    let candidateProfiles = [];
    let counter = 0;
  
    // facial detection with points
    setInterval(async()=>{
      
      if (processThisFrame) {
        // get the video feed and hand it to detectAllFaces method
        let faceAIData = await faceapi.detectAllFaces(videoFeedEl).withFaceLandmarks().withFaceDescriptors()
        // we have a ton of good facial detection data in faceAIData
        // faceAIData is an array, one element for each face

        // draw on our face/canvas
        //first, clear the canvas
        canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height)
        // draw our bounding box
        faceAIData = faceapi.resizeResults(faceAIData,videoFeedEl)
        faceapi.draw.drawDetections(canvas,faceAIData)

        const faceProfiles = [];

        faceAIData.forEach(face=>{
            const { detection, descriptor } = face
            let label = faceMatcher.findBestMatch(descriptor).label
            let options = {label: label}
            if(label.includes("unknown")){
                options = {label: "Unknown subject..."}
            }
            // Store the label in the labelsList array
            faceProfiles.push(options.label);

            // Create a new DrawBox instance and draw it on the canvas
            const drawBox = new faceapi.draw.DrawBox(detection.box, options)
            drawBox.draw(canvas)
        })

        // Main loop
        if (lastKnownProfile == null){
          if (faceProfiles.length > 0){
            [lastKnownProfile, counter, candidateProfiles] = await identifyNewPerson(faceProfiles, url, candidateProfiles)
          }
        }
        else{
          if (faceProfiles.includes(lastKnownProfile)){
            counter = 0
          }
          else if (faceProfiles.length > 1){
            [lastKnownProfile, counter] = await handleNewPersonWithExisting(lastKnownProfile, faceProfiles, counter, url)
          }
          else{
            [lastKnownProfile, counter] = await handlePersonNotInFrame(lastKnownProfile, counter, url)
          }
        }
      }

      
      processThisFrame = !processThisFrame;

    },100)

}

function mostFrequentElement(arr) {
  if (arr.length === 0) return null; // Return null if the array is empty

  const frequencyMap = {};
  let maxCount = 0;
  let mostFrequent = null;

  // Count occurrences of each element in the array
  arr.forEach(element => {
      frequencyMap[element] = (frequencyMap[element] || 0) + 1;

      // Track the element with the highest count
      if (frequencyMap[element] > maxCount) {
          maxCount = frequencyMap[element];
          mostFrequent = element;
      }
  });

  return mostFrequent;
}

// Constants
const MAX_COUNTER = 50;
const MAX_CANDIDATE_COUNTER = 8;

// Identify a new person
async function identifyNewPerson(faceProfiles, url, candidateProfiles) {
  console.log("Identifying new person")
  const notUnknownProfiles = faceProfiles.filter(profile => profile !== "unknown");
  if (notUnknownProfiles.length > 0) {
      let lastKnownProfile = notUnknownProfiles[0];
      candidateProfiles.push(lastKnownProfile);

      if (candidateProfiles.length > MAX_CANDIDATE_COUNTER) {
          lastKnownProfile = mostFrequentElement(candidateProfiles);
          await handleIdentifiedPerson(lastKnownProfile, url);
          return [lastKnownProfile, 0, []];
      } else {
          return [null, 0, candidateProfiles];
      }
  } else {
    console.log("No recognized person found.")
      return [null, 0, []];
  }
}

// Handle identified person
async function handleIdentifiedPerson(profile, url) {
  console.log("Handling Identified Person")
  await sendAsyncMessage("face_recognition", getIntroduction(profile), url);
}

// Handle person leaving
async function handlePersonLeaving(profile, url) {
  console.log("Handling person leaving")
  await sendAsyncMessage("face_recognition", sayGoodbye(profile), url);
}

// Handle case where person is not in frame
async function handlePersonNotInFrame(profile, counter, url) {
  console.log("Handling person not in frame")
  console.log(counter)
  if (counter >= MAX_COUNTER) {
      await handlePersonLeaving(profile, url);
      return [null, 0];
  } else {
      return [profile, counter + 1];
  }
}

// Handle new person with an existing one
async function handleNewPersonWithExisting(profile, faceProfiles, counter, url) {
  console.log("Handling new person with exisiting")
  if (counter >= MAX_COUNTER) {
      await handlePersonLeaving(profile, url);
      return identifyNewPerson(faceProfiles, url, []);
  } else {
      return [profile, counter + 1];
  }
}

// Send asynchronous message using WebSockets
async function sendAsyncMessage(topic, message, url) {
  const socket = new WebSocket(url);

  socket.onopen = async () => {
      const event = {
          topic: topic,
          message: message,
      };
      socket.send(JSON.stringify(event));
      console.log(`Message successfully sent to topic ${topic}: ${message}`);
  };

  socket.onerror = (error) => {
      console.error(`WebSocket error: ${error}`);
  };
}

run(URL)
