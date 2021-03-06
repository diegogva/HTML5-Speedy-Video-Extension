
// defaults
var default_speed = 1.0; // initial playback speed
var default_delta = 0.2; // smallest increment or decrement of playback speed
var default_skip_small = 2; // number of seconds to (small) skip or rewind the video
var default_skip_big = 10; // number of seconds to (big) skip or rewind the video
var default_autoplay = false; // flag for autoplay the video
var debug = false; // flag to disable or enable console log debug info
var default_stop_video_timeout = 15000; // timeout in milliseconds before stop pausing the video
var max_tries_finding_video = 150; // max number of tries to finding the video
var youtube_playerbar_name_class = ".ytp-chrome-controls"; // name class of youtube player bar
var videojs_playerbar_name_class = ".vjs-control-bar"; // name class of VideoJS player bar
var netflix_playerbar_name_class = ".player-status"; // name class of Netflix player bar
var faster_text = "&#9758;";
var slower_text = "&#9756;";

// internal variables
var tries = 0;
var my_video; // = undefined;
var ignore_keyshorts = false;
var timeout_finding_video;
var timeout_pausing_video;
var timeout_finding_status_bar;
var currentURL = window.location.href;

// var observer = new MutationObserver(function(changes) {
//     changes.forEach(function(change) {
//         log("type: " + change.type);
//         log("name: " + change.name);
//         log("old value: " + change.oldValues);
//     })
// });
// observer.observe($("#watch-discussion"), {childList: true, subtree: true, attributes: true });

// necessary test to only launch the extension 1 time per page (at least on safari)
if (window.top === window) {
    log("Starting Speedy Video");
    // turn ON autoplay for netflix
    if (at_netflix()) { default_autoplay = true; }
    // check if we are in the sub-page that's supposed to have a video tag -> this avoid the keyshorts messing with the page
    if (currentURL.indexOf("watch") >= 0 || currentURL.indexOf("Anime") >= 0 ) {
        // try running setup() 4 times per second until we find the video tag or reach
        // the maximum number of tries 'max_tries_finding_video'
        timeout_finding_video = window.setInterval(setup, 250);
    } else {
        log("URL changed, but no \"watch\" in it.");
    }
    window.setInterval(check_changed_url, 100);
}


function check_changed_url() {
    if(window.location.href != currentURL) {
        log("old: " + currentURL);
        log("new :" + window.location.href);
        // update new url
        currentURL = window.location.href
        if (currentURL.indexOf("watch") >= 0 || currentURL.indexOf("Anime") >= 0 ) {
            // try finding a new video tag
            clearInterval(timeout_pausing_video);
            clearInterval(timeout_finding_video);
            tries = 0;
            // try running setup() 4 times per second until we find the video tag or reach
            // the maximum number of tries 'max_tries_finding_video'
            timeout_finding_video = window.setInterval(setup, 250);
        } else {
            log("URL changed, but no \"watch\" in it.");
        }
    }
}

function setup() {
    tries++;
    // try to find a valid video tag
    // this may not work well with pages with multiple videos, but I did not find
    // this an issue with youtube, etc.
    my_video = $("video")[0];
    if(my_video !== undefined) {
        log("We found a video tag!");
        //stop trying to find the video tag
        clearInterval(timeout_finding_video);
        // try to stop (or not) the autoplay
        deal_with_autoplay();
        // add buttons to the video player to show current speed and to speed up or down
        timeout_finding_status_bar = window.setInterval(add_buttons_player, 250);
        // set up keyboard shortcuts
        setup_shorcuts();
        // add events to toggle keyboard shortcuts on/off when entering an input box
        $(":text, .textarea, textarea, input, div[role*='textbox']").each(
            function() { toggle_keyshorts($( this )); }
        );
    } else {
        if( tries >= max_tries_finding_video ) {
            log("No video tag found after " + tries + " tries!");
            clearInterval(timeout_finding_video);
        } else {
            log("NO HTML5 video tag yet! Try #" + tries);
        }
    }
}

function deal_with_autoplay() {
    my_video.autoplay = default_autoplay;
    if ( ! default_autoplay) {
        // try to stop the video
        my_video.pause();
        // set up a recurring function to stop the video from playing.
        // this expires after 'default_stop_video_timeout' milliseconds or
        // when the user uses the space key to resume the video.
        timeout_pausing_video = setInterval( function(){
            if(my_video !== undefined) {
                my_video.pause();
            }
        }, 100);
        setTimeout(function(){
            clearInterval(timeout_pausing_video);
            clearInterval(timeout_finding_status_bar);
        }, default_stop_video_timeout);
    }
}

// TODO: show the current speed as an overlay on top of the video, when changing speed
function add_speed_message_overlay() {
}

function add_buttons_player() {
    log("Trying to add the control buttons on the player status bar");
    if($("#speedy_extension_addon_2_player")[0] == undefined) {
        $("<div id=\"speedy_extension_addon_2_player\"></div>").appendTo(youtube_playerbar_name_class);
        $("<div id=\"speedy_extension_addon_2_player\"></div>").appendTo(videojs_playerbar_name_class);
        $("<span id=\"speedy_extension_addon_2_player\"></span>").appendTo(netflix_playerbar_name_class);
        $("<button id=\"speedy_speed_down\" class=\"speedy_button left_button\">"+slower_text+"</button>").appendTo("#speedy_extension_addon_2_player");
        $("<b class=\"speedy_tag\"><span id=\"speedy_video_speed\">1.0</span> X</b>").appendTo("#speedy_extension_addon_2_player");
        $("<button id=\"speedy_speed_up\" class=\"speedy_button\">"+faster_text+"</button>").appendTo("#speedy_extension_addon_2_player");
        $('#speedy_video_speed').html(my_video.playbackRate.toFixed(1));
        $("#speedy_speed_down").click(function() { delta_speed( - default_delta); });
        $("#speedy_speed_up" ).click(function() { delta_speed( + default_delta); });
    } else {
        clearInterval(timeout_finding_status_bar);
    }
}

function delta_speed(x){
        my_video.playbackRate+=x;
        $('#speedy_video_speed').html(my_video.playbackRate.toFixed(1));
}

function absolute_speed(x){
        my_video.playbackRate=x;
        $('#speedy_video_speed').html(my_video.playbackRate.toFixed(1));
}

function setup_shorcuts() {
    $( "body" ).keydown(function() {
        if (ignore_keyshorts === false && $(":text:focus").length === 0) {
            log("Not ignoring keys!"+ event.which);
            switch (event.which) {
                case  187 : // +
                    log_prevent("speed up",event);
                    delta_speed(default_delta);
                    break;
                case 189 : // -
                    log_prevent("slow down",event);
                    delta_speed(-default_delta);
                    break;
                case 48 : // 0
                case 49 : // 1
                    log_prevent("speed 1",event);
                    absolute_speed(1);
                    break;
                case 50 : // 2
                    log_prevent("speed 2",event);
                    absolute_speed(2);
                    break;
                case 51 : // 3
                    log_prevent("speed 2.5",event);
                    absolute_speed(2.5);
                    break;
                case 52 : // 4
                    log_prevent("speed 3",event);
                    absolute_speed(3);
                    break;
                // case 82 : // r
                //     log_prevent("replay",event);
                //     if (my_video.ended) { my_video.play(); }
                //     break;
                case 32 : // space
                    log_prevent("space",event);
                    clearInterval(timeout_pausing_video);
                    if (my_video.paused) { my_video.play(); }
                    else {  my_video.pause(); }
                    break;
                case 39 : // right arrow
                    if (at_netflix()) {break;} // this crashes the netflix page
                    log_prevent("right",event);
                    my_video.currentTime+=default_skip_small;
                    break;
                case 37 : // left arrow
                    if (at_netflix()) {break;} // this crashes the netflix page
                    log_prevent("left",event);
                    my_video.currentTime-=default_skip_small;
                    break;
                case 38 : // up arrow
                    if (at_netflix()) {break;} // this crashes the netflix page
                    log_prevent("up",event);
                    my_video.currentTime+=default_skip_big;
                    break;
                case 40 : // down arrow
                    if (at_netflix()) {break;} // this crashes the netflix page
                    log_prevent("down",event);
                    my_video.currentTime-=default_skip_big;
                    break;
                case 70 : // f
                    log_prevent("fullscreen",event);
                    if((window.fullScreen) || (window.innerWidth == screen.width && window.innerHeight == screen.height)) {
                        // browser is almost certainly fullscreen
                        log("It's already in fullscreen.");
                        my_video.webkitExitFullScreen();
                    } else {
                        log("Entering fullscreen.");
                        var full_videojs = $(".vjs-fullscreen-control")[0];
                        var full_youtube = $(".ytp-fullscreen-button");
                        if(full_videojs !== undefined) {
                            eventFire(full_videojs, "click");
                        } else if (full_youtube !== undefined) {
                            eventFire(full_youtube, "click");
                        }
                    }
                    break;
            }
        } else {
            log("Ignoring keys!");
        }
    });
}

function eventFire(el, etype){
    if (el.fireEvent) {
        (el.fireEvent('on' + etype));
    } else {
        var evObj = document.createEvent('Events');
        evObj.initEvent(etype, true, false);
        el.dispatchEvent(evObj);
    }
}

function toggle_keyshorts(obj) {
    obj.focus(function(){
        log("Input IN");
        ignore_keyshorts = true;
    });
    obj.blur(function(){
        log("Input OUT");
        ignore_keyshorts = false;
    });
}

function log_prevent(string, event) {
    log(string);
    event.preventDefault();
}

function log(string) {
    if (debug) {
        console.log(string);
    }
}

function at_netflix() {
    if (currentURL.indexOf("netflix") >= 0) {
        return true;
    } else {
        return false;
    }
}


