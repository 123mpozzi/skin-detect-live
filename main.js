function slide() {
  let slideValue = document.getElementById("slider").value;

  document.getElementById("imgbox").style.clipPath = "polygon(0 0," + slideValue + "% 0," + slideValue + "% 100%, 0 100%)";
}

const sample_list = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Jennifer_Lawrence_TIFF_2%2C_2012.jpg/330px-Jennifer_Lawrence_TIFF_2%2C_2012.jpg',
  'https://i.imgur.com/S2lYrKD.gif',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=387&q=80',
  'https://upload.wikimedia.org/wikipedia/commons/d/d9/Morgan_Freeman_Cannes.jpg',
  'https://i.imgur.com/mDtRHQ5.jpeg',
  'https://i.imgur.com/4YnIDaG.jpeg',
  'https://i.imgur.com/EpqnLEq.jpeg',
  'https://i.imgur.com/5vDG9WQ.jpeg',
  'https://i.imgur.com/3sVZJel.jpeg',
  'https://i.imgur.com/Jzzdksj.jpeg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Halle_Berry_by_Gage_Skidmore_2.jpg/330px-Halle_Berry_by_Gage_Skidmore_2.jpg',
  'https://live.staticflickr.com/65535/49866975356_962dbee9f7_z.jpg',
  'https://live.staticflickr.com/2277/2949090369_a05ec7ab18_z.jpg',
  'https://live.staticflickr.com/3085/2731117809_5f1ebddca4.jpg'
];

function insertRandom() {
  let chosen = sample_list[Math.floor(Math.random()*sample_list.length)];
  document.getElementById("name").value = chosen;
}

// Used before running python code
// Therefore this script must be included before pyodide scripts!
function getSamples() {
  return sample_list;
}
