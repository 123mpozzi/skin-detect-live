const form = document.querySelector('.js-search-form');

form.addEventListener('submit', handleSubmit);




function slide(){
  let slideValue = document.getElementById("slider").value;

  document.getElementById("imgbox").style.clipPath = "polygon(0 0," + slideValue + "% 0," + slideValue + "% 100%, 0 100%)";

  //console.log("polygon(0 0," + slideValue + "% 0," + slideValue + "% 100%, 0 100%)");
}
