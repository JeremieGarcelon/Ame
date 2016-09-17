/*
### À propos

AudioLoop permet d'implémenter facilement une 'boucle audio' (un script processor de la Web Audio API HTML5).
AudioLoop est uniquement compatible avec les navigateurs Chrome et FireFox.

### Utilisation

1. Inclure le fichier AudioLoop.js dans la section <head> de votre page :

	<script type="text/javascript" src="js/AudioLoop.js"></script>

2. Créer un contexte audio

	audiocontext=new AudioContext();

3. Implémenter une fonction qui sera appelée par la boucle audio pour completer chaque échantillon :

	function onSample(channels){
		channels.left=channels.right=Math.random();
	}

4. Creer un node boucle audio

	var buffersize=512;	// 256, 512, 1024, 2048, 4096, 8192, 16384
	var audioloop=AudioLoop.create(audiocontext, buffersize, onSample);

5. Connecter la boucle audio au contexte audio

	audioloop.connect(audiocontext.destination);

### Pratique

On peut changer à la volée la fonction appelée par la boucle audio pour completer chaque échantillon

	audioloop.onSample=onSample;

### Remarque

Reduisez la latence avec une taille de buffer (buffersize) la plus petite possible.

*/

var AudioLoop={

	// Crée un boucle audio (script processor)
	create : function(audiocontext, buffersize, onSample){

		// Exemple de callback appelée par la boucle audio pour completer chaque échantillon
		// function onSample(channels){
		//	channels.left=channels.right=Math.random();
		// }

		var scriptprocessor=audiocontext.createScriptProcessor(buffersize, 0, 2);
		scriptprocessor.onSample=onSample;

		var i, bufferLeft, bufferRight;
		var channels={left: 0, right: 0}
		scriptprocessor.onaudioprocess=function(e){
			bufferLeft=e.outputBuffer.getChannelData(0);
			bufferRight=e.outputBuffer.getChannelData(1);
			for(i=0; i < buffersize; i++){
				scriptprocessor.onSample(channels);
				bufferLeft[i]=channels.left;
				bufferRight[i]=channels.right;
			}
		}

		return scriptprocessor;

	}

}

