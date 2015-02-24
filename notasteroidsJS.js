// Init
var theGame = new Kiwi.Game('game', 'Not Asteroids', null, gameoptions);
var playState = new Kiwi.State('playState');
const ASTEROID_COUNT = 4;
const ANGULAR_THRUST = 0.8; //0.5;

// Configure States
playState.preload = function(){
    Kiwi.State.prototype.preload.call(this);

    ////////// LOAD SOUNDS
    this.addAudio('thrust', 'assets/sound/fire1.wav');
    this.addAudio('music', 'assets/sound/music.wav');
    this.addAudio('shoot', 'assets/sound/pew1.wav');
    this.addAudio('rocksplode', 'assets/sound/rocksplode.wav');
    this.addAudio('wormholeswoosh', 'assets/sound/wormhole.wav');

    ///////// LOAD IMAGES
    this.addImage('background', 'assets/images/loose_leaf.png');
    this.addImage('laser', 'assets/images/lazer1.png');
    this.addImage('big_asteroid', 'assets/images/asteroid_lg1.png');
    this.addImage('medium_asteroid', 'assets/images/asteroid_md1.png');
    this.addImage('small_asteroid', 'assets/images/asteroid_sm1.png');
    this.addImage('wormhole', 'assets/images/wormhole.png');

    this.addSpriteSheet('ship', 'assets/images/ship_sheet.png', 32, 64);
};

playState.create = function(){
    Kiwi.State.prototype.create.call(this);
    // Don't know why I have to do this here. Doesn't work outside of state.
    this.game.stage.offset = new Kiwi.Geom.Point(0,0);
//    this.game.stage.createDebugCanvas();

    //// CREATE BACKGROUND
//    this.background = new Kiwi.GameObjects.StaticImage(this, this.textures['background'], -300, -800);
    this.background = new Toroidal(this, -300, -800);
    this.background.scaleX = 1;
    this.background.scaleY = 0.6;

    //// HUD Elements
    this.score = 0;
    this.scoreBoard = new Kiwi.HUD.Widget.TextField(this.game, "Score: 0", this.game.stage.width - 150, 100);
    this.scoreBoard.style.fontFamily = "justADream";
    this.scoreBoard.style.fontSize = "20pt";
    this.scoreBoard.style.color = "blue";

    //// CREATE ASTEROIDS
    this.wormholeGroup = new Kiwi.Group(this);
    this.asteroidGroup = new Kiwi.Group(this);

    //// CREATE SHIP
    this.shipGroup = new Kiwi.Group(this);
    this.laserGroup = new Kiwi.Group(this);

    //// INITIALIZE SOUNDS
    this.thrustSound = new Kiwi.Sound.Audio( this.game, 'thrust', 0.2, false );
    this.shootSound = new Kiwi.Sound.Audio( this.game, 'shoot', 0.2, false );
    this.rocksplode = new Kiwi.Sound.Audio(this.game, 'rocksplode', 0.5, false);
    this.wormholeswoosh = new Kiwi.Sound.Audio(this.game, 'wormholeswoosh', 0.5, false);
    this.wormholeswoosh.addMarker('short', 0, 2, false);
    this.backgroundMusic = new Kiwi.Sound.Audio(this.game, 'music', 0.3, true);


    //// NOTHING

    //// INITIALIZE GAME STATE
    this.weaponCoolDown = 0;
    this.backgroundMusic.play();

    //// CREATE GAME CONTROLS
    this.leftKey = this.game.input.keyboard.addKey(Kiwi.Input.Keycodes.LEFT);
    this.rightKey = this.game.input.keyboard.addKey(Kiwi.Input.Keycodes.RIGHT);
    this.upKey = this.game.input.keyboard.addKey(Kiwi.Input.Keycodes.UP);
    this.fireKey = this.game.input.keyboard.addKey(Kiwi.Input.Keycodes.SPACEBAR);

    //// ASSEMBLE GAME HIERARCHY

    this.addChild(this.background);
    this.addChild(this.wormholeGroup);
    this.addChild(this.asteroidGroup);
    this.addChild(this.shipGroup);
    this.addChild(this.laserGroup);


    this.game.huds.defaultHUD.addWidget(this.scoreBoard);
//    this.game.stage.createDebugCanvas();

    this.shipGroup.addChild(new Ship(this, 350, 350, new Kiwi.Geom.Point(0,0), new Kiwi.Geom.Point(0,0), 0, 0));
};

//// TOROIDAL SPACE BEHAVIOUR
var Toroidal = function(state, x, y) {
    Kiwi.GameObjects.Sprite.call(this, state, state.textures['background'], x, y);


    Toroidal.prototype.warp = function(targetX, targetY, warping){
        var warped = warping.dup();
        warped.x = targetX;
        warped.y = targetY;

        warping.group.addChild(warped);
        warping.destroy();
    };

    Toroidal.prototype.update = function () {
        Kiwi.GameObjects.Sprite.prototype.update.call(this);

        asteroids = state.asteroidGroup.members;
        ships = state.shipGroup.members;
        lasers = state.laserGroup.members;

        members = [asteroids, ships, lasers];

        var stage = state.game.stage;

        for(var j=0; j<members.length; j++){
            for(var i=0; i<members[j].length; i++) {
                var wrap_overs = [false, false, false, false];

                var member = members[j][i];
                var member_middle = member;//.physics.box.center;

                if (member_middle.y < stage.y) {
                    wrap_overs[0] = true;
                }
                else if (member_middle.y > stage.height) {
                    wrap_overs[1] = true;
                }

                if (member.x < member.state.game.stage.x) {
                    wrap_overs[2] = true;
                }
                else if (member.x > state.game.stage.width) {
                    wrap_overs[3] = true;

                }
                if(wrap_overs[0]){
                    this.warp(member_middle.x, stage.height, member);
                    break;
                }
                if(wrap_overs[1]){
                    this.warp(member_middle.x, stage.y, member);
                    break;
                }
                if(wrap_overs[2]){
                    this.warp(state.game.stage.width, member.y, member);
                    break;
                }
                if(wrap_overs[3]){
                    this.warp(state.game.stage.x, member.y, member);
                    break;
                }

            }
        }
    };
};
// Figure out something else to extend
Kiwi.extend(Toroidal,Kiwi.GameObjects.Sprite);

playState.update = function(){
    Kiwi.State.prototype.update.call(this);


    // Check for asteroid collisions
//    if( Kiwi.Components.ArcadePhysics.overlapsGroupGroup(this.shipGroup, this.asteroidGroup, true) ){
//        this.shipGroup.members[0].destroy();
//        // Restart
//        this.clear();
//        this.backgroundMusic.stop();
//        this.game.huds.defaultHUD.removeAllWidgets();
//        this.create();
//    }

    if( (this.asteroidGroup.members.length + this.wormholeGroup.members.length) < ASTEROID_COUNT ){
        var rando = new Kiwi.Utils.RandomDataGenerator([new Date().getTime()]);
        this.wormholeGroup.addChild(new Wormhole(this, rando.integerInRange(0, this.game.stage.width), rando.integerInRange(0, this.game.stage.height)));
        this.wormholeswoosh.stop();
        this.wormholeswoosh.play('short');
    }


    // DEBUG CODE
//    theGame.stage.clearDebugCanvas();
//    for(var i=0; i<this.asteroidGroup.members.length; i++) {
//        this.asteroidGroup.members[i].box.draw(theGame.stage.dctx);
//    }
//    for(var i=0; i<this.shipGroup.members.length; i++) {
//        this.shipGroup.members[i].box.draw(theGame.stage.dctx);
//    }

};


//// WORMHOLE CLASS
var Wormhole = function(state, x, y){
    Kiwi.GameObjects.Sprite.call(this, state, state.textures['wormhole'], x, y);
    this.counter = 0;

    Wormhole.prototype.update = function(){
        Kiwi.GameObjects.Sprite.prototype.update.call(this);

        this.rotation += 0.03;

        if( this.counter++ > 100 ){
            var rando = new Kiwi.Utils.RandomDataGenerator([new Date().getTime()]);
            this.state.asteroidGroup.addChild(new Asteroid('big', this.state, this.x, this.y, new Kiwi.Geom.Point(rando.angle()/12, rando.angle()/12), rando.angle()/4, rando.normal()/2));
            this.destroy();
        }
    }
};
Kiwi.extend(Wormhole,Kiwi.GameObjects.Sprite);

//// ASTEROID CLASS
var Asteroid = function(type, state, x, y, velocity, rot, angularVelocity){
    if(type == 'big') {
        Kiwi.GameObjects.Sprite.call(this, state, state.textures['big_asteroid'], x, y);

        this.box.hitbox = new Kiwi.Geom.Rectangle(25, 15, 85, 95);
        this.points = 1;
//        this.box.hitbox = new Kiwi.Geom.Rectangle(30, 5, 80, 80);
    }
    else if(type == 'medium'){
        Kiwi.GameObjects.Sprite.call(this, state, state.textures['medium_asteroid'], x, y);
        this.box.hitbox = new Kiwi.Geom.Rectangle(10, 10, 45, 45);
        this.points = 2;
    }
    else {
        type = 'small';
        Kiwi.GameObjects.Sprite.call(this, state, state.textures['small_asteroid'], x, y);
        this.box.hitbox = new Kiwi.Geom.Rectangle(3, 8, 25, 8);
        this.points = 3;
    }

    this.group = state.asteroidGroup;

    this.type = type;

    this.physics = this.components.add(new Kiwi.Components.ArcadePhysics(this, this.box));
    this.physics.velocity = velocity;
    this.physics.angularVelocity = angularVelocity;
    this.rotation = rot;

    Asteroid.prototype.dup =function(){
        return new Asteroid(this.type, this.state, this.x, this.y, this.physics.velocity, this.rotation, this.physics.angularVelocity)
    };

    Asteroid.prototype.damage = function(){
        if(this.type == 'big') {
            var rando = new Kiwi.Utils.RandomDataGenerator([new Date().getTime()]);
            state.asteroidGroup.addChild(new Asteroid('medium', this.state, this.x +10, this.y+10, new Kiwi.Geom.Point(rando.angle()/12, rando.angle()/12), rando.angle(),   rando.normal()));
            state.asteroidGroup.addChild(new Asteroid('medium', this.state, this.x -10, this.y-10, new Kiwi.Geom.Point(rando.angle()/12, rando.angle()/12), rando.angle(),   rando.normal()));
        }
        else if(this.type == 'medium') {
            var rando = new Kiwi.Utils.RandomDataGenerator([new Date().getTime()]);
            state.asteroidGroup.addChild(new Asteroid('small', this.state, this.x +10, this.y+10, new Kiwi.Geom.Point(rando.angle()/12, rando.angle()/12), rando.angle(),  rando.normal()));
            state.asteroidGroup.addChild(new Asteroid('small', this.state, this.x -10, this.y-10, new Kiwi.Geom.Point(rando.angle()/12, rando.angle()/12), rando.angle(),  rando.normal()));
        }
        this.state.rocksplode.play();
        this.destroy();
        state.score += this.points;
        state.scoreBoard.text = "Score: " + state.score;
    };

    Asteroid.prototype.update = function() {
        Kiwi.GameObjects.Sprite.prototype.update.call(this);

        if(Kiwi.Components.ArcadePhysics.overlapsObjectGroup(this, state.shipGroup, false)) {
            for(var i=0; i<this.state.shipGroup.members.length; i++) {
                var ship = this.state.shipGroup.members[i];
                if (Kiwi.Geom.Intersect.circleToRectangle(new Kiwi.Geom.Circle(this.box.rawCenter.x, this.box.rawCenter.y, this.box.rawHitbox.width), ship.box.hitbox).result) {
                    ship.destroy();
                    this.state.clear();
                    this.state.backgroundMusic.stop();
                    this.state.game.huds.defaultHUD.removeAllWidgets();
                    this.state.create();
                }
            }
        }
        this.physics.update();
    }
};
Kiwi.extend(Asteroid,Kiwi.GameObjects.Sprite);


//// SHIP CLASS
var Ship = function (state, x, y, velocity, acceleration, angularVelocity, rotation){
    Kiwi.GameObjects.Sprite.call(this, state, state.textures['ship'], x, y);

    this.group = state.shipGroup;

    this.animation.add('idle', [0], 0.1, false);
    this.animation.add('go', [0, 1], 0.05, true);
    this.rotPointX = this.width * 0.5;
    this.rotPointY = this.height * 0.48;
    this.rotation = rotation;
    this.thrust = 5;
    this.weaponCoolDown = 0;

    this.physics = this.components.add(new Kiwi.Components.ArcadePhysics(this, this.box));
    this.physics.acceleration = acceleration; //new Kiwi.Geom.Point(0,15);
    this.physics.velocity = velocity; //new Kiwi.Geom.Point(0,9);
//    this.physics.maxVelocity = new Kiwi.Geom.Point(10, 10);
    this.physics.angularVelocity = angularVelocity;
    this.box.hitbox = new Kiwi.Geom.Rectangle(0, 0, 30, 45);

    Ship.prototype.dup =function(){
        return new Ship(state, 350, 350, this.physics.velocity, this.physics.acceleration, this.physics.angularVelocity, this.rotation);
    };

    Ship.prototype.update = function(){
        Kiwi.GameObjects.Sprite.prototype.update.call(this);

        this.weaponCoolDown--;

        if(this.state.fireKey.isDown){
            if(this.weaponCoolDown < 0) {
                var x_vector = Math.sin(this.rotation);
                var y_vector = -Math.cos(this.rotation);
                var laser_speed = 100;
                this.weaponCoolDown = 35;
                this.state.laserGroup.addChild(new Laser(this.state, this.x, this.y, new Kiwi.Geom.Point(x_vector*laser_speed, y_vector*laser_speed),this.rotation, 30));
                this.state.shootSound.play();
            }
        }

        if (this.state.upKey.isDown) {
            if (this.animation.currentAnimation.name != ('go')) {
                this.animation.play('go');
            }
            // Thrust

            this.state.thrustSound.play();
            var x_accel = Math.sin(this.rotation) * this.thrust;
            var y_accel = -Math.cos(this.rotation) * this.thrust;
            this.physics.acceleration = new Kiwi.Geom.Point(x_accel, y_accel);
        }
        else {
            // Drift
            if (this.animation.currentAnimation.name != ('idle')) {
                this.animation.play('idle');
            }
            this.physics.acceleration = new Kiwi.Geom.Point(0, 0);


        }
        if (this.state.leftKey.isDown) {
            // Rotate Left
            this.physics.angularAcceleration = -ANGULAR_THRUST;
        }
        else if (this.state.rightKey.isDown) {
            // Rotate Right
            this.physics.angularAcceleration = ANGULAR_THRUST;
        }
        else {
            this.physics.angularAcceleration = 0;
        }

        this.physics.update();
    }
};
Kiwi.extend(Ship,Kiwi.GameObjects.Sprite);


//// LASER CLASS
var Laser = function(state, x, y, velocity, rot, range){
    Kiwi.GameObjects.Sprite.call(this, state, state.textures['laser'], x, y);

    this.group = state.laserGroup;

    this.physics = this.components.add(new Kiwi.Components.ArcadePhysics(this, this.box));
    this.physics.velocity = velocity;
    this.rotation = rot;

    this.frameCount = 0;

    Laser.prototype.dup =function(){
        return new Laser(this.state, this.x, this.y, this.physics.velocity, this.rotation, range-this.frameCount)
    };

    Laser.prototype.update = function(){
        Kiwi.GameObjects.Sprite.prototype.update.call(this);

        this.physics.update();

        this.frameCount++;
        if(this.frameCount > range){
            this.destroy();
        }

        var asteroids = state.asteroidGroup.members;
        for(var i=0; i< asteroids.length;i++){
            asteroid = asteroids[i];
            if (this.physics.overlaps(asteroid)){
                this.destroy();
                asteroid.damage();
                break;
            }
        }
    }
};
Kiwi.extend(Laser,Kiwi.GameObjects.Sprite);

theGame.states.addState(playState);
theGame.states.switchState('playState');
