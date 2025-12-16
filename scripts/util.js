// utility wait for animation frame function
export function waitForAnimationFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
}

// utility wait function
export function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// audio loading utility
export async function audio(url) {
    const res = fetch(url);
    const a = URL.createObjectURL(await (await res).blob());
    return new Audio(a);
}

// wait for transition end utility
export function waitForTransition(element) {
    return new Promise(resolve => {
        element.addEventListener('transitionend', function _onend(e) {
            if (e.target !== element) return;
            element.removeEventListener('transitionend', _onend);
            resolve();
        });
    });
}

// force reflow utility
export function reflow(e) {
    void e.offsetHeight;
}

// transition utility
export async function transition(
    element,
    effect_pre_add,
    effect_pre_remove,
    add_or_remove, effect,
    effect_post_add,
    effect_post_remove,
    keep_transition_class = false
) {
    if (transition.debug) {
        console.log("transition:", element);
        console.log("pre_add:", effect_pre_add);
        console.log("effect_pre_remove:", effect_pre_add);
    }
    
    effect_pre_add && element.classList.add(effect_pre_add);
    effect_pre_remove && element.classList.remove(effect_pre_remove);

    reflow(element); // force reflow
    
    if (add_or_remove === "add") {
        transition.debug && console.log("add:", effect);
        element.classList.add(effect);
    } else if (add_or_remove === "del") {
        transition.debug && console.log("delete:", effect);
        element.classList.remove(effect);
    } else {
        transition.debug && console.log("toggle:", effect);
        element.classList.toggle(effect);
    }

    // reflow(element); // force reflow
    await waitForAnimationFrame();
    
    // await new Promise(requestAnimationFrame); // wait a frame to avoid receiving the wrong transitionend
    await waitForTransition(element);

    keep_transition_class || element.classList.remove(effect);

    if (transition.debug) {
        console.log("keep_transition_class:", keep_transition_class);
        console.log("post_add:", effect_post_add);
        console.log("post_remove:", effect_post_remove);
    }

    effect_post_add && element.classList.add(effect_post_add);
    effect_post_remove && element.classList.remove(effect_post_remove);
}
transition.debug = false;

// play sound utility
export function play_sound(clip, properties) {
    const sound = clip.cloneNode(true);
    for (const key in properties) {
        sound[key] = properties[key];
    }
    for (const [key, value] of Object.entries(play_sound.meta_properties)) {
        if (clip[key]) sound[value] = clip[key];
    }
    sound.playbackRate *= play_sound.timescale || 1;
    sound.play();
    sound.addEventListener('ended', sound.remove);
}
play_sound.meta_properties = {
    "meta_volume": "volume"
};

export function play_random_sound(clips, properties) {
    play_sound(clips[random_int_inclusive(0, clips.length-1)], properties);
}

// rng utilities

export function random_float_inclusive(start, end) {
    return start+Math.random()*(end-start);
}

export function random_int_inclusive(start, end) {
    return Math.round(random_float_inclusive(start, end));
}

// lerp utility
export function lerp(a, b, t) {
    return a * (1 - t) + b * t;
}

// clamp utility
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// spring class
export class Spring {
    constructor({
        stiffness = 200,
        damping = 20
    } = {}) {
        this.position = 0;
        this.velocity = 0;
        this.stiffness = stiffness;
        this.damping = damping;
    }

    update(dt) {
        const force = -this.stiffness * this.position;
        const damp  = -this.damping * this.velocity;

        const accel = force + damp;

        this.velocity += accel * dt;
        this.position += this.velocity * dt;
    }

    impulse(size) {
        this.velocity += size;
    }
}