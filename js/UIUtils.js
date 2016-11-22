//Copyright (c) Anna Alekseeva 2013-2016
//------------------------UI------------------------
var UIU = {
		getRBSelectedValue: function(name) {
				var radioButtons = document.getElementsByName(name);
				var val;
				for (var i = 0; i < radioButtons.length; i++){
					if (radioButtons[i].checked) { 
						val = radioButtons[i].value;
						break;
					}
				}
				return val;
			
			},
			
			getMousePos: function(canvas, evt) {
			    var rect = canvas.getBoundingClientRect();
			    //console.log("getMousePos", window.devicePixelRatio, "client " + evt.clientX, "screen " + evt.screenX );
			    if (false/*window.devicePixelRatio*/) {
			    	return {
					      x: window.devicePixelRatio*(evt.clientX - rect.left),
					      y: window.devicePixelRatio*(evt.clientY - rect.top)
					    }
			    }
			    return {
			      x: evt.clientX - rect.left,
			      y: evt.clientY - rect.top
			    };

			}


		};
//--------------------------------------------------

