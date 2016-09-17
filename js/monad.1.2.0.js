/*
Nom:		Monad
Version:	1.2.0
Auteur:		Jérémie Garcelon
Date:		08/03/2014 04:00 (GTM+2)
Update		11/04/2015 03:00 (GTM+2)
*/

/*
Heritage
*/
function Extend(parent,init){
	var child=function(){
		parent.apply(this,arguments);
		init();
	};
	var Surrogate=function(){};
	Surrogate.prototype=parent.prototype;
	child.prototype=new Surrogate();
	return child;
};

/*
--- Forme d'onde modulables ---
S'utilise comme une classe abstraite.
Pour moduler n'importe quelle forme d'onde en fréquence, 
il suffis de faire progresser la phase en fonction de la fréquence.
*/
function Wave(samplerate,initphase){
	this.samplerate=samplerate;	// Taux d'échantillonage
	this.initphase=initphase;	// Phase initiale (float32 entre 0 et 1)
	this.phase=initphase;		// Phase (float32 entre 0 et 1)
}
//
Wave.prototype.step=function(frequency){
	// On fait progresser la phase en fonction de la fréquence
	this.phase+=frequency/this.samplerate;
	// On évite de faire exploser le compteur...
	if(this.phase > 1){
		this.phase-=Math.floor(this.phase);
	}
	return this.phase;
};
//
Wave.prototype.reset=function(){
	if(arguments[0]){
		this.initphase=arguments[0];
	}
	this.phase=this.initphase;
	
}
//
Wave.prototype.mod=function(mini,maxi,duration){
	return mini+((maxi-mini)/2*(this.flow(1/duration)+1));
}

// Par héritage : Les 4 principales formes d'onde
var Sine=Extend(Wave,function(){});
Sine.prototype.flow=function(frequency){
	return Math.sin(2*Math.PI*this.step(frequency));
};

var Square=Extend(Wave,function(){});
Square.prototype.flow=function(frequency){
	var phase=this.step(frequency);
	if(phase < 0.5){ return 1; }
	else{ return -1; }
};

var Saw=Extend(Wave,function(){});
Saw.prototype.flow=function(frequency){
	return (2*this.step(frequency))-1;
};

var Triangle=Extend(Wave,function(){});
Triangle.prototype.flow=function(frequency){
	var phase=this.step(frequency);
	if(phase < 0.5){
		return (phase*4)-1;
	}
	else{
		return ((1-phase)*4)-1;
	}
};

/*
--- Envelope ---
*/
function Envelope(samplerate, attack_duration, decay_duration, decay_val, sustain_duration, sustain_val, release_duration){
	
	this.sample=0;
	this.amplitude=0;

	// Attack
	if(attack_duration > 0){
		var attack_length=Math.round(samplerate*(attack_duration/1000));
		this.attack_end=attack_length;
				this.attack_step=1/attack_length;
	}
	else{
		this.amplitude=1;
		this.attack_end=0;
		this.attack_step=0;
	}
	// Decay
	if(decay_duration > 0){
		this.decay_val=decay_val;
		var decay_length=Math.round(samplerate*(decay_duration/1000));
		this.decay_end=this.attack_end+decay_length;
			if(this.decay_val != 1){
				this.decay_step=(this.decay_val-1)/decay_length;
			}
			else{
				this.decay_step=0;
			}
	}
	else{
		this.decay_val=1;
		this.decay_end=this.attack_end;
		this.decay_step=0;
	}
	// Sustain
	if(sustain_duration > 0){
		this.sustain_val=sustain_val;
		var sustain_length=Math.round(samplerate*(sustain_duration/1000));
		this.sustain_end=this.decay_end+sustain_length;
			if(this.sustain_val != this.decay_val){
				this.sustain_step=(this.sustain_val-this.decay_val)/sustain_length;
			}
			else{
				this.sustain_step=0;
			}
	}
	else{
		this.sustain_val=this.decay_val;
		this.sustain_end=this.decay_end;
		this.sustain_step=0;
	}
	// Release
	if(release_duration > 0){
		var release_length=Math.round(samplerate*(release_duration/1000));
		this.release_end=this.sustain_end+release_length;
				this.release_step=-(this.sustain_val/release_length);
	}
	else{
		this.release_end=this.sustain_end;
		this.release_step=0;
	}

	this.samplescount=this.release_end;

}

Envelope.prototype.reset=function(){
	this.sample=0;
	if(this.attack_end > 0){
		this.amplitude=0;
	}
	else{
		this.amplitude=1;
	}

};

Envelope.prototype.flow=function(){
	// Attack
	if( this.sample < (this.attack_end-1) ){
		this.amplitude+=this.attack_step;
	}
	else if( this.sample == (this.attack_end-1) ){
		this.amplitude=1;
	}
	// Decay
	else if( this.sample >= this.attack_end && this.sample < (this.decay_end-1) ){
		this.amplitude+=this.decay_step;
	}
	else if( this.sample == (this.decay_end-1) ){
		this.amplitude=this.decay_val;
	}
	// Sustain
	else if( this.sample >= this.decay_end && this.sample < (this.sustain_end-1) ){
		this.amplitude+=this.sustain_step;
	}
	else if( this.sample == (this.sustain_end-1) ){
		this.amplitude=this.sustain_val;	
	}
	// Release
	else if( this.sample >= this.sustain_end && this.sample < (this.release_end-1) ){
		this.amplitude+=this.release_step;
	}
	else{
		this.amplitude=0;
	}
		if(this.amplitude < 0){
			this.amplitude=0;
		}
	this.sample++;
	return this.amplitude;
};


/*
--- Usage simplifié ---
Il n'est prevu qu'une seule instance car l'utilisation de ScriptProcessor ne conviendra pas pour un objet (il faudrait un buffer).
*/
function Monad(audiocontext, callback){

	var that=this;

	// Config
	var buffersize=4096; // 256, 512, 1024, 2048, 4096, 8192, 16384

	// Audio Process
	var left;
	var right;
	var audioprocess=function(e){
		left=e.outputBuffer.getChannelData(0);
		right=e.outputBuffer.getChannelData(1);
		for(var i=0; i < buffersize; i++){
			left[i]=right[i]=callback();
		};
	};

	// Play/Stop

	this.scriptprocessor=audiocontext.createScriptProcessor(buffersize, 0, 2);

	this.play=function(){
		if(lock == 0){
			that.scriptprocessor.onaudioprocess=audioprocess;
		lock=1;
		}
	}

	this.stop=function(){
		if(lock == 1){
			that.scriptprocessor.onaudioprocess=null;
			//reset();
		lock=0;
		}
	}


	// Play/Stop

	var lock=0;

	this.gain=audiocontext.createGain();

	this.playsmooth=function(){
		if(lock == 0){
			that.gain.gain.value=0;
			that.play();
			that.scriptprocessor.connect(that.gain);
			var currenttime=audiocontext.currentTime;
			that.gain.gain.linearRampToValueAtTime(0, currenttime);
			that.gain.gain.linearRampToValueAtTime(0.9, currenttime+1);
		lock=1;
		}
	}

	this.stopsmooth=function(){
		if(lock == 1){
			var currenttime=audiocontext.currentTime;
			that.gain.gain.linearRampToValueAtTime(0.9, currenttime);
			that.gain.gain.linearRampToValueAtTime(0, currenttime+1);
			var timer=setTimeout(function(){
				scriptprocessor.disconnect(that.gain);
				that.stop();
				//reset();
				lock=0;
			},1500);
		}
	}

	// Cette syntaxe souligne qu'il n'est prevu qu'une seule instance
	return this;
}


