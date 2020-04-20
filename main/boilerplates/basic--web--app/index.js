/*
* Change background color after 1.5seconds
*/
var count = 0;
var colors = ['#273444','#46A28A','#2b0e21']
setInterval(function(){	document.querySelector("html").style.backgroundColor = colors[count];
            if(count < 3){
            count++;
            } else {
              count=0;
            }
},1500)