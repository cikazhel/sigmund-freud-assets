// imports

import * as util from './util.js';

// constants

const DEV_ENABLED = true; // use dev directories?
const DEV_DRAW_HITBOXES = false; // draw hitboxes?

const CAMERA_PARALLAX_ENABLED = true; // enable mouse parallax?

let LEVEL_TIMESCALE = 1; // how much the audio playbackRate and deltaTime should be scaled
const LEVEL_TRACKS_ENABLED = true; // enable level/win/lose music?
const LEVEL_BART_MAX_TIME = 3; // how long barts should take to hurt the player

const GUN_RECOIL = -800; // the impulse to add onto the gun's recoil spring

const FX_SHELL_SPEED_X = 400; // the speed for bullet shells on the X axis
const FX_SHELL_SPEED_Y = 400; // the speed for bullet shells on the X axis
const FX_SHELL_LIFETIME = 4; // how long a bullet shell should live
const FX_GRAVITY = 2400; // the gravity of a bullet shell

const BG_PARALLAX = 0.1; // the amount of parallax to apply onto the screen
const BG_SCALE = 1.2; // the scale of the background

const CANVAS_WIDTH = 560; // the width of the render canvas
const CANVAS_HEIGHT = 420; // the height of the render canvas

// the base URLs for each asset directory (when DEV_ENABLED, change relative -> absolute web)
const BASE_URL = {
    LEVEL: DEV_ENABLED ? 'sigmund-freud-assets/levels/' : 'https://raw.githubusercontent.com/cikazhel/sigmund-freud-assets/main/levels/',
    BART: DEV_ENABLED ? 'sigmund-freud-assets/barts/' : 'https://raw.githubusercontent.com/cikazhel/sigmund-freud-assets/main/barts/',
    MISC: DEV_ENABLED ? 'sigmund-freud-assets/sounds/' : 'https://raw.githubusercontent.com/cikazhel/sigmund-freud-assets/main/sounds/',
    HL1: 'https://raw.githubusercontent.com/sourcesounds/hl1/refs/heads/master/sound/'
};

// timescale setter

function set_timescale(scale) {
    LEVEL_TIMESCALE = scale;
    util.play_sound.timescale = scale;
}

// expose to window
window.set_timescale = set_timescale;

// get elements

// the titlescreen div and start button
const div_titlescreen = document.getElementById('title-screen');
const btn_titlescreen_button = div_titlescreen.querySelector('button');

// the level selector screen and the container for the buttons
const div_levelselectorscreen = document.getElementById('level-selector-screen');
const div_levelbuttonscontainer = document.getElementById('level-buttons-container');

// the audio notice (asks you to click anywhere to enable audio)
const div_audionotice = document.getElementById('audio-notice');

// post-game buttons
const btn_game1 = document.getElementById('game-btn-1');
const btn_game2 = document.getElementById('game-btn-2');

// the amazing and beautiful canvas
const cnv_game = document.getElementById('game-canvas');

// set canvas width and height
cnv_game.width = CANVAS_WIDTH;
cnv_game.height = CANVAS_HEIGHT;


/**
 * @description the 2D context of the canvas. im using a type annotation so that I can get autocomplete
 * @type {CanvasRenderingContext2D}
*/
const ctx = cnv_game.getContext('2d');

// preload helper

async function load_manifest_into_store(store, url, onFile) {

    // fetch manifest and load into json
    const response = await fetch(`${url}manifest.json`);
    const manifest = await response.json();

    // iterate through each file listed
    for (const file of manifest) {

        // get contents and keep any errors in mind
        const response = await fetch(`${url}/${file}`);
        if (!response.ok) {
            console.error(`failed to load file ${BASE_URL.LEVEL}${file} from manifest ${url}manifest.json`);
            continue;
        }

        // decode and call onFile if provided
        const data = await response.json();
        if (onFile) {
            onFile(data, file, store);
        }

        // store the file in the store
        store[file] = data;
    }
}

// fetch level manifest

// declare levels constant
const levels = {};

// load the levels into the levels constant
load_manifest_into_store(levels, BASE_URL.LEVEL, (data, file) => {

    // load the audio into a glob and then append it into the data once ready
    util.audio(BASE_URL[data.track.audio_base_url]+data.track.audio_track).then(a => {
        a.volume = data.track.audio_track_volume;
        data.audio_track = a;
    });

    // create a level button and insert into the level button container
    const btn_level = document.createElement('button');
    btn_level.dataset.nosound = 'true';
    btn_level.classList.add('level-button');
    btn_level.dataset.levelName = file;
    btn_level.innerText = data.name;
    div_levelbuttonscontainer.appendChild(btn_level);
});

// log manifest loaded
console.log('level manifest loaded');

// fetch bart manifest (to preload)

// declare barts constant
const barts = {};
load_manifest_into_store(barts, BASE_URL.BART, (data) => {

    // load sounds into a new sounds object
    const sounds = {};
    
    // load audio files for each sound entry
    for (const [idx, sound_entries] of Object.entries(data.sounds)) {
        const new_sound_entries = [];
        sound_entries.forEach(sound => util.audio(BASE_URL[sound.audio_base_url]+sound.audio_track).then(a => {
            a.meta_volume = sound.audio_track_volume;
            new_sound_entries.push(a);
        }));
        sounds[idx] = new_sound_entries;
    }
    
    // assign sounds back to data
    data.sounds = sounds;
});

// log manifest loaded
console.log('bart manifest loaded');

// ==== load audio files ====

// menu music
util.audio('https://files.cikazhel.net/zombies/sounds/chase.mp3').then(a => {
    window.audio_menu_music = a;
    a.volume = 0.1;
    a.loop = true;
    return a;
});

// sound effects
util.audio(BASE_URL.MISC+'boomcloud.wav').then(a => window.audio_boom_cloud = a);
util.audio(BASE_URL.HL1+'common/launch_glow1.wav').then(a => window.audio_button_hover = a);
util.audio(BASE_URL.HL1+'buttons/button3.wav').then(a => window.audio_button_click = a);
util.audio(BASE_URL.HL1+'common/menu2.wav').then(a => window.audio_audio_enabled = a);
util.audio(BASE_URL.HL1+'buttons/button1.wav').then(a => {
    window.audio_level_selected = a;
});

// player sounds
const player_hurt_sounds = [];
util.audio(BASE_URL.HL1+'player/pl_pain2.wav').then(a => player_hurt_sounds.push(a));
util.audio(BASE_URL.HL1+'player/pl_pain4.wav').then(a => player_hurt_sounds.push(a));
util.audio(BASE_URL.HL1+'player/pl_pain5.wav').then(a => player_hurt_sounds.push(a));
util.audio(BASE_URL.HL1+'player/pl_pain6.wav').then(a => player_hurt_sounds.push(a));
util.audio(BASE_URL.HL1+'player/pl_pain7.wav').then(a => player_hurt_sounds.push(a));

// gun/player sounds
util.audio(BASE_URL.HL1+'weapons/pl_gun3.wav').then(a => window.audio_gun_fire = a);
util.audio(BASE_URL.HL1+'buttons/bell1.wav').then(a => window.audio_player_kill = a);

// lose track and sound
util.audio(BASE_URL.HL1+'common/bodysplat.wav').then(a => window.audio_player_lose = a);
util.audio(BASE_URL.MISC+'unslept.mp3').then(a => {
    a.volume = 0.2;
    window.audio_player_lose_track = a;
});

// win track and sound
util.audio(BASE_URL.HL1+'common/bodysplat.wav').then(a => window.audio_player_win = a);
util.audio(BASE_URL.MISC+'qwerty.mp3').then(a => {
    a.volume = 0.5;
    window.audio_player_win_track = a;
});

// ==== drawing helpers ====

// draw text by anchor point (ax, ay from 0 to 1)
function draw_text_by_anchor(text, x, y, ax, ay, fontsize, fontface) {
    ctx.font = fontsize + "px " + fontface;
    const text_width = ctx.measureText(text).width; // get text width
    ctx.fillText(text, x-text_width*ax, y+fontsize-ay*fontsize);
}

// draw stroked text by anchor point (ax, ay from 0 to 1)
function draw_text_stroke_by_anchor(text, x, y, ax, ay, dx, fontsize, fontface) {
    ctx.font = fontsize + "px " + fontface;
    const text_width = ctx.measureText(text).width; // get text width
    ctx.lineWidth = dx; // set stroke width
    ctx.strokeText(text, x-text_width*ax, y+fontsize-ay*fontsize);
}

// draw shadowed text by anchor point (ax, ay from 0 to 1)
function draw_shadow_text(text, x, y, ax, ay, dx, dy, fontsize, fontface, style, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#222';
    draw_text_by_anchor(text, x+dx, y+dy, ax, ay, fontsize, fontface); // shadow

    ctx.globalAlpha = 1;
    ctx.fillStyle = style;
    draw_text_by_anchor(text, x, y, ax, ay, fontsize, fontface); // main
}

// draw stroked text by anchor point (ax, ay from 0 to 1)
function draw_stroked_text(text, x, y, ax, ay, dx, fontsize, fontface, style, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#222';
    draw_text_stroke_by_anchor(text, x, y, ax, ay, dx, fontsize, fontface); // stroke

    ctx.globalAlpha = 1;
    ctx.fillStyle = style;
    draw_text_by_anchor(text, x, y, ax, ay, fontsize, fontface); // main
}
 
// ==== actual game mechanics ====

// window focus
let window_focused = true;

// player stats
let player_score = 0;
let player_target_score = 0;
let player_max_health = 100;
let player_health = player_max_health;
let player_last_hurt = -100;

// level stats
let level_last_timestamp;
let level_end_time = 0;
let level_stopspawn_thread;
let level_done = false;
let level_spawners = [];
let level_duration = 0;
let level_active = null;
let level_time = 0;
let level_barts = [];
let level_resources = {};

// bart class
class Bart {

    // creates a new bart instance
    constructor(name) {
        // fetch bart data
        const bart = barts[name];
        
        // initialize properties
        this.data = bart;
        this.dead = false;
        this.start = level_time;
        this.pos_x = Math.random();
        this.hits = 0;
        this.last_hit_seed = 0.5;
        this.last_hit = 0;

        // hitbox
        this.box = {
            x: 0,
            y: 0,
            w: 0,
            h: 0
        };
        
        // play spawn sound
        util.play_random_sound(bart.sounds.spawn, {volume: 0.05, playbackRate: 0.9+Math.random()*0.2, preservesPitch: false});

        // add to level barts 
        level_barts.push(this);
    }

    // gets the image for this bart
    get_image() {
        return fetch_image('bart_'+this.data.name, this.data.image);
    }

    // gets the elapsed time for this bart
    get_elapsed() {
        return (level_time-this.start)*this.data.speed;
    }

    // gets the movement offset for this bart
    get_movement_offset() {
        const bart_elapsed = (level_time-this.start);
        return [
            0,
            -Math.abs(Math.sin(bart_elapsed*10))*this.data.bounce_height,
            Math.cos(bart_elapsed*10)*6
        ];
    }
}

// fetch image helper
function fetch_image(name, src) {

    // check cache first
    let result = level_resources[name];

    // if not cached, create new image and cache it
    if (!result) {
        result = new Image();
        result.src = src;
        level_resources[name] = result;
    }

    return result;
}

// // the assignment requires me to fetch the background using a switch sadly
// function fetch_bg(name) {
//     let result = level_resources[name];

//     if (!result) {
//         result = new Image();
//         result.src = src;
//         level_resources[name] = result;
//     }

//     return result;
// }

// gun properties
const gun_active_flashes = [];
let gun_active_shells = [];
let gun_x = 0;
let gun_y = 0;
let gun_last_fire = 0;

// gun recoil springs
let gun_recoil_spring_rot = new util.Spring({
    stiffness: 100,
    damping: 10
});
let gun_recoil_spring_x = new util.Spring({
    stiffness: 200,
    damping: 10
});
let gun_recoil_spring_y = new util.Spring({
    stiffness: 200,
    damping: 10
});

// gun fire function
function gun_fire() {

    // check if we can fire
    if (player_health === 0) return;
    if (level_done) return;
    
    gun_last_fire = level_time; // record last fire time
    util.play_sound(audio_gun_fire, {playbackRate: 1+Math.random()*0.1, preservesPitch: false, volume: 0.2}); // play gun fire sound

    // random recoil impulse
    const impulse_x = Math.random()*800-400;

    // apply recoil impulses
    gun_recoil_spring_rot.impulse(impulse_x*0.2);
    gun_recoil_spring_x.impulse(impulse_x);
    gun_recoil_spring_y.impulse(GUN_RECOIL);

    // add muzzle flash
    gun_active_flashes.push('tile'+String(Math.floor(Math.random()*15)).padStart(3,'0'));

    // add shell
    add_shell();

    // check for hits
    for (let idx = level_barts.length - 1; idx >= 0; idx--) {
        /**
         * @description the bart being checked
         * @type {Bart}
         */
        const bart = level_barts[idx];
        
        // check AABB collision
        if (!aabb(mouse_target_x, mouse_target_y, bart.box)) continue;

        // register hit
        bart.last_hit_seed = Math.random();
        bart.last_hit = level_time;
        bart.hits++;

        // play hurt sound
        util.play_random_sound(bart.data.sounds.hurt, {volume: 0.4, playbackRate: 1+Math.random()*0.2, preservesPitch: false});

        break;
    }
}

function add_shell() {

    // choose shell type
    const shell_name = 'shell'+String(Math.floor(Math.random()*2));

    // calculate shell velocity
    const vel_angle = util.random_float_inclusive(0, 1);
    const vel_x = Math.cos(vel_angle)*FX_SHELL_SPEED_X;
    const vel_y = -Math.sin(vel_angle)*FX_SHELL_SPEED_Y-600;

    // calculate shell rotation speed
    const vel_rot = 720+Math.random()*360;
    
    // add shell to active shells
    gun_active_shells.push({
        x: gun_x,
        y: gun_y,
        vel_x: vel_x,
        vel_y: vel_y,
        vel_rot: vel_rot,
        start: level_time,
        name: shell_name
    });
}

// AABB collision check
function aabb(x, y, box) {
    return (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h); // check if point is inside box
}

// prevent right click on the canvas
cnv_game.addEventListener('contextmenu', event => event.preventDefault());

// level lose function
async function level_lose() {

    // set end time and done state
    level_end_time = level_time;
    level_done = true;

    // pause music and play lose track if enabled
    if (LEVEL_TRACKS_ENABLED) {
        level_active.audio_track.pause();
        audio_player_lose_track.currentTime = 0;
        audio_player_lose_track.play();
    }

    // stop spawners
    if (level_stopspawn_thread) {
        clearTimeout(level_stopspawn_thread);
        level_stopspawn_thread = null;
    }
    level_spawners.forEach(thread => clearInterval(thread));

    // play lose sound
    util.play_sound(audio_player_lose, {volume: 0.5});

    // show buttons
    btn_game1.innerHTML = 'RUN THAT BACK!!!';
    btn_game1.classList.remove('hidden');
    btn_game2.innerHTML = 'i quit :(';
    btn_game2.classList.remove('hidden');
}

// level win function
async function level_win() {

    // set end time and done state
    level_end_time = level_time;
    level_done = true;

    // pause music and play win track if enabled
    if (LEVEL_TRACKS_ENABLED) {
        level_active.audio_track.pause();
        audio_player_win_track.currentTime = 0;
        audio_player_win_track.play();
    }

    // stop spawners
    if (level_stopspawn_thread) {
        clearTimeout(level_stopspawn_thread);
        level_stopspawn_thread = null;
    }
    level_spawners.forEach(thread => clearInterval(thread));

    // show buttons
    btn_game1.innerHTML = level_active.next ? 'NEXT LEVEL!!!' : 'IMMA DO IT AGAIN!!!';
    btn_game1.classList.remove('hidden');
    btn_game2.innerHTML = 'i wanna switch :(';
    btn_game2.classList.remove('hidden');
}

// level load function
async function level_load(level) {

    // stop previous level music if any
    if (level_active && LEVEL_TRACKS_ENABLED) {
        level_active.audio_track.pause();
        audio_player_win_track.pause();
        audio_player_lose_track.pause();
    }

    // reset canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    cnv_game.style.display = 'block';

    // HUGE chunk of initialization
    mouse_target_x = CANVAS_WIDTH/2;
    mouse_target_y = 200;
    mouse_x_diff = 0;
    mouse_x = mouse_target_x;
    mouse_y = mouse_target_y+1200;
    gun_active_shells = [];
    gun_last_fire = -100;
    player_health = player_max_health;
    player_last_hurt = -100;
    player_score = 0;
    player_target_score = 0;
    level_last_timestamp = null;
    level_end_time = 0;
    level_stopspawn_thread = null;
    level_done = false;
    level_spawners = [];
    level_duration = 0;
    level_time = 0;
    level_barts = [];
    level_resources = {};
    level_active = level;

    // set timescale back to 1
    set_timescale(1);

    // setup spawners
    for (const [enemy_name, enemy_data] of Object.entries(level.enemies)) {

        // calculate level duration based on enemy spawn data
        level_duration = Math.max(level_duration, enemy_data.interval*(enemy_data.count-1) + (LEVEL_BART_MAX_TIME*1000 / barts[enemy_name].speed) + enemy_data.delay);
        
        // setup spawner timestamps
        for (let idx = 0; idx < enemy_data.count; idx++) {
            const enemy_spawner_thread = setTimeout(() => {
                new Bart(enemy_name);
            }, enemy_data.interval*idx+enemy_data.delay);
            level_spawners.push(enemy_spawner_thread);
        }
    }

    // add 1 second buffer to level duration
    level_duration += 1000;

    // setup level stop spawner thread
    level_stopspawn_thread = setTimeout(() => {
        level_stopspawn_thread = null;
        level_spawners.forEach(thread => clearInterval(thread));
    }, level_duration);

    // play level music if enabled
    if (LEVEL_TRACKS_ENABLED) {
        level_active.audio_track.currentTime = 0;
        level_active.audio_track.play();
    }

    // start level tick if not already started
    if (level_tick.tick_active) return;
    level_tick.tick_active = true;
    level_tick();
}

// next or restart button handler
btn_game1.addEventListener('click', () => {

    // hide buttons
    btn_game1.classList.add('hidden');
    btn_game2.classList.add('hidden');

    // reload level or load next level
    player_health > 0 ?
        level_load(level_active.next ? levels[level_active.next] : level_active) :
        level_load(level_active);
});

// switch button handler
btn_game2.addEventListener('click', () => {

    // hide buttons
    btn_game1.classList.add('hidden');
    btn_game2.classList.add('hidden');
    cnv_game.style.display = 'none';

    // show level selector and listen for level clicks
    div_levelbuttonscontainer.addEventListener('click', onLevelClick);
    btn_titlescreen_button.addEventListener('click', titlescreenOnClick, {once: true});
    
    // show title screen
    util.transition(
        // element
        div_titlescreen,

        // instant pre-transition (add class, remove class)
        null, 'hidden',

        // transition (add or del, effect)
        'add', 'active',

        // instant post-transition (add class, remove class)
        null, null,

        // keep transition class
        true
    );

    // stop previous level music if any
    if (LEVEL_TRACKS_ENABLED) {
        level_active.audio_track.pause();
        audio_player_win_track.pause();
        audio_player_lose_track.pause();
    }
});

// mouse position variables
let mouse_contained = false;
let mouse_target_x = CANVAS_WIDTH/2;
let mouse_target_y = 200;
let mouse_x_diff = 0;
let mouse_x = mouse_target_x;
let mouse_y = mouse_target_y+1200;

// mouse move handler
document.addEventListener("mousemove", e => {

    // only track if over canvas and level is active
    if (!level_active) return;
    if (level_done) return;

    // get canvas rect
    const rect = cnv_game.getBoundingClientRect();

    // calculate scale
    const scale_x = cnv_game.width / rect.width;
    const scale_y = cnv_game.height / rect.height;

    // validate scale
    if (!(scale_x > 0 && scale_y > 0)) return;

    // check if mouse is contained
    mouse_contained = !(e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom);
    if (!mouse_contained) return;

    // calculate target mouse position
    mouse_target_x = (e.clientX - rect.left) * scale_x;
    mouse_target_y = (e.clientY - rect.top) * scale_y;
});

// mouse down handler
document.addEventListener("mousedown", e => {
    // only fire if left button, over canvas, and level is active
    if (e.target !== cnv_game) return;
    if (!level_active) return;
    if (e.buttons != 1) return;
    gun_fire();
});

// initial dt
let dt = 1/60;

// renders a frame to the canvas
function level_draw() {

    // save context
    ctx.save();

    // fix canvas coordinate system by making 0, 0 be the canvas center
    ctx.translate(CANVAS_WIDTH*0.5,CANVAS_HEIGHT*0.5);

    // now we can apply rotations and itll be centered
    const camera_x = -BG_PARALLAX*(mouse_x-CANVAS_WIDTH*0.5)-gun_recoil_spring_x.position;
    const camera_y = -BG_PARALLAX*(mouse_y-CANVAS_HEIGHT*0.5)-gun_recoil_spring_y.position;

    // apply camera parallax
    if (CAMERA_PARALLAX_ENABLED) {
        ctx.rotate((mouse_x_diff*0.1-gun_recoil_spring_rot.position)*Math.PI/180);
        ctx.translate(camera_x, camera_y);
    }

    // fetch level display data
    const display = level_active.display;

    // render - draw background
    const bg_img = fetch_image('img_background', display.img_background, 0.2);
    if (bg_img) {

        // calculate background position
        const bg_x = -CANVAS_WIDTH*BG_SCALE*0.5;
        const bg_y = -CANVAS_HEIGHT*BG_SCALE*0.5;

        // set global alpha based on player health
        ctx.globalAlpha = level_done ? 0.1 : util.clamp(player_health/player_max_health, 0.2, 1);
        
        // draw background
        ctx.drawImage(
            bg_img,
            bg_x,
            bg_y,
            CANVAS_WIDTH*BG_SCALE,
            CANVAS_HEIGHT*BG_SCALE
        );

        // reset global alpha
        ctx.globalAlpha = 1;
    }

    // render - draw barts
    level_barts.forEach(/** @param {Bart} bart */ bart => {

        // fetch bart image and validate
        let bart_image = bart.get_image();
        if (!bart_image) {
            console.log('could not draw bart', bart);
            return;
        }

        // calculate bart properties
        const bart_hit_elapsed = level_time-bart.last_hit;
        const bart_elapsed = bart.get_elapsed();
        const bart_scale = 0.1*bart_elapsed**2;

        // get bart movement offset
        const [bart_dx, bart_dy, bart_dr] = bart.get_movement_offset();

        // calculate bart drawing properties
        const bart_width = bart_image.width*bart_scale;
        const bart_height = bart_image.height*bart_scale;

        // calculate bart position
        const bart_x = bart_image.width*(bart.pos_x-0.5)-bart_width/2+bart_dx*bart_scale*100;
        const bart_y = -bart_height/2+bart_dy*bart_scale*100;

        // calculate bart rotation
        const bart_rot = (Math.max((1-bart_hit_elapsed)**4, 0)*(bart.last_hit_seed-0.5))*20+bart_dr;

        // update bart hitbox
        bart.box.w = (bart_image.width+bart.data.hitbox_adjust.x)*bart_scale;
        bart.box.h = (bart_image.height+bart.data.hitbox_adjust.y)*bart_scale;
        bart.box.x = camera_x+CANVAS_WIDTH/2+bart_image.width*(bart.pos_x-0.5)-bart.box.w/2+bart_dx*bart_scale*100;
        bart.box.y = camera_y+CANVAS_HEIGHT/2-bart.box.h/2+bart_dy*bart_scale*100;

        // save context and draw bart
        ctx.save();

        // this will move the bart to a position where the center is at the proper placement
        ctx.translate(bart_x+bart_width/2, bart_y+bart_height/2);
        ctx.rotate(bart_rot*Math.PI/180);
        ctx.translate(-bart_width/2, -bart_height/2);

        ctx.drawImage(
            bart_image,
            0,
            0,
            bart_width,
            bart_height
        );

        // restore context
        ctx.restore();
    });

    // gun drawing section

    // calculate gun position
    gun_x = mouse_x-CANVAS_WIDTH*0.5+gun_recoil_spring_x.position;
    gun_y = CANVAS_HEIGHT*0.5-110+Math.abs(mouse_x_diff)+mouse_y*0.2+gun_recoil_spring_y.position*2;

    // draw muzzle flash
    let flash_name = gun_active_flashes.pop();
    if (flash_name) {

        // calculate flash properties
        const flash_scale = 0.8+Math.random()*0.2;
        const flash_width = CANVAS_WIDTH*flash_scale;
        const flash_height = CANVAS_HEIGHT*flash_scale;
        const flash_dx = 10+Math.random()*5;
        const flash_dy = -50+Math.random()*5;

        // fetch flash image
        let flash_img = fetch_image(flash_name, './images/flash/'+flash_name+'.png');
        if (flash_img && flash_img.complete) {
            ctx.save(); // save context
            
            // translate to gun position and draw flash using lighter blend mode
            ctx.translate(gun_x, gun_y);
            ctx.globalAlpha = 0.8;
            ctx.globalCompositeOperation = 'lighter';

            // draw flash image
            ctx.drawImage(
                flash_img,
                -flash_width/2+flash_dx,
                -flash_height/2+flash_dy,
                flash_width,
                flash_height
            );

            ctx.restore(); // restore context
        } else {
            // if flash image not loaded, push back to active flashes
            gun_active_flashes.unshift(flash_name);
        }
    }

    // get gun image based on recoil state
    let gun_img = level_time-gun_last_fire < 0.1 ?
        fetch_image('gun_recoil', './images/gun_recoil.png') :
        fetch_image('gun_default', './images/gun_default.png');
    
    if (gun_img) {
        ctx.save(); // save context

        // calculate gun properties
        const gun_width = CANVAS_WIDTH*0.5;
        const gun_height = CANVAS_HEIGHT*0.5;
        const gun_dx = 0;
        const gun_dy = 0;
        
        // translate to gun position and rotate based on recoil
        ctx.translate(gun_x, gun_y);
        ctx.rotate((mouse_x_diff+gun_recoil_spring_rot.position)*Math.PI/180);

        // draw gun image centered
        ctx.drawImage(
            gun_img,
            -gun_width*0.5+gun_dx,
            -gun_height*0.5+gun_dy,
            gun_width,
            gun_height
        );
        
        ctx.restore(); // restore context
    }

    // draw shells
    gun_active_shells.forEach((shell, idx) => {

        // fetch shell image
        const shell_img = fetch_image(shell.name, 'images/shells/'+shell.name+'.png');
        if (!shell_img) return;
        
        // calculate shell elapsed time and check lifetime
        const shell_elapsed = level_time-shell.start;
        if (shell_elapsed > FX_SHELL_LIFETIME) {
            gun_active_shells.splice(idx, 1);
            return;
        }

        // calculate shell drawing properties
        const shell_x = shell.x;
        const shell_y = shell.y;
        const shell_width = shell_img.width*0.1;
        const shell_height = shell_img.height*0.1;

        // calculate shell position based on physics
        const shell_dx = (shell.vel_x+mouse_x_diff)*shell_elapsed;
        const shell_dy = shell.vel_y*shell_elapsed+0.5*FX_GRAVITY*shell_elapsed**2;

        ctx.save(); // save context

        // translate to shell position and rotate based on elapsed time

        ctx.translate(shell_x+shell_dx, shell_y+shell_dy);
        ctx.rotate(shell_elapsed*shell.vel_rot*Math.PI/180);
        ctx.translate(-shell_width/2, -shell_height/2);

        // draw shell image
        ctx.drawImage(
            shell_img,
            0,
            0,
            shell_width,
            shell_height
        );

        ctx.restore(); // restore context
    });
    
    ctx.restore(); // restore context

    // ==== overlays ====

    // draw hurt overlay

    ctx.save(); // save context

    // draw red hurt overlay
    const player_hurt_elapsed = level_time-player_last_hurt;
    ctx.globalAlpha = Math.max(1-player_hurt_elapsed, 1-(player_health/player_max_health)); // fade out over 1 second
    ctx.fillStyle = '#ff0000';
    ctx.globalCompositeOperation = 'multiply'; // multiply blend mode
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); // fill entire canvas

    ctx.restore(); // restore context

    // draw da geen overlay
    
    // calculate level end elapsed time
    const level_end_elapsed = level_time-level_end_time;
    if (level_done) {
        ctx.save();

        // draw green overlay
        ctx.globalAlpha = Math.max(1-Math.tanh(level_end_elapsed), 0.4); // fade out with tanh for smoothness
        ctx.fillStyle = '#00ff00';
        ctx.globalCompositeOperation = 'multiply'; // multiply blend mode
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.restore();
    }

    // ==== draw UI ====

    // prepare UI texts
    const hp_text = String(player_health).padStart(3, '0')+' HP';
    const [time_int, time_frac] = Math.max(level_duration/1000-level_time,0).toFixed(3).split('.');
    const time_text = 'ETA: '+time_int.padStart(2, '0')+'.'+time_frac+' SECONDS';

    if (level_done && level_end_elapsed < 1) {
        // wait to ease out score
        player_score = 0;
    }
    const score_text = String(player_score).padStart(6, '0')+' PTS';
    
    ctx.save(); // save context

    // draw HP, score, and time texts
    if (level_done) {

        // calculate shift amount
        const shift = level_end_elapsed**2;

        // draw with shifting effect

        draw_stroked_text(
            hp_text,
            6, -Math.min(shift, 1)*10,
            0, Math.min(shift, 1),
            6,
            24, 'Seven Segment',
            '#fff', 1
        );

        draw_stroked_text(
            time_text,
            -6+CANVAS_WIDTH, -Math.min(shift, 1)*10,
            1, Math.min(shift, 1),
            6,
            24, 'Seven Segment',
            '#fff', 1
        );

        draw_stroked_text(
            score_text,
            util.lerp(-6+CANVAS_WIDTH, CANVAS_WIDTH/2, Math.tanh(level_end_elapsed*2)), // x
            util.lerp(CANVAS_HEIGHT-12, 24, Math.tanh(level_end_elapsed*2)), // y
            util.lerp(0, 0.5, Math.tanh(level_end_elapsed*2)), // ax
            util.lerp(1, 0, Math.tanh(level_end_elapsed*2)), // ay
            6,
            util.lerp(24, 48, Math.tanh(level_end_elapsed*2)), 'Seven Segment',
            '#fff', 1
        );

        // draw win/lose text
        if (player_health>0) {
            draw_stroked_text(
                "YOU SUCCEEDED!!!",
                CANVAS_WIDTH/2, CANVAS_HEIGHT/2,
                0.5, 0.5,
                6,
                Math.tanh(level_end_elapsed*2)*48, 'Comic Sans MS', // tanh for smooth zoom
                '#fff', 1
            );
        } else {
            draw_stroked_text(
                "you lost.",
                CANVAS_WIDTH/2, CANVAS_HEIGHT/2,
                0.5, 0.5,
                6,
                Math.tanh(level_end_elapsed*2)*48, 'Times New Roman', // tanh for smooth zoom
                '#fff', 1
            );
        }
    } else {

        // draw normally

        draw_stroked_text(
            hp_text,
            6, 0,
            0, 0,
            6,
            24, 'Seven Segment',
            '#fff', 1
        );

        draw_stroked_text(
            time_text,
            -6+CANVAS_WIDTH, 0,
            1, 0,
            6,
            24, 'Seven Segment',
            '#fff', 1
        );

        draw_stroked_text(
            score_text,
            -6+CANVAS_WIDTH, CANVAS_HEIGHT-12,
            1, 1,
            6,
            24, 'Seven Segment',
            '#fff', 1
        );
    }

    ctx.restore(); // restore context

    // draw hitboxes (debug)

    if (DEV_DRAW_HITBOXES) {
        ctx.save(); // save context

        // draw red hitboxes with 50% alpha
        ctx.fillStyle = 'red';
        ctx.globalAlpha = 0.5;

        // draw bart hitboxes
        level_barts.forEach(/** @param {Bart} bart */ bart => {
            let bart_image = bart.get_image();
            if (!bart_image) {
                console.log('could not draw bart hitbox', bart);
                return;
            }
            
            ctx.fillRect(bart.box.x, bart.box.y, bart.box.w, bart.box.h);
        });
        
        ctx.restore(); // restore context
    }
}

// updates the game's state
async function level_tick(timestamp) {

    // wait for focus if not focused
    if (!window_focused) {
        const start = Date.now();
        await new Promise(resolve => {
            document.addEventListener('focus', resolve, {once: true});
        });
        const end = Date.now();

        // adjust timestamps to account for wait time
        level_last_timestamp += end-start;
        timestamp += end-start;
    }

    // schedule next tick
    requestAnimationFrame(level_tick);

    // check if level is active
    if (!level_active) return;

    // calculate dt
    if (!level_last_timestamp) {
        dt = 1/60;
        level_last_timestamp = timestamp-1000/60;
    } else {
        dt = Math.min((timestamp - level_last_timestamp) / 1000, 1);
        dt *= LEVEL_TIMESCALE;
        level_last_timestamp = timestamp;
        level_time += dt;
    }

    // update gun recoil springs
    gun_recoil_spring_rot.update(dt);
    gun_recoil_spring_x.update(dt);
    gun_recoil_spring_y.update(dt);

    // update mouse position with smoothing
    let blend1 = Math.min(1, dt * 60 * 0.1);
    let blend2 = Math.min(1, dt * 60 * 0.2);

    // update mouse position with lerp for smoothness
    let goto = util.lerp(mouse_x, mouse_target_x, blend1);
    mouse_x_diff = util.lerp(mouse_x_diff, goto - mouse_x, blend2);
    mouse_x = goto;
    mouse_y = util.lerp(mouse_y, mouse_target_y, blend1);

    // sort barts by elapsed time for proper rendering order
    level_barts.sort((a, b) => a.get_elapsed()-b.get_elapsed());
    
    // check barts for timeout or death
    level_barts.forEach(/** @param {Bart} bart */ (bart, idx) => {

        // check if bart is too old or dead
        const bart_elapsed = bart.get_elapsed();
        const bart_too_long = bart_elapsed > LEVEL_BART_MAX_TIME;
        const bart_dead = bart.hits >= bart.data.health;
        if (!(bart_too_long || bart_dead)) return;
        
        // remove bart from active barts
        level_barts.splice(idx, 1);
        if (bart_too_long) {
            damage(bart.data.damage); // damage player if bart timed out
            return;
        }

        // play kill sound
        util.play_sound(audio_player_kill, {volume: 0.5, playbackRate: 0.9+Math.random()*0.2, preservesPitch: false});

        // increase player score
        player_target_score += bart.data.score;
    });

    // smoothly update player score towards target score
    if (player_score < player_target_score) {
        const score_diff = player_target_score - player_score;
        const score_increase = Math.max(1, Math.floor(score_diff * dt * 5));
        player_score += score_increase;
        player_score = Math.min(player_score, player_target_score);
    }

    // draw level
    level_draw(dt);
    
    // check for bart hover
    if (level_tick.hover == undefined) {
        level_tick.hover = false;
    }
    
    // reset hover state
    let hover = false;

    // set crosshair
    for (let idx = level_barts.length - 1; idx >= 0; idx--) {
        /**
         * @description the bart being checked
         * @type {Bart}
         */
        const bart = level_barts[idx];

        // check AABB collision
        if (!aabb(mouse_target_x, mouse_target_y, bart.box)) continue;

        // set hover state and break
        hover = true;
        break;
    }

    // update hover class if changed
    if (level_tick.hover !== hover) {
        level_tick.hover = hover;
        hover ? cnv_game.classList.add('bart-hover') : cnv_game.classList.remove('bart-hover');
    }

    // check if we can win
    if (!level_done && level_duration/1000-level_time <= 0) {
        level_done = true;
        level_win();
    }
}

// player methods

async function damage(amount) {
    // check if level is done
    if (level_done) return;

    // record last hurt time
    player_last_hurt = level_time;

    // apply recoil based on damage amount
    const scale = (amount/player_max_health)*10;
    gun_recoil_spring_x.impulse((Math.random()*2-1)*scale*200);
    gun_recoil_spring_y.impulse((Math.random()*2-1)*scale*200);
    gun_recoil_spring_rot.impulse((Math.random()*2-1)*scale*200);
    
    // play hurt sound
    util.play_random_sound(player_hurt_sounds, {volume: 0.7});

    // reduce health and check for death
    player_health = Math.max(player_health-amount, 0);
    if (player_health > 0) return;

    // run lose sequence
    level_lose();
}

// ==== UI logic ====

// initial audio notice state
div_audionotice.classList.add('state1');

// audio notice click handler
document.addEventListener('click', async () => {

    // play audio enable sound
    util.play_sound(audio_audio_enabled, {volume: 0.1, playbackRate: 0.4});

    // hide audio notice
    await util.transition(
        // element
        div_audionotice,

        // instant pre-transition (add class, remove class)
        null, null,

        // transition (add or del, effect)
        'add', 'state2',

        // instant post-transition (add class, remove class)
        null, null,

        // keep transition class
        false
    );

    div_audionotice.remove(); // remove from DOM

    // show title screen
    await util.transition(
        // element
        div_titlescreen,

        // instant pre-transition (add class, remove class)
        null, 'hidden',

        // transition (add or del, effect)
        'add', 'active',

        // instant post-transition (add class, remove class)
        null, null,

        // keep transition class
        true
    );
}, {once: true});

// title screen button click handler
async function titlescreenOnClick() {

    // begin level selector show process

    await util.transition(
        // element
        div_titlescreen,

        // instant pre-transition (add class, remove class)
        null, null,

        // transition (add or del, effect)
        'del', 'active',

        // instant post-transition (add class, remove class)
        'hidden', null,

        // keep transition class
        false
    );

    await util.transition(
        // element
        div_levelselectorscreen,

        // instant pre-transition (add class, remove class)
        null, 'hidden',

        // transition (add or del, effect)
        'add', 'active',

        // instant post-transition (add class, remove class)
        null, null,

        // keep transition class
        true
    );
}

// attach title screen button handler
btn_titlescreen_button.addEventListener('click', titlescreenOnClick, {once: true});

// level selector screen click handler
async function onLevelClick(e) {
    const closest_button = e.target.closest('.level-button');
    if (!closest_button) return;
    
    const level_name = closest_button.dataset.levelName;
    if (!level_name || !(level_name in levels)) {
        console.error('invalid level selected:', level_name);
        return;
    }

    // begin level load process
    div_levelbuttonscontainer.removeEventListener('click', onLevelClick);

    util.play_sound(audio_level_selected, {volume: 1, playbackRate: 0.7, preservesPitch: false});
    
    await util.transition(
        // element
        div_levelselectorscreen,

        // instant pre-transition (add class, remove class)
        null, null,

        // transition (add or del, effect)
        'del', 'active',

        // instant post-transition (add class, remove class)
        'hidden', null,

        // keep transition class
        false
    );

    level_load(levels[level_name]);
}

// attach level button handler
div_levelbuttonscontainer.addEventListener('click', onLevelClick);

// add click sound to all buttons except those with data-nosound
document.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.nosound) return;
    util.play_sound(audio_button_click, {volume: 0.1, playbackRate: 0.8});
});

// add hover sound to all buttons except those with data-nosound
document.addEventListener('mouseover', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.nosound) return;
    util.play_sound(audio_button_hover, {volume: 0.1});
});

// ==== window focus logic ====

// listen for window focus event
document.addEventListener('focus', () => {
    window_focused = true;
});

// listen for window blur event
document.addEventListener('blur', () => {
    window_focused = false;
});