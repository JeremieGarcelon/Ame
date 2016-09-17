/*
### À propos

SimpleMidiInput permet de prendre en charge facilement un clavier MIDI (en entrée).
SimpleMidiInput est uniquement compatible avec le navigateur Chrome (et bientot FireFox).

### Utilisation

1. Inclure le fichier SimpleMidiInput.js dans la section <head> de votre page :

	<script type="text/javascript" src="js/SimpleMidiInput.js"></script>

2. Implémenter deux fonctions qui seront appelées lorsqu'une touche est appuyée ou relachée :

	function noteOn(note, velocity){
		// Votre code
	}

	function noteOff(note, velocity){
		// Votre code
	}

3. Executer :

	SimpleMidiInput.init(noteOn, noteOff);

### Pratique

Vous pouvez obtenir convertir les notes (valeur midi) en Hz avec :

	SimpleMidiInput.toHz(note);

Vous voulez modifier la frequence de base (440Hz) pour ce calcul avec :

	SimpleMidiInput.baseFrequency=220;

Vous pouvez changer à la volée les fonction appelées lorsqu'une touche est appuyée ou relachée :

	SimpleMidiInput.noteOn=noteOn;
	SimpleMidiInput.noteOff=noteOff;

### Remarque

La valeur de la vélocité (velocity) est comprise dans un intervale de  0 à 127.
Lorsqu'une touche est relaché la velocité vaut 0 (sauf cas particulier).

### Ressources

Merci Kith McMillen !
http://www.keithmcmillen.com/blog/making-music-in-the-browser-web-midi-api/

*/
var SimpleMidiInput={

	// Exemple de callback lorsqu'une touche est appuyée
	noteOn : function(note, velocity){
		console.log('noteOn : '+SimpleMidiInput.toHz(note)+'Hz - Velocity : '+(velocity/127));
	},

	// Exemple de callback lorsqu'une touche est relachée
	noteOff : function(note, velocity){
		console.log('noteOff : '+SimpleMidiInput.toHz(note)+'Hz - Velocity : '+velocity);
	},

	////////////////////

	// Initialisation
	init : function(noteOn, noteOff){
		SimpleMidiInput.noteOn=noteOn;
		SimpleMidiInput.noteOff=noteOff;
		// On teste si le navigateur supporte le protocole MIDI
		if(!navigator.requestMIDIAccess){
			alert(SimpleMidiInput.str_nosupport);
		}
		else{
			// On tente d'établir une connexion MIDI
			navigator.requestMIDIAccess({ sysex: false }).then(SimpleMidiInput.onMIDIsuccess, SimpleMidiInput.onMIDIfailure);
		}
	},

	str_nosupport : "Ton navigateur ne supporte pas le protocole MIDI. \nUtilise la force ! ou Chrome !",

	////////////////////

	// Callback si la connexion MIDI échoue
	onMIDIfailure(e){
	   	console.log('onMIDIfailure : '+e);
		alert(SimpleMidiInput.str_nodevice);
	},

	str_nodevice : "Aucun periphérique MIDI n'est accéssible. \nBranche ton bordel et recharge la page !",

	// Callback si la connexion MIDI est établie
	onMIDIsuccess : function(MIDIAccess){
		// On liste les périphérique MIDI en entrée
		var inputs=MIDIAccess.inputs.values();
		// Pour chaque périphérique trouvée
		for(var input=inputs.next(); input && !input.done; input=inputs.next()){
			// Chaque fois qu'un message MIDI sera reçu on appellera la fonction onMIDImessage.
			input.value.onmidimessage=SimpleMidiInput.onMIDImessage;
			// Noter ici que l'on s'embarasse pas à proposer un choix parmi les périphériques.
			// En les connectant tous, on va bien tomber sur celui qui fonctionne.
			// Si vous vouliez aller plus loin, le nom du périphérique est dans : input.value.name .
			// Tant que vous y êtes, vous pourriez aussi detecter les message de connection/déconnexion avec
			// MIDIAccess.onstatechange=function(e){ console.log(e.port+':'+e.port.state+':'+e.port.name+':'+e.port.type); }
		}
	},

	// Callback lorsqu'un message MIDI [cmd/channel, note, velocity] est reçu
	onMIDImessage : function(message){
			// Voici les données disponibles :
			// cmd=message.data[0] >> 4;
			// channel=message.data[0] & 0xf;
			// type=message.data[0] & 0xf0;
			// note=message.data[1];
			// velocity=message.data[2];
		// On execute la bonne fonction selon le type de message
		switch(message.data[0] & 0xf0){
			// Une touche est appuyée
			case 144:
				// Il semble que certains clavier ne retournent pas le bon message lorsque la touche est relachée
				// On teste donc la velocité
				if(message.data[2] == 0){
					SimpleMidiInput.noteOff(message.data[1], message.data[2]);
				}
				else{
					SimpleMidiInput.noteOn(message.data[1], message.data[2]);
				}
			break;
			// Une touche est relachée
			case 128:
				SimpleMidiInput.noteOff(message.data[1], message.data[2]);
			break;
		}
		// debug
		//document.getElementById('output').innerHTML=message.data;
	},

	////////////////////

	baseFrequency : 440,

	toHz : function(note){
		return SimpleMidiInput.baseFrequency*Math.pow(2, ((note-69)/12) );
	}

};

