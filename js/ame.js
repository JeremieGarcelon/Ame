//jQuery(document).ready(function($){

window.onload=function(){

	var output=document.getElementById('output');
	var codeinput=document.getElementById('codeinput');
	var changebtn=document.getElementById('changebtn');

	////////////////////
	///// MIDI

	var notes=new Array();
	var synths=new Array();

	// Callback lorsqu'une touche est appuyée
	function noteOn(note, velocity){
		for(var i=0; i < notes.length; i++){
			if(notes[i] == note){
			notes.splice(i,1);
			break;
			}
		}
		notes.push(note);
		synths[note].velocity=velocity/127;
		synths[note].state=1;
		//output.innerHTML=notes.join();
	}

	// Callback lorsqu'une touche est relachée
	function noteOff(note, velocity){
		synths[note].state=0;
		//output.innerHTML=notes.join();
	}

	// On capture l'entrée MIDI
	SimpleMidiInput.init(noteOn, noteOff);

	////////////////////
	///// AUDIO

	// Envelope
	function Evl(samplerate, attack_duration_ms, release_duration_ms, releaseCallback){

		var attack_length=Math.round(samplerate*(attack_duration_ms/1000));
		var attack_step=1/attack_length;
		var release_length=Math.round(samplerate*(release_duration_ms/1000));
		var release_step=1/release_length;

		var amplitude=0;

		this.attack=function(){
			amplitude+=attack_step;
			if(amplitude > 1){
				amplitude=1;
			}
			return amplitude;
		};

		this.release=function(){
			amplitude-=release_step;
			if(amplitude < 0){
				amplitude=0;
				releaseCallback();
			}
			return amplitude;
		};

	}

	// Contexte Audio
	var audiocontext;
	try{
		window.AudioContext=window.AudioContext || window.webkitAudioContext;
		audiocontext=new AudioContext();
	}
	catch(error){
		var str_nosupport="Ton n'avigateur ne supporte pas l'Audio HTML5. \nUtilise la force ! ou Chrome / Firefox !"
		alert(str_nosupport+" \n"+error.message);
		return;
	}

	// Synthétiseur
	function synth(index, frequency){
		var index=index;
		var frequency=frequency;
		this.sine=new Array();
		this.square=new Array();
		this.saw=new Array();
		this.triangle=new Array();
		for(var i=0; i < 10; i++){
			this.sine.push( new Sine(audiocontext.sampleRate,0) );
			this.square.push( new Square(audiocontext.sampleRate,0) );
			this.saw.push( new Saw(audiocontext.sampleRate,0) );
			this.triangle.push( new Triangle(audiocontext.sampleRate,0) );
		}
		//var sine=new Saw(audiocontext.sampleRate,0);
		//var mod=new Sine(audiocontext.sampleRate,0);
		var envelope=new Evl(audiocontext.sampleRate, 1000, 500, 
			function(){
				for(var i=0; i < notes.length; i++){
					if(notes[i] == index){
						notes.splice(i,1);
						break;
					}
				}
				//output.innerHTML=notes.join();
			}
		);
		var env_amp=0;
		this.state=0;	// 1=attack 0=release
		this.velocity=0;
		this.step=function(){
			if(this.state == 1){
				env_amp=envelope.attack();
			}
			else{
				env_amp=envelope.release();
			}
			return env_amp*this.velocity*this.synthfunction(frequency);
			//return env_amp*this.velocity*this.sine[0].mod(0.5,1,0.25)*this.saw[0].flow(frequency);	// Il faut gerer les valeur 0/
		};
		this.reset=function(){
			envelope.reset();
		}
	}
	synth.prototype.synthfunction=function(frequency){
		return this.sine[0].mod(0.5,1,0.25)*this.saw[0].flow(frequency);
	};


////////////////////

	function change(){
		var codestr='synth.prototype.synthfunction=function(frequency){'+codeinput.value+'};';
		eval(codestr);
	}
	changebtn.onclick=function(){
		change();
	};

	document.getElementById('presetbtn_1').onclick=function(){
		codeinput.value='return this.sine[0].flow(frequency);';
		change();
	};

	document.getElementById('presetbtn_2').onclick=function(){
		codeinput.value='return this.saw[0].flow(frequency) * this.sine[0].mod(0.5,1,0.25);';
		change();
	};

	document.getElementById('presetbtn_3').onclick=function(){
		codeinput.value='return this.square[0].flow( frequency + this.sine[0].mod(0,(frequency/10),2) );';
		change();
	};

	document.getElementById('presetbtn_4').onclick=function(){
		codeinput.value='return ( this.triangle[0].flow(frequency) + this.triangle[1].flow(frequency/2) + this.triangle[2].flow(frequency/3) )/3;';
		change();
	};

////////////////////


	// On crée un synthétiseur pour chaque note
	for(var i=0; i < 128; i++){
		synths[i]=new synth(i, SimpleMidiInput.toHz(i));
	}

	// Callback de la boucle audio (appelé pour completer chaque échantillon)
	var amplitude;
	var notes_length;
	function onSample(channels){

		amplitude=0;
		notes_length=notes.length;
		for(var i=0; i < notes_length; i++){
			if(notes[i]){
				amplitude+=synths[notes[i]].step();
			}
		}
		amplitude=amplitude/4;//notes_length;	// Diviser n'est pas la bonne approche cela dit je ne comprend pas que ça marche comme ça ! ;)
		if(amplitude > 1 ){ amplitude=1; }	// Utile ?

		channels.left=channels.right=amplitude;
	}

	// Creation de la boucle audio
	var buffersize=2048;	// 256, 512, 1024, 2048, 4096
	var audioloop=AudioLoop.create(audiocontext, buffersize, onSample);

	// On connecte la boucle audio au contexte audio
	audioloop.connect(audiocontext.destination);

	$('#play').bind('click',function(){
		notes[64]=true;
	});

	$('#stop').bind('click',function(){
		notes[64]=false;
	});

	////////////////////

}

//});
