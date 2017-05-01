(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.VRView = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var has = Object.prototype.hasOwnProperty;

//
// We store our EE objects in a plain object whose properties are event names.
// If `Object.create(null)` is not supported we prefix the event names with a
// `~` to make sure that the built-in object properties are not overridden or
// used as an attack vector.
// We also assume that `Object.create(null)` is available when the event name
// is an ES6 Symbol.
//
var prefix = typeof Object.create !== 'function' ? '~' : false;

/**
 * Representation of a single EventEmitter function.
 *
 * @param {Function} fn Event handler to be called.
 * @param {Mixed} context Context for function execution.
 * @param {Boolean} [once=false] Only emit once
 * @api private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Minimal EventEmitter interface that is molded against the Node.js
 * EventEmitter interface.
 *
 * @constructor
 * @api public
 */
function EventEmitter() { /* Nothing to set */ }

/**
 * Hold the assigned EventEmitters by name.
 *
 * @type {Object}
 * @private
 */
EventEmitter.prototype._events = undefined;

/**
 * Return an array listing the events for which the emitter has registered
 * listeners.
 *
 * @returns {Array}
 * @api public
 */
EventEmitter.prototype.eventNames = function eventNames() {
  var events = this._events
    , names = []
    , name;

  if (!events) return names;

  for (name in events) {
    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
  }

  if (Object.getOwnPropertySymbols) {
    return names.concat(Object.getOwnPropertySymbols(events));
  }

  return names;
};

/**
 * Return a list of assigned event listeners.
 *
 * @param {String} event The events that should be listed.
 * @param {Boolean} exists We only need to know if there are listeners.
 * @returns {Array|Boolean}
 * @api public
 */
EventEmitter.prototype.listeners = function listeners(event, exists) {
  var evt = prefix ? prefix + event : event
    , available = this._events && this._events[evt];

  if (exists) return !!available;
  if (!available) return [];
  if (available.fn) return [available.fn];

  for (var i = 0, l = available.length, ee = new Array(l); i < l; i++) {
    ee[i] = available[i].fn;
  }

  return ee;
};

/**
 * Emit an event to all registered event listeners.
 *
 * @param {String} event The name of the event.
 * @returns {Boolean} Indication if we've emitted an event.
 * @api public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var evt = prefix ? prefix + event : event;

  if (!this._events || !this._events[evt]) return false;

  var listeners = this._events[evt]
    , len = arguments.length
    , args
    , i;

  if ('function' === typeof listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Register a new EventListener for the given event.
 *
 * @param {String} event Name of the event.
 * @param {Function} fn Callback function.
 * @param {Mixed} [context=this] The context of the function.
 * @api public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  var listener = new EE(fn, context || this)
    , evt = prefix ? prefix + event : event;

  if (!this._events) this._events = prefix ? {} : Object.create(null);
  if (!this._events[evt]) this._events[evt] = listener;
  else {
    if (!this._events[evt].fn) this._events[evt].push(listener);
    else this._events[evt] = [
      this._events[evt], listener
    ];
  }

  return this;
};

/**
 * Add an EventListener that's only called once.
 *
 * @param {String} event Name of the event.
 * @param {Function} fn Callback function.
 * @param {Mixed} [context=this] The context of the function.
 * @api public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  var listener = new EE(fn, context || this, true)
    , evt = prefix ? prefix + event : event;

  if (!this._events) this._events = prefix ? {} : Object.create(null);
  if (!this._events[evt]) this._events[evt] = listener;
  else {
    if (!this._events[evt].fn) this._events[evt].push(listener);
    else this._events[evt] = [
      this._events[evt], listener
    ];
  }

  return this;
};

/**
 * Remove event listeners.
 *
 * @param {String} event The event we want to remove.
 * @param {Function} fn The listener that we need to find.
 * @param {Mixed} context Only remove listeners matching this context.
 * @param {Boolean} once Only remove once listeners.
 * @api public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var evt = prefix ? prefix + event : event;

  if (!this._events || !this._events[evt]) return this;

  var listeners = this._events[evt]
    , events = [];

  if (fn) {
    if (listeners.fn) {
      if (
           listeners.fn !== fn
        || (once && !listeners.once)
        || (context && listeners.context !== context)
      ) {
        events.push(listeners);
      }
    } else {
      for (var i = 0, length = listeners.length; i < length; i++) {
        if (
             listeners[i].fn !== fn
          || (once && !listeners[i].once)
          || (context && listeners[i].context !== context)
        ) {
          events.push(listeners[i]);
        }
      }
    }
  }

  //
  // Reset the array, or remove it completely if we have no more listeners.
  //
  if (events.length) {
    this._events[evt] = events.length === 1 ? events[0] : events;
  } else {
    delete this._events[evt];
  }

  return this;
};

/**
 * Remove all listeners or only the listeners for the specified event.
 *
 * @param {String} event The event want to remove all listeners for.
 * @api public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  if (!this._events) return this;

  if (event) delete this._events[prefix ? prefix + event : event];
  else this._events = prefix ? {} : Object.create(null);

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// This function doesn't apply anymore.
//
EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
  return this;
};

//
// Expose the prefix.
//
EventEmitter.prefixed = prefix;

//
// Expose the module.
//
if ('undefined' !== typeof module) {
  module.exports = EventEmitter;
}

},{}],2:[function(require,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var Message = require('../message');

/**
 * Sends events to the embedded VR view IFrame via postMessage. Also handles
 * messages sent back from the IFrame:
 *
 *    click: When a hotspot was clicked.
 *    modechange: When the user changes viewing mode (VR|Fullscreen|etc).
 */
function IFrameMessageSender(iframe) {
  if (!iframe) {
    console.error('No iframe specified');
    return;
  }
  this.iframe = iframe;

  // On iOS, if the iframe is across domains, also send DeviceMotion data.
  if (this.isIOS_()) {
    window.addEventListener('devicemotion', this.onDeviceMotion_.bind(this), false);
  }
}

/**
 * Sends a message to the associated VR View IFrame.
 */
IFrameMessageSender.prototype.send = function(message) {
  var iframeWindow = this.iframe.contentWindow;
  iframeWindow.postMessage(message, '*');
};

IFrameMessageSender.prototype.onDeviceMotion_ = function(e) {
  var message = {
    type: Message.DEVICE_MOTION,
    deviceMotionEvent: this.cloneDeviceMotionEvent_(e)
  };

  this.send(message);
};

IFrameMessageSender.prototype.cloneDeviceMotionEvent_ = function(e) {
  return {
    acceleration: {
      x: e.acceleration.x,
      y: e.acceleration.y,
      z: e.acceleration.z,
    },
    accelerationIncludingGravity: {
      x: e.accelerationIncludingGravity.x,
      y: e.accelerationIncludingGravity.y,
      z: e.accelerationIncludingGravity.z,
    },
    rotationRate: {
      alpha: e.rotationRate.alpha,
      beta: e.rotationRate.beta,
      gamma: e.rotationRate.gamma,
    },
    interval: e.interval,
    timeStamp: e.timeStamp
  };
};

IFrameMessageSender.prototype.isIOS_ = function() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

module.exports = IFrameMessageSender;

},{"../message":5}],3:[function(require,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Player = require('./player');

var VRView = {
  Player: Player
};

module.exports = VRView;

},{"./player":4}],4:[function(require,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var EventEmitter = require('eventemitter3');
var IFrameMessageSender = require('./iframe-message-sender');
var Message = require('../message');
var Util = require('../util');

// Save the executing script. This will be used to calculate the embed URL.
var CURRENT_SCRIPT_SRC = Util.getCurrentScript().src;
var FAKE_FULLSCREEN_CLASS = 'vrview-fake-fullscreen';

/**
 * Entry point for the VR View JS API.
 *
 * Emits the following events:
 *    ready: When the player is loaded.
 *    modechange: When the viewing mode changes (normal, fullscreen, VR).
 *    click (id): When a hotspot is clicked.
 */
function Player(selector, contentInfo, options) {
    // custom global options
    this.autoplay = options && typeof options.autoplay !== 'undefined' ? !!options.autoplay : true;
    this.assetsUrl = options && typeof options.assetsUrl !== 'undefined' ? options.assetsUrl : false;

    contentInfo.autoplay = this.autoplay;

    // Create a VR View iframe depending on the parameters.
    var iframe = this.createIframe_(contentInfo);
    this.iframe = iframe;

    var parentEl = document.querySelector(selector);
    parentEl.appendChild(iframe);

    // Make a sender as well, for relying commands to the child IFrame.
    this.sender = new IFrameMessageSender(iframe);

    // Listen to messages from the IFrame.
    window.addEventListener('message', this.onMessage_.bind(this), false);

    // Expose a public .isPaused attribute.
    this.isPaused = false;
    this.time_ = {currentTime: 0, duration: 0};
    this.volume_ = 1;

    if (Util.isIOS()) {
        this.injectFullscreenStylesheet_();
    }
}
Player.prototype = new EventEmitter();

/**
 * @param pitch {Number} The latitude of center, specified in degrees, between
 * -90 and 90, with 0 at the horizon.
 * @param yaw {Number} The longitude of center, specified in degrees, between
 * -180 and 180, with 0 at the image center.
 * @param radius {Number} The radius of the hotspot, specified in meters.
 * @param distance {Number} The distance of the hotspot from camera, specified
 * in meters.
 * @param hotspotId {String} The ID of the hotspot.
 */
Player.prototype.addHotspot = function (hotspotId, params) {
    // TODO: Add validation to params.
    var data = {
        pitch: params.pitch,
        yaw: params.yaw,
        radius: params.radius,
        distance: params.distance,
        custom: params.custom || null,
        id: hotspotId
    };
    this.sender.send({type: Message.ADD_HOTSPOT, data: data});
};

Player.prototype.play = function () {
    this.sender.send({type: Message.PLAY});
};

Player.prototype.pause = function () {
    this.sender.send({type: Message.PAUSE});
};

Player.prototype.setContent = function (contentInfo) {
    this.absolutifyPaths_(contentInfo);
    var data = {
        contentInfo: contentInfo
    };
    this.sender.send({type: Message.SET_CONTENT, data: data});
};

/**
 * Sets the software volume of the video. 0 is mute, 1 is max.
 */
Player.prototype.setVolume = function (volumeLevel) {
    var data = {
        volumeLevel: volumeLevel
    };
    this.sender.send({type: Message.SET_VOLUME, data: data});
};

Player.prototype.getVolume = function () {
    return this.volume_;
};

/**
 * Set the current time of the media being played
 * @param {Number} time
 */
Player.prototype.setCurrentTime = function (time) {
    var data = {
        currentTime: time
    };
    this.sender.send({type: Message.SET_CURRENT_TIME, data: data});
};

Player.prototype.getCurrentTime = function () {
    return this.time_.currentTime;
};

Player.prototype.getDuration = function () {
    return this.time_.duration;
};

/**
 * Helper for creating an iframe.
 *
 * @return {IFrameElement} The iframe.
 */
Player.prototype.createIframe_ = function (contentInfo) {
    this.absolutifyPaths_(contentInfo);

    var iframe = document.createElement('iframe');
    iframe.setAttribute('allowfullscreen', true);
    iframe.setAttribute('scrolling', 'no');
    iframe.style.border = 0;

    // Handle iframe size if width and height are specified.
    if (contentInfo.hasOwnProperty('width')) {
        iframe.setAttribute('width', contentInfo.width);
        delete contentInfo.width;
    }
    if (contentInfo.hasOwnProperty('height')) {
        iframe.setAttribute('height', contentInfo.height);
        delete contentInfo.height;
    }

    var url = this.getEmbedUrl_() + Util.createGetParams(contentInfo);
    iframe.src = url;

    return iframe;
};

Player.prototype.onMessage_ = function (event) {
    var message = event.data;
    if (!message || !message.type) {
        console.warn('Received message with no type.');
        return;
    }
    var type = message.type.toLowerCase();
    var data = message.data;

    switch (type) {
        case 'ready':
        case 'modechange':
        case 'error':
        case 'click':
        case 'getposition':
        case 'startdraw':
        case 'enddraw':
        case 'shapetransformed':
        case 'shapeselected':
        case 'shapeunselected':
        case 'ended':
            if (type === 'ready') {
                this.time_.duration = data.duration;
            }
            this.emit(type, data);
            break;
        case 'paused':
            this.isPaused = data;
            if (this.isPaused) {
                this.emit('pause', data);
            } else {
                this.emit('play', data);
            }
            break;
        case 'volumechange':
            this.volume_ = data;
            this.emit('timeupdate', data);
            break;
        case 'timeupdate':
            this.time_ = data;
            this.emit('timeupdate', data);
            break;
        case 'enter-fullscreen':
        case 'enter-vr':
            this.setFakeFullscreen_(true);
            break;
        case 'exit-fullscreen':
            this.setFakeFullscreen_(false);
            break;
        default:
            console.warn('Got unknown message of type %s from %s', message.type, message.origin);
    }
};

/**
 * Note: iOS doesn't support the fullscreen API.
 * In standalone <iframe> mode, VR View emulates fullscreen by redirecting to
 * another page.
 * In JS API mode, we stretch the iframe to cover the extent of the page using
 * CSS. To do this cleanly, we also inject a stylesheet.
 */
Player.prototype.setFakeFullscreen_ = function (isFullscreen) {
    if (isFullscreen) {
        this.iframe.classList.add(FAKE_FULLSCREEN_CLASS);
    } else {
        this.iframe.classList.remove(FAKE_FULLSCREEN_CLASS);
    }
};

Player.prototype.injectFullscreenStylesheet_ = function () {
    var styleString = [
        'iframe.' + FAKE_FULLSCREEN_CLASS,
        '{',
        'position: fixed !important;',
        'display: block !important;',
        'z-index: 9999999999 !important;',
        'top: 0 !important;',
        'left: 0 !important;',
        'width: 100% !important;',
        'height: 100% !important;',
        'margin: 0 !important;',
        '}',
    ].join('\n');
    var style = document.createElement('style');
    style.innerHTML = styleString;
    document.body.appendChild(style);
};

Player.prototype.getEmbedUrl_ = function () {
    // Assume that the script is in $ROOT/build/something.js, and that the iframe
    // HTML is in $ROOT/index.html.
    //
    // E.g: /vrview/2.0/build/vrview.min.js => /vrview/2.0/index.html.
    var path = CURRENT_SCRIPT_SRC;
    var split = path.split('/');
    var rootSplit = split.slice(0, split.length - 2);
    var rootPath = rootSplit.join('/');
    return rootPath + '/index.html';
};

Player.prototype.getDirName_ = function () {
    var path = window.location.pathname;
    path = path.substring(0, path.lastIndexOf('/'));
    return location.protocol + '//' + location.host + path;
};

/**
 * Make all of the URLs inside contentInfo absolute instead of relative.
 */
Player.prototype.absolutifyPaths_ = function (contentInfo) {
    var dirName = this.assetsUrl || this.getDirName_();
    var urlParams = ['image', 'preview', 'video'];

    for (var i = 0; i < urlParams.length; i++) {
        var name = urlParams[i];
        var path = contentInfo[name];
        if (path && Util.isPathAbsolute(path)) {
            var absolute = Util.relativeToAbsolutePath(dirName, path);
            contentInfo[name] = absolute;
            //console.log('Converted to absolute: %s', absolute);
        }
    }
};

Player.prototype.getPosition = function () {
    this.sender.send({type: Message.GET_POSITION, data: {}});
};

Player.prototype.activateShapeTool = function () {
    this.sender.send({type: Message.START_DRAW, data: {}});
};
Player.prototype.deactivateShapeTool = function () {
    this.sender.send({type: Message.END_DRAW, data: {}});
};

Player.prototype.addShape = function (shapeId, params) {
    this.sender.send({type: Message.ADD_SHAPE, data: {id: shapeId, params: params}});
};

Player.prototype.addShapeKeyframe = function (shapeId, frame, params) {
    params.frame = frame;
    this.sender.send({type: Message.ADD_SHAPE_KEYFRAME, data: {id: shapeId, params: params}});
};

Player.prototype.editShape = function (shapeId, params) {
    this.sender.send({type: Message.EDIT_SHAPE, data: {id: shapeId, params: params}});
};

Player.prototype.removeShape = function (shapeId) {
    this.sender.send({type: Message.REMOVE_SHAPE, data: {id: shapeId}});
};

Player.prototype.seek = function (frame) {
    this.sender.send({type: Message.SEEK, data: {frame: frame}});
};

Player.prototype.clearShapes = function () {
    this.sender.send({type: Message.CLEAR_SHAPES, data: {}});
};

Player.prototype.setAutoplay = function (bool) {
    this.sender.send({type: Message.SET_AUTOPLAY, data: { autoplay: bool }});
};

module.exports = Player;

},{"../message":5,"../util":6,"./iframe-message-sender":2,"eventemitter3":1}],5:[function(require,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Messages from the API to the embed.
 */
var Message = {
    PLAY: 'play',
    PAUSE: 'pause',
    ADD_HOTSPOT: 'addhotspot',
    SET_CONTENT: 'setimage',
    SET_VOLUME: 'setvolume',
    SET_AUTOPLAY: 'setautoplay',
    TIMEUPDATE: 'timeupdate',
    SET_CURRENT_TIME: 'setcurrenttime',
    SEEK: 'seek',
    DEVICE_MOTION: 'devicemotion',
    GET_POSITION: 'getposition',
    START_DRAW: 'startdraw',
    END_DRAW: 'enddraw',
    ADD_SHAPE: 'addshape',
    ADD_SHAPE_KEYFRAME: 'addshapekeyframe',
    EDIT_SHAPE: 'editshape',
    REMOVE_SHAPE: 'removeshape',
    CLEAR_SHAPES: 'clearshapes',
    SHAPE_TRANSFORMED: 'shapetransformed',
    SHAPE_SELECTED: 'shapeselected',
    SHAPE_UNSELECTED: 'shapeunselected'
};

module.exports = Message;

},{}],6:[function(require,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

Util = window.Util || {};

Util.isDataURI = function(src) {
  return src && src.indexOf('data:') == 0;
};

Util.generateUUID = function() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
};

Util.isMobile = function() {
  var check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};

Util.isIOS = function() {
  return /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
};

Util.isSafari = function() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

Util.cloneObject = function(obj) {
  var out = {};
  for (key in obj) {
    out[key] = obj[key];
  }
  return out;
};

Util.hashCode = function(s) {
  return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
};

Util.loadTrackSrc = function(context, src, callback, opt_progressCallback) {
  var request = new XMLHttpRequest();
  request.open('GET', src, true);
  request.responseType = 'arraybuffer';

  // Decode asynchronously.
  request.onload = function() {
    context.decodeAudioData(request.response, function(buffer) {
      callback(buffer);
    }, function(e) {
      console.error(e);
    });
  };
  if (opt_progressCallback) {
    request.onprogress = function(e) {
      var percent = e.loaded / e.total;
      opt_progressCallback(percent);
    };
  }
  request.send();
};

Util.isPow2 = function(n) {
  return (n & (n - 1)) == 0;
};

Util.capitalize = function(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
};

Util.isIFrame = function() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

// From http://goo.gl/4WX3tg
Util.getQueryParameter = function(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
      results = regex.exec(location.search);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
};


// From http://stackoverflow.com/questions/11871077/proper-way-to-detect-webgl-support.
Util.isWebGLEnabled = function() {
  var canvas = document.createElement('canvas');
  try { gl = canvas.getContext("webgl"); }
  catch (x) { gl = null; }

  if (gl == null) {
    try { gl = canvas.getContext("experimental-webgl"); experimental = true; }
    catch (x) { gl = null; }
  }
  return !!gl;
};

Util.clone = function(obj) {
  return JSON.parse(JSON.stringify(obj));
};

// From http://stackoverflow.com/questions/10140604/fastest-hypotenuse-in-javascript
Util.hypot = Math.hypot || function(x, y) {
  return Math.sqrt(x*x + y*y);
};

// From http://stackoverflow.com/a/17447718/693934
Util.isIE11 = function() {
  return navigator.userAgent.match(/Trident/);
};

Util.getRectCenter = function(rect) {
  return new THREE.Vector2(rect.x + rect.width/2, rect.y + rect.height/2);
};

Util.getScreenWidth = function() {
  return Math.max(window.screen.width, window.screen.height) *
      window.devicePixelRatio;
};

Util.getScreenHeight = function() {
  return Math.min(window.screen.width, window.screen.height) *
      window.devicePixelRatio;
};

Util.isIOS9OrLess = function() {
  if (!Util.isIOS()) {
    return false;
  }
  var re = /(iPhone|iPad|iPod) OS ([\d_]+)/;
  var iOSVersion = navigator.userAgent.match(re);
  if (!iOSVersion) {
    return false;
  }
  // Get the last group.
  var versionString = iOSVersion[iOSVersion.length - 1];
  var majorVersion = parseFloat(versionString);
  return majorVersion <= 9;
};

Util.getExtension = function(url) {
  return url.split('.').pop();
};

Util.createGetParams = function(params) {
  var out = '?';
  for (var k in params) {
    var paramString = k + '=' + params[k] + '&';
    out += paramString;
  }
  // Remove the trailing ampersand.
  out.substring(0, params.length - 2);
  return out;
};

Util.sendParentMessage = function(message) {
  if (window.parent) {
    parent.postMessage(message, '*');
  }
};

Util.parseBoolean = function(value) {
  if (value == 'false' || value == 0) {
    return false;
  } else if (value == 'true' || value == 1) {
    return true;
  } else {
    return !!value;
  }
};

/**
 * @param base {String} An absolute directory root.
 * @param relative {String} A relative path.
 *
 * @returns {String} An absolute path corresponding to the rootPath.
 *
 * From http://stackoverflow.com/a/14780463/693934.
 */
Util.relativeToAbsolutePath = function(base, relative) {
  var stack = base.split('/');
  var parts = relative.split('/');
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] == '.') {
      continue;
    }
    if (parts[i] == '..') {
      stack.pop();
    } else {
      stack.push(parts[i]);
    }
  }
  return stack.join('/');
};

/**
 * @return {Boolean} True iff the specified path is an absolute path.
 */
Util.isPathAbsolute = function(path) {
  return ! /^(?:\/|[a-z]+:\/\/)/.test(path);
}

Util.isEmptyObject = function(obj) {
  return Object.getOwnPropertyNames(obj).length == 0;
};

Util.isDebug = function() {
  return Util.parseBoolean(Util.getQueryParameter('debug'));
};

Util.getCurrentScript = function() {
  // Note: in IE11, document.currentScript doesn't work, so we fall back to this
  // hack, taken from https://goo.gl/TpExuH.
  if (!document.currentScript) {
    console.warn('This browser does not support document.currentScript. Trying fallback.');
  }
  return document.currentScript || document.scripts[document.scripts.length - 1];
}


module.exports = Util;

},{}]},{},[3])(3)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXZlbnRlbWl0dGVyMy9pbmRleC5qcyIsInNyYy9hcGkvaWZyYW1lLW1lc3NhZ2Utc2VuZGVyLmpzIiwic3JjL2FwaS9tYWluLmpzIiwic3JjL2FwaS9wbGF5ZXIuanMiLCJzcmMvbWVzc2FnZS5qcyIsInNyYy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaGFzID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuLy9cbi8vIFdlIHN0b3JlIG91ciBFRSBvYmplY3RzIGluIGEgcGxhaW4gb2JqZWN0IHdob3NlIHByb3BlcnRpZXMgYXJlIGV2ZW50IG5hbWVzLlxuLy8gSWYgYE9iamVjdC5jcmVhdGUobnVsbClgIGlzIG5vdCBzdXBwb3J0ZWQgd2UgcHJlZml4IHRoZSBldmVudCBuYW1lcyB3aXRoIGFcbi8vIGB+YCB0byBtYWtlIHN1cmUgdGhhdCB0aGUgYnVpbHQtaW4gb2JqZWN0IHByb3BlcnRpZXMgYXJlIG5vdCBvdmVycmlkZGVuIG9yXG4vLyB1c2VkIGFzIGFuIGF0dGFjayB2ZWN0b3IuXG4vLyBXZSBhbHNvIGFzc3VtZSB0aGF0IGBPYmplY3QuY3JlYXRlKG51bGwpYCBpcyBhdmFpbGFibGUgd2hlbiB0aGUgZXZlbnQgbmFtZVxuLy8gaXMgYW4gRVM2IFN5bWJvbC5cbi8vXG52YXIgcHJlZml4ID0gdHlwZW9mIE9iamVjdC5jcmVhdGUgIT09ICdmdW5jdGlvbicgPyAnficgOiBmYWxzZTtcblxuLyoqXG4gKiBSZXByZXNlbnRhdGlvbiBvZiBhIHNpbmdsZSBFdmVudEVtaXR0ZXIgZnVuY3Rpb24uXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gRXZlbnQgaGFuZGxlciB0byBiZSBjYWxsZWQuXG4gKiBAcGFyYW0ge01peGVkfSBjb250ZXh0IENvbnRleHQgZm9yIGZ1bmN0aW9uIGV4ZWN1dGlvbi5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW29uY2U9ZmFsc2VdIE9ubHkgZW1pdCBvbmNlXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gRUUoZm4sIGNvbnRleHQsIG9uY2UpIHtcbiAgdGhpcy5mbiA9IGZuO1xuICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICB0aGlzLm9uY2UgPSBvbmNlIHx8IGZhbHNlO1xufVxuXG4vKipcbiAqIE1pbmltYWwgRXZlbnRFbWl0dGVyIGludGVyZmFjZSB0aGF0IGlzIG1vbGRlZCBhZ2FpbnN0IHRoZSBOb2RlLmpzXG4gKiBFdmVudEVtaXR0ZXIgaW50ZXJmYWNlLlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICogQGFwaSBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkgeyAvKiBOb3RoaW5nIHRvIHNldCAqLyB9XG5cbi8qKlxuICogSG9sZCB0aGUgYXNzaWduZWQgRXZlbnRFbWl0dGVycyBieSBuYW1lLlxuICpcbiAqIEB0eXBlIHtPYmplY3R9XG4gKiBAcHJpdmF0ZVxuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5cbi8qKlxuICogUmV0dXJuIGFuIGFycmF5IGxpc3RpbmcgdGhlIGV2ZW50cyBmb3Igd2hpY2ggdGhlIGVtaXR0ZXIgaGFzIHJlZ2lzdGVyZWRcbiAqIGxpc3RlbmVycy5cbiAqXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmV2ZW50TmFtZXMgPSBmdW5jdGlvbiBldmVudE5hbWVzKCkge1xuICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzXG4gICAgLCBuYW1lcyA9IFtdXG4gICAgLCBuYW1lO1xuXG4gIGlmICghZXZlbnRzKSByZXR1cm4gbmFtZXM7XG5cbiAgZm9yIChuYW1lIGluIGV2ZW50cykge1xuICAgIGlmIChoYXMuY2FsbChldmVudHMsIG5hbWUpKSBuYW1lcy5wdXNoKHByZWZpeCA/IG5hbWUuc2xpY2UoMSkgOiBuYW1lKTtcbiAgfVxuXG4gIGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKSB7XG4gICAgcmV0dXJuIG5hbWVzLmNvbmNhdChPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKGV2ZW50cykpO1xuICB9XG5cbiAgcmV0dXJuIG5hbWVzO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gYSBsaXN0IG9mIGFzc2lnbmVkIGV2ZW50IGxpc3RlbmVycy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgVGhlIGV2ZW50cyB0aGF0IHNob3VsZCBiZSBsaXN0ZWQuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGV4aXN0cyBXZSBvbmx5IG5lZWQgdG8ga25vdyBpZiB0aGVyZSBhcmUgbGlzdGVuZXJzLlxuICogQHJldHVybnMge0FycmF5fEJvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uIGxpc3RlbmVycyhldmVudCwgZXhpc3RzKSB7XG4gIHZhciBldnQgPSBwcmVmaXggPyBwcmVmaXggKyBldmVudCA6IGV2ZW50XG4gICAgLCBhdmFpbGFibGUgPSB0aGlzLl9ldmVudHMgJiYgdGhpcy5fZXZlbnRzW2V2dF07XG5cbiAgaWYgKGV4aXN0cykgcmV0dXJuICEhYXZhaWxhYmxlO1xuICBpZiAoIWF2YWlsYWJsZSkgcmV0dXJuIFtdO1xuICBpZiAoYXZhaWxhYmxlLmZuKSByZXR1cm4gW2F2YWlsYWJsZS5mbl07XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBhdmFpbGFibGUubGVuZ3RoLCBlZSA9IG5ldyBBcnJheShsKTsgaSA8IGw7IGkrKykge1xuICAgIGVlW2ldID0gYXZhaWxhYmxlW2ldLmZuO1xuICB9XG5cbiAgcmV0dXJuIGVlO1xufTtcblxuLyoqXG4gKiBFbWl0IGFuIGV2ZW50IHRvIGFsbCByZWdpc3RlcmVkIGV2ZW50IGxpc3RlbmVycy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgVGhlIG5hbWUgb2YgdGhlIGV2ZW50LlxuICogQHJldHVybnMge0Jvb2xlYW59IEluZGljYXRpb24gaWYgd2UndmUgZW1pdHRlZCBhbiBldmVudC5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uIGVtaXQoZXZlbnQsIGExLCBhMiwgYTMsIGE0LCBhNSkge1xuICB2YXIgZXZ0ID0gcHJlZml4ID8gcHJlZml4ICsgZXZlbnQgOiBldmVudDtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW2V2dF0pIHJldHVybiBmYWxzZTtcblxuICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW2V2dF1cbiAgICAsIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGhcbiAgICAsIGFyZ3NcbiAgICAsIGk7XG5cbiAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBsaXN0ZW5lcnMuZm4pIHtcbiAgICBpZiAobGlzdGVuZXJzLm9uY2UpIHRoaXMucmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVycy5mbiwgdW5kZWZpbmVkLCB0cnVlKTtcblxuICAgIHN3aXRjaCAobGVuKSB7XG4gICAgICBjYXNlIDE6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCksIHRydWU7XG4gICAgICBjYXNlIDI6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCwgYTEpLCB0cnVlO1xuICAgICAgY2FzZSAzOiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExLCBhMiksIHRydWU7XG4gICAgICBjYXNlIDQ6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCwgYTEsIGEyLCBhMyksIHRydWU7XG4gICAgICBjYXNlIDU6IHJldHVybiBsaXN0ZW5lcnMuZm4uY2FsbChsaXN0ZW5lcnMuY29udGV4dCwgYTEsIGEyLCBhMywgYTQpLCB0cnVlO1xuICAgICAgY2FzZSA2OiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExLCBhMiwgYTMsIGE0LCBhNSksIHRydWU7XG4gICAgfVxuXG4gICAgZm9yIChpID0gMSwgYXJncyA9IG5ldyBBcnJheShsZW4gLTEpOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgIH1cblxuICAgIGxpc3RlbmVycy5mbi5hcHBseShsaXN0ZW5lcnMuY29udGV4dCwgYXJncyk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGxlbmd0aCA9IGxpc3RlbmVycy5sZW5ndGhcbiAgICAgICwgajtcblxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGxpc3RlbmVyc1tpXS5vbmNlKSB0aGlzLnJlbW92ZUxpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lcnNbaV0uZm4sIHVuZGVmaW5lZCwgdHJ1ZSk7XG5cbiAgICAgIHN3aXRjaCAobGVuKSB7XG4gICAgICAgIGNhc2UgMTogbGlzdGVuZXJzW2ldLmZuLmNhbGwobGlzdGVuZXJzW2ldLmNvbnRleHQpOyBicmVhaztcbiAgICAgICAgY2FzZSAyOiBsaXN0ZW5lcnNbaV0uZm4uY2FsbChsaXN0ZW5lcnNbaV0uY29udGV4dCwgYTEpOyBicmVhaztcbiAgICAgICAgY2FzZSAzOiBsaXN0ZW5lcnNbaV0uZm4uY2FsbChsaXN0ZW5lcnNbaV0uY29udGV4dCwgYTEsIGEyKTsgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgaWYgKCFhcmdzKSBmb3IgKGogPSAxLCBhcmdzID0gbmV3IEFycmF5KGxlbiAtMSk7IGogPCBsZW47IGorKykge1xuICAgICAgICAgICAgYXJnc1tqIC0gMV0gPSBhcmd1bWVudHNbal07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGlzdGVuZXJzW2ldLmZuLmFwcGx5KGxpc3RlbmVyc1tpXS5jb250ZXh0LCBhcmdzKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXIgYSBuZXcgRXZlbnRMaXN0ZW5lciBmb3IgdGhlIGdpdmVuIGV2ZW50LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBOYW1lIG9mIHRoZSBldmVudC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIENhbGxiYWNrIGZ1bmN0aW9uLlxuICogQHBhcmFtIHtNaXhlZH0gW2NvbnRleHQ9dGhpc10gVGhlIGNvbnRleHQgb2YgdGhlIGZ1bmN0aW9uLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIG9uKGV2ZW50LCBmbiwgY29udGV4dCkge1xuICB2YXIgbGlzdGVuZXIgPSBuZXcgRUUoZm4sIGNvbnRleHQgfHwgdGhpcylcbiAgICAsIGV2dCA9IHByZWZpeCA/IHByZWZpeCArIGV2ZW50IDogZXZlbnQ7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpIHRoaXMuX2V2ZW50cyA9IHByZWZpeCA/IHt9IDogT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgaWYgKCF0aGlzLl9ldmVudHNbZXZ0XSkgdGhpcy5fZXZlbnRzW2V2dF0gPSBsaXN0ZW5lcjtcbiAgZWxzZSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHNbZXZ0XS5mbikgdGhpcy5fZXZlbnRzW2V2dF0ucHVzaChsaXN0ZW5lcik7XG4gICAgZWxzZSB0aGlzLl9ldmVudHNbZXZ0XSA9IFtcbiAgICAgIHRoaXMuX2V2ZW50c1tldnRdLCBsaXN0ZW5lclxuICAgIF07XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkIGFuIEV2ZW50TGlzdGVuZXIgdGhhdCdzIG9ubHkgY2FsbGVkIG9uY2UuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IE5hbWUgb2YgdGhlIGV2ZW50LlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gQ2FsbGJhY2sgZnVuY3Rpb24uXG4gKiBAcGFyYW0ge01peGVkfSBbY29udGV4dD10aGlzXSBUaGUgY29udGV4dCBvZiB0aGUgZnVuY3Rpb24uXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbiBvbmNlKGV2ZW50LCBmbiwgY29udGV4dCkge1xuICB2YXIgbGlzdGVuZXIgPSBuZXcgRUUoZm4sIGNvbnRleHQgfHwgdGhpcywgdHJ1ZSlcbiAgICAsIGV2dCA9IHByZWZpeCA/IHByZWZpeCArIGV2ZW50IDogZXZlbnQ7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpIHRoaXMuX2V2ZW50cyA9IHByZWZpeCA/IHt9IDogT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgaWYgKCF0aGlzLl9ldmVudHNbZXZ0XSkgdGhpcy5fZXZlbnRzW2V2dF0gPSBsaXN0ZW5lcjtcbiAgZWxzZSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHNbZXZ0XS5mbikgdGhpcy5fZXZlbnRzW2V2dF0ucHVzaChsaXN0ZW5lcik7XG4gICAgZWxzZSB0aGlzLl9ldmVudHNbZXZ0XSA9IFtcbiAgICAgIHRoaXMuX2V2ZW50c1tldnRdLCBsaXN0ZW5lclxuICAgIF07XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlIGV2ZW50IGxpc3RlbmVycy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgVGhlIGV2ZW50IHdlIHdhbnQgdG8gcmVtb3ZlLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gVGhlIGxpc3RlbmVyIHRoYXQgd2UgbmVlZCB0byBmaW5kLlxuICogQHBhcmFtIHtNaXhlZH0gY29udGV4dCBPbmx5IHJlbW92ZSBsaXN0ZW5lcnMgbWF0Y2hpbmcgdGhpcyBjb250ZXh0LlxuICogQHBhcmFtIHtCb29sZWFufSBvbmNlIE9ubHkgcmVtb3ZlIG9uY2UgbGlzdGVuZXJzLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVyKGV2ZW50LCBmbiwgY29udGV4dCwgb25jZSkge1xuICB2YXIgZXZ0ID0gcHJlZml4ID8gcHJlZml4ICsgZXZlbnQgOiBldmVudDtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW2V2dF0pIHJldHVybiB0aGlzO1xuXG4gIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbZXZ0XVxuICAgICwgZXZlbnRzID0gW107XG5cbiAgaWYgKGZuKSB7XG4gICAgaWYgKGxpc3RlbmVycy5mbikge1xuICAgICAgaWYgKFxuICAgICAgICAgICBsaXN0ZW5lcnMuZm4gIT09IGZuXG4gICAgICAgIHx8IChvbmNlICYmICFsaXN0ZW5lcnMub25jZSlcbiAgICAgICAgfHwgKGNvbnRleHQgJiYgbGlzdGVuZXJzLmNvbnRleHQgIT09IGNvbnRleHQpXG4gICAgICApIHtcbiAgICAgICAgZXZlbnRzLnB1c2gobGlzdGVuZXJzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGxpc3RlbmVycy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoXG4gICAgICAgICAgICAgbGlzdGVuZXJzW2ldLmZuICE9PSBmblxuICAgICAgICAgIHx8IChvbmNlICYmICFsaXN0ZW5lcnNbaV0ub25jZSlcbiAgICAgICAgICB8fCAoY29udGV4dCAmJiBsaXN0ZW5lcnNbaV0uY29udGV4dCAhPT0gY29udGV4dClcbiAgICAgICAgKSB7XG4gICAgICAgICAgZXZlbnRzLnB1c2gobGlzdGVuZXJzW2ldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vXG4gIC8vIFJlc2V0IHRoZSBhcnJheSwgb3IgcmVtb3ZlIGl0IGNvbXBsZXRlbHkgaWYgd2UgaGF2ZSBubyBtb3JlIGxpc3RlbmVycy5cbiAgLy9cbiAgaWYgKGV2ZW50cy5sZW5ndGgpIHtcbiAgICB0aGlzLl9ldmVudHNbZXZ0XSA9IGV2ZW50cy5sZW5ndGggPT09IDEgPyBldmVudHNbMF0gOiBldmVudHM7XG4gIH0gZWxzZSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1tldnRdO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhbGwgbGlzdGVuZXJzIG9yIG9ubHkgdGhlIGxpc3RlbmVycyBmb3IgdGhlIHNwZWNpZmllZCBldmVudC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgVGhlIGV2ZW50IHdhbnQgdG8gcmVtb3ZlIGFsbCBsaXN0ZW5lcnMgZm9yLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbiByZW1vdmVBbGxMaXN0ZW5lcnMoZXZlbnQpIHtcbiAgaWYgKCF0aGlzLl9ldmVudHMpIHJldHVybiB0aGlzO1xuXG4gIGlmIChldmVudCkgZGVsZXRlIHRoaXMuX2V2ZW50c1twcmVmaXggPyBwcmVmaXggKyBldmVudCA6IGV2ZW50XTtcbiAgZWxzZSB0aGlzLl9ldmVudHMgPSBwcmVmaXggPyB7fSA6IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vL1xuLy8gQWxpYXMgbWV0aG9kcyBuYW1lcyBiZWNhdXNlIHBlb3BsZSByb2xsIGxpa2UgdGhhdC5cbi8vXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXI7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbjtcblxuLy9cbi8vIFRoaXMgZnVuY3Rpb24gZG9lc24ndCBhcHBseSBhbnltb3JlLlxuLy9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24gc2V0TWF4TGlzdGVuZXJzKCkge1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8vXG4vLyBFeHBvc2UgdGhlIHByZWZpeC5cbi8vXG5FdmVudEVtaXR0ZXIucHJlZml4ZWQgPSBwcmVmaXg7XG5cbi8vXG4vLyBFeHBvc2UgdGhlIG1vZHVsZS5cbi8vXG5pZiAoJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBtb2R1bGUpIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG59XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTYgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xudmFyIE1lc3NhZ2UgPSByZXF1aXJlKCcuLi9tZXNzYWdlJyk7XG5cbi8qKlxuICogU2VuZHMgZXZlbnRzIHRvIHRoZSBlbWJlZGRlZCBWUiB2aWV3IElGcmFtZSB2aWEgcG9zdE1lc3NhZ2UuIEFsc28gaGFuZGxlc1xuICogbWVzc2FnZXMgc2VudCBiYWNrIGZyb20gdGhlIElGcmFtZTpcbiAqXG4gKiAgICBjbGljazogV2hlbiBhIGhvdHNwb3Qgd2FzIGNsaWNrZWQuXG4gKiAgICBtb2RlY2hhbmdlOiBXaGVuIHRoZSB1c2VyIGNoYW5nZXMgdmlld2luZyBtb2RlIChWUnxGdWxsc2NyZWVufGV0YykuXG4gKi9cbmZ1bmN0aW9uIElGcmFtZU1lc3NhZ2VTZW5kZXIoaWZyYW1lKSB7XG4gIGlmICghaWZyYW1lKSB7XG4gICAgY29uc29sZS5lcnJvcignTm8gaWZyYW1lIHNwZWNpZmllZCcpO1xuICAgIHJldHVybjtcbiAgfVxuICB0aGlzLmlmcmFtZSA9IGlmcmFtZTtcblxuICAvLyBPbiBpT1MsIGlmIHRoZSBpZnJhbWUgaXMgYWNyb3NzIGRvbWFpbnMsIGFsc28gc2VuZCBEZXZpY2VNb3Rpb24gZGF0YS5cbiAgaWYgKHRoaXMuaXNJT1NfKCkpIHtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZGV2aWNlbW90aW9uJywgdGhpcy5vbkRldmljZU1vdGlvbl8uYmluZCh0aGlzKSwgZmFsc2UpO1xuICB9XG59XG5cbi8qKlxuICogU2VuZHMgYSBtZXNzYWdlIHRvIHRoZSBhc3NvY2lhdGVkIFZSIFZpZXcgSUZyYW1lLlxuICovXG5JRnJhbWVNZXNzYWdlU2VuZGVyLnByb3RvdHlwZS5zZW5kID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICB2YXIgaWZyYW1lV2luZG93ID0gdGhpcy5pZnJhbWUuY29udGVudFdpbmRvdztcbiAgaWZyYW1lV2luZG93LnBvc3RNZXNzYWdlKG1lc3NhZ2UsICcqJyk7XG59O1xuXG5JRnJhbWVNZXNzYWdlU2VuZGVyLnByb3RvdHlwZS5vbkRldmljZU1vdGlvbl8gPSBmdW5jdGlvbihlKSB7XG4gIHZhciBtZXNzYWdlID0ge1xuICAgIHR5cGU6IE1lc3NhZ2UuREVWSUNFX01PVElPTixcbiAgICBkZXZpY2VNb3Rpb25FdmVudDogdGhpcy5jbG9uZURldmljZU1vdGlvbkV2ZW50XyhlKVxuICB9O1xuXG4gIHRoaXMuc2VuZChtZXNzYWdlKTtcbn07XG5cbklGcmFtZU1lc3NhZ2VTZW5kZXIucHJvdG90eXBlLmNsb25lRGV2aWNlTW90aW9uRXZlbnRfID0gZnVuY3Rpb24oZSkge1xuICByZXR1cm4ge1xuICAgIGFjY2VsZXJhdGlvbjoge1xuICAgICAgeDogZS5hY2NlbGVyYXRpb24ueCxcbiAgICAgIHk6IGUuYWNjZWxlcmF0aW9uLnksXG4gICAgICB6OiBlLmFjY2VsZXJhdGlvbi56LFxuICAgIH0sXG4gICAgYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eToge1xuICAgICAgeDogZS5hY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5LngsXG4gICAgICB5OiBlLmFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHkueSxcbiAgICAgIHo6IGUuYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eS56LFxuICAgIH0sXG4gICAgcm90YXRpb25SYXRlOiB7XG4gICAgICBhbHBoYTogZS5yb3RhdGlvblJhdGUuYWxwaGEsXG4gICAgICBiZXRhOiBlLnJvdGF0aW9uUmF0ZS5iZXRhLFxuICAgICAgZ2FtbWE6IGUucm90YXRpb25SYXRlLmdhbW1hLFxuICAgIH0sXG4gICAgaW50ZXJ2YWw6IGUuaW50ZXJ2YWwsXG4gICAgdGltZVN0YW1wOiBlLnRpbWVTdGFtcFxuICB9O1xufTtcblxuSUZyYW1lTWVzc2FnZVNlbmRlci5wcm90b3R5cGUuaXNJT1NfID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAvaVBhZHxpUGhvbmV8aVBvZC8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSAmJiAhd2luZG93Lk1TU3RyZWFtO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBJRnJhbWVNZXNzYWdlU2VuZGVyO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE2IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxudmFyIFBsYXllciA9IHJlcXVpcmUoJy4vcGxheWVyJyk7XG5cbnZhciBWUlZpZXcgPSB7XG4gIFBsYXllcjogUGxheWVyXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZSVmlldztcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNiBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudGVtaXR0ZXIzJyk7XG52YXIgSUZyYW1lTWVzc2FnZVNlbmRlciA9IHJlcXVpcmUoJy4vaWZyYW1lLW1lc3NhZ2Utc2VuZGVyJyk7XG52YXIgTWVzc2FnZSA9IHJlcXVpcmUoJy4uL21lc3NhZ2UnKTtcbnZhciBVdGlsID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG4vLyBTYXZlIHRoZSBleGVjdXRpbmcgc2NyaXB0LiBUaGlzIHdpbGwgYmUgdXNlZCB0byBjYWxjdWxhdGUgdGhlIGVtYmVkIFVSTC5cbnZhciBDVVJSRU5UX1NDUklQVF9TUkMgPSBVdGlsLmdldEN1cnJlbnRTY3JpcHQoKS5zcmM7XG52YXIgRkFLRV9GVUxMU0NSRUVOX0NMQVNTID0gJ3Zydmlldy1mYWtlLWZ1bGxzY3JlZW4nO1xuXG4vKipcbiAqIEVudHJ5IHBvaW50IGZvciB0aGUgVlIgVmlldyBKUyBBUEkuXG4gKlxuICogRW1pdHMgdGhlIGZvbGxvd2luZyBldmVudHM6XG4gKiAgICByZWFkeTogV2hlbiB0aGUgcGxheWVyIGlzIGxvYWRlZC5cbiAqICAgIG1vZGVjaGFuZ2U6IFdoZW4gdGhlIHZpZXdpbmcgbW9kZSBjaGFuZ2VzIChub3JtYWwsIGZ1bGxzY3JlZW4sIFZSKS5cbiAqICAgIGNsaWNrIChpZCk6IFdoZW4gYSBob3RzcG90IGlzIGNsaWNrZWQuXG4gKi9cbmZ1bmN0aW9uIFBsYXllcihzZWxlY3RvciwgY29udGVudEluZm8sIG9wdGlvbnMpIHtcbiAgICAvLyBjdXN0b20gZ2xvYmFsIG9wdGlvbnNcbiAgICB0aGlzLmF1dG9wbGF5ID0gb3B0aW9ucyAmJiB0eXBlb2Ygb3B0aW9ucy5hdXRvcGxheSAhPT0gJ3VuZGVmaW5lZCcgPyAhIW9wdGlvbnMuYXV0b3BsYXkgOiB0cnVlO1xuICAgIHRoaXMuYXNzZXRzVXJsID0gb3B0aW9ucyAmJiB0eXBlb2Ygb3B0aW9ucy5hc3NldHNVcmwgIT09ICd1bmRlZmluZWQnID8gb3B0aW9ucy5hc3NldHNVcmwgOiBmYWxzZTtcblxuICAgIGNvbnRlbnRJbmZvLmF1dG9wbGF5ID0gdGhpcy5hdXRvcGxheTtcblxuICAgIC8vIENyZWF0ZSBhIFZSIFZpZXcgaWZyYW1lIGRlcGVuZGluZyBvbiB0aGUgcGFyYW1ldGVycy5cbiAgICB2YXIgaWZyYW1lID0gdGhpcy5jcmVhdGVJZnJhbWVfKGNvbnRlbnRJbmZvKTtcbiAgICB0aGlzLmlmcmFtZSA9IGlmcmFtZTtcblxuICAgIHZhciBwYXJlbnRFbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgIHBhcmVudEVsLmFwcGVuZENoaWxkKGlmcmFtZSk7XG5cbiAgICAvLyBNYWtlIGEgc2VuZGVyIGFzIHdlbGwsIGZvciByZWx5aW5nIGNvbW1hbmRzIHRvIHRoZSBjaGlsZCBJRnJhbWUuXG4gICAgdGhpcy5zZW5kZXIgPSBuZXcgSUZyYW1lTWVzc2FnZVNlbmRlcihpZnJhbWUpO1xuXG4gICAgLy8gTGlzdGVuIHRvIG1lc3NhZ2VzIGZyb20gdGhlIElGcmFtZS5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIHRoaXMub25NZXNzYWdlXy5iaW5kKHRoaXMpLCBmYWxzZSk7XG5cbiAgICAvLyBFeHBvc2UgYSBwdWJsaWMgLmlzUGF1c2VkIGF0dHJpYnV0ZS5cbiAgICB0aGlzLmlzUGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy50aW1lXyA9IHtjdXJyZW50VGltZTogMCwgZHVyYXRpb246IDB9O1xuICAgIHRoaXMudm9sdW1lXyA9IDE7XG5cbiAgICBpZiAoVXRpbC5pc0lPUygpKSB7XG4gICAgICAgIHRoaXMuaW5qZWN0RnVsbHNjcmVlblN0eWxlc2hlZXRfKCk7XG4gICAgfVxufVxuUGxheWVyLnByb3RvdHlwZSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuLyoqXG4gKiBAcGFyYW0gcGl0Y2gge051bWJlcn0gVGhlIGxhdGl0dWRlIG9mIGNlbnRlciwgc3BlY2lmaWVkIGluIGRlZ3JlZXMsIGJldHdlZW5cbiAqIC05MCBhbmQgOTAsIHdpdGggMCBhdCB0aGUgaG9yaXpvbi5cbiAqIEBwYXJhbSB5YXcge051bWJlcn0gVGhlIGxvbmdpdHVkZSBvZiBjZW50ZXIsIHNwZWNpZmllZCBpbiBkZWdyZWVzLCBiZXR3ZWVuXG4gKiAtMTgwIGFuZCAxODAsIHdpdGggMCBhdCB0aGUgaW1hZ2UgY2VudGVyLlxuICogQHBhcmFtIHJhZGl1cyB7TnVtYmVyfSBUaGUgcmFkaXVzIG9mIHRoZSBob3RzcG90LCBzcGVjaWZpZWQgaW4gbWV0ZXJzLlxuICogQHBhcmFtIGRpc3RhbmNlIHtOdW1iZXJ9IFRoZSBkaXN0YW5jZSBvZiB0aGUgaG90c3BvdCBmcm9tIGNhbWVyYSwgc3BlY2lmaWVkXG4gKiBpbiBtZXRlcnMuXG4gKiBAcGFyYW0gaG90c3BvdElkIHtTdHJpbmd9IFRoZSBJRCBvZiB0aGUgaG90c3BvdC5cbiAqL1xuUGxheWVyLnByb3RvdHlwZS5hZGRIb3RzcG90ID0gZnVuY3Rpb24gKGhvdHNwb3RJZCwgcGFyYW1zKSB7XG4gICAgLy8gVE9ETzogQWRkIHZhbGlkYXRpb24gdG8gcGFyYW1zLlxuICAgIHZhciBkYXRhID0ge1xuICAgICAgICBwaXRjaDogcGFyYW1zLnBpdGNoLFxuICAgICAgICB5YXc6IHBhcmFtcy55YXcsXG4gICAgICAgIHJhZGl1czogcGFyYW1zLnJhZGl1cyxcbiAgICAgICAgZGlzdGFuY2U6IHBhcmFtcy5kaXN0YW5jZSxcbiAgICAgICAgY3VzdG9tOiBwYXJhbXMuY3VzdG9tIHx8IG51bGwsXG4gICAgICAgIGlkOiBob3RzcG90SWRcbiAgICB9O1xuICAgIHRoaXMuc2VuZGVyLnNlbmQoe3R5cGU6IE1lc3NhZ2UuQUREX0hPVFNQT1QsIGRhdGE6IGRhdGF9KTtcbn07XG5cblBsYXllci5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNlbmRlci5zZW5kKHt0eXBlOiBNZXNzYWdlLlBMQVl9KTtcbn07XG5cblBsYXllci5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zZW5kZXIuc2VuZCh7dHlwZTogTWVzc2FnZS5QQVVTRX0pO1xufTtcblxuUGxheWVyLnByb3RvdHlwZS5zZXRDb250ZW50ID0gZnVuY3Rpb24gKGNvbnRlbnRJbmZvKSB7XG4gICAgdGhpcy5hYnNvbHV0aWZ5UGF0aHNfKGNvbnRlbnRJbmZvKTtcbiAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgY29udGVudEluZm86IGNvbnRlbnRJbmZvXG4gICAgfTtcbiAgICB0aGlzLnNlbmRlci5zZW5kKHt0eXBlOiBNZXNzYWdlLlNFVF9DT05URU5ULCBkYXRhOiBkYXRhfSk7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIHNvZnR3YXJlIHZvbHVtZSBvZiB0aGUgdmlkZW8uIDAgaXMgbXV0ZSwgMSBpcyBtYXguXG4gKi9cblBsYXllci5wcm90b3R5cGUuc2V0Vm9sdW1lID0gZnVuY3Rpb24gKHZvbHVtZUxldmVsKSB7XG4gICAgdmFyIGRhdGEgPSB7XG4gICAgICAgIHZvbHVtZUxldmVsOiB2b2x1bWVMZXZlbFxuICAgIH07XG4gICAgdGhpcy5zZW5kZXIuc2VuZCh7dHlwZTogTWVzc2FnZS5TRVRfVk9MVU1FLCBkYXRhOiBkYXRhfSk7XG59O1xuXG5QbGF5ZXIucHJvdG90eXBlLmdldFZvbHVtZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy52b2x1bWVfO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIGN1cnJlbnQgdGltZSBvZiB0aGUgbWVkaWEgYmVpbmcgcGxheWVkXG4gKiBAcGFyYW0ge051bWJlcn0gdGltZVxuICovXG5QbGF5ZXIucHJvdG90eXBlLnNldEN1cnJlbnRUaW1lID0gZnVuY3Rpb24gKHRpbWUpIHtcbiAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgY3VycmVudFRpbWU6IHRpbWVcbiAgICB9O1xuICAgIHRoaXMuc2VuZGVyLnNlbmQoe3R5cGU6IE1lc3NhZ2UuU0VUX0NVUlJFTlRfVElNRSwgZGF0YTogZGF0YX0pO1xufTtcblxuUGxheWVyLnByb3RvdHlwZS5nZXRDdXJyZW50VGltZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy50aW1lXy5jdXJyZW50VGltZTtcbn07XG5cblBsYXllci5wcm90b3R5cGUuZ2V0RHVyYXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMudGltZV8uZHVyYXRpb247XG59O1xuXG4vKipcbiAqIEhlbHBlciBmb3IgY3JlYXRpbmcgYW4gaWZyYW1lLlxuICpcbiAqIEByZXR1cm4ge0lGcmFtZUVsZW1lbnR9IFRoZSBpZnJhbWUuXG4gKi9cblBsYXllci5wcm90b3R5cGUuY3JlYXRlSWZyYW1lXyA9IGZ1bmN0aW9uIChjb250ZW50SW5mbykge1xuICAgIHRoaXMuYWJzb2x1dGlmeVBhdGhzXyhjb250ZW50SW5mbyk7XG5cbiAgICB2YXIgaWZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG4gICAgaWZyYW1lLnNldEF0dHJpYnV0ZSgnYWxsb3dmdWxsc2NyZWVuJywgdHJ1ZSk7XG4gICAgaWZyYW1lLnNldEF0dHJpYnV0ZSgnc2Nyb2xsaW5nJywgJ25vJyk7XG4gICAgaWZyYW1lLnN0eWxlLmJvcmRlciA9IDA7XG5cbiAgICAvLyBIYW5kbGUgaWZyYW1lIHNpemUgaWYgd2lkdGggYW5kIGhlaWdodCBhcmUgc3BlY2lmaWVkLlxuICAgIGlmIChjb250ZW50SW5mby5oYXNPd25Qcm9wZXJ0eSgnd2lkdGgnKSkge1xuICAgICAgICBpZnJhbWUuc2V0QXR0cmlidXRlKCd3aWR0aCcsIGNvbnRlbnRJbmZvLndpZHRoKTtcbiAgICAgICAgZGVsZXRlIGNvbnRlbnRJbmZvLndpZHRoO1xuICAgIH1cbiAgICBpZiAoY29udGVudEluZm8uaGFzT3duUHJvcGVydHkoJ2hlaWdodCcpKSB7XG4gICAgICAgIGlmcmFtZS5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGNvbnRlbnRJbmZvLmhlaWdodCk7XG4gICAgICAgIGRlbGV0ZSBjb250ZW50SW5mby5oZWlnaHQ7XG4gICAgfVxuXG4gICAgdmFyIHVybCA9IHRoaXMuZ2V0RW1iZWRVcmxfKCkgKyBVdGlsLmNyZWF0ZUdldFBhcmFtcyhjb250ZW50SW5mbyk7XG4gICAgaWZyYW1lLnNyYyA9IHVybDtcblxuICAgIHJldHVybiBpZnJhbWU7XG59O1xuXG5QbGF5ZXIucHJvdG90eXBlLm9uTWVzc2FnZV8gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB2YXIgbWVzc2FnZSA9IGV2ZW50LmRhdGE7XG4gICAgaWYgKCFtZXNzYWdlIHx8ICFtZXNzYWdlLnR5cGUpIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdSZWNlaXZlZCBtZXNzYWdlIHdpdGggbm8gdHlwZS4nKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdHlwZSA9IG1lc3NhZ2UudHlwZS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciBkYXRhID0gbWVzc2FnZS5kYXRhO1xuXG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ3JlYWR5JzpcbiAgICAgICAgY2FzZSAnbW9kZWNoYW5nZSc6XG4gICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgY2FzZSAnY2xpY2snOlxuICAgICAgICBjYXNlICdnZXRwb3NpdGlvbic6XG4gICAgICAgIGNhc2UgJ3N0YXJ0ZHJhdyc6XG4gICAgICAgIGNhc2UgJ2VuZGRyYXcnOlxuICAgICAgICBjYXNlICdzaGFwZXRyYW5zZm9ybWVkJzpcbiAgICAgICAgY2FzZSAnc2hhcGVzZWxlY3RlZCc6XG4gICAgICAgIGNhc2UgJ3NoYXBldW5zZWxlY3RlZCc6XG4gICAgICAgIGNhc2UgJ2VuZGVkJzpcbiAgICAgICAgICAgIGlmICh0eXBlID09PSAncmVhZHknKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50aW1lXy5kdXJhdGlvbiA9IGRhdGEuZHVyYXRpb247XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmVtaXQodHlwZSwgZGF0YSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAncGF1c2VkJzpcbiAgICAgICAgICAgIHRoaXMuaXNQYXVzZWQgPSBkYXRhO1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNQYXVzZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ3BhdXNlJywgZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuZW1pdCgncGxheScsIGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3ZvbHVtZWNoYW5nZSc6XG4gICAgICAgICAgICB0aGlzLnZvbHVtZV8gPSBkYXRhO1xuICAgICAgICAgICAgdGhpcy5lbWl0KCd0aW1ldXBkYXRlJywgZGF0YSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAndGltZXVwZGF0ZSc6XG4gICAgICAgICAgICB0aGlzLnRpbWVfID0gZGF0YTtcbiAgICAgICAgICAgIHRoaXMuZW1pdCgndGltZXVwZGF0ZScsIGRhdGEpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2VudGVyLWZ1bGxzY3JlZW4nOlxuICAgICAgICBjYXNlICdlbnRlci12cic6XG4gICAgICAgICAgICB0aGlzLnNldEZha2VGdWxsc2NyZWVuXyh0cnVlKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdleGl0LWZ1bGxzY3JlZW4nOlxuICAgICAgICAgICAgdGhpcy5zZXRGYWtlRnVsbHNjcmVlbl8oZmFsc2UpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0dvdCB1bmtub3duIG1lc3NhZ2Ugb2YgdHlwZSAlcyBmcm9tICVzJywgbWVzc2FnZS50eXBlLCBtZXNzYWdlLm9yaWdpbik7XG4gICAgfVxufTtcblxuLyoqXG4gKiBOb3RlOiBpT1MgZG9lc24ndCBzdXBwb3J0IHRoZSBmdWxsc2NyZWVuIEFQSS5cbiAqIEluIHN0YW5kYWxvbmUgPGlmcmFtZT4gbW9kZSwgVlIgVmlldyBlbXVsYXRlcyBmdWxsc2NyZWVuIGJ5IHJlZGlyZWN0aW5nIHRvXG4gKiBhbm90aGVyIHBhZ2UuXG4gKiBJbiBKUyBBUEkgbW9kZSwgd2Ugc3RyZXRjaCB0aGUgaWZyYW1lIHRvIGNvdmVyIHRoZSBleHRlbnQgb2YgdGhlIHBhZ2UgdXNpbmdcbiAqIENTUy4gVG8gZG8gdGhpcyBjbGVhbmx5LCB3ZSBhbHNvIGluamVjdCBhIHN0eWxlc2hlZXQuXG4gKi9cblBsYXllci5wcm90b3R5cGUuc2V0RmFrZUZ1bGxzY3JlZW5fID0gZnVuY3Rpb24gKGlzRnVsbHNjcmVlbikge1xuICAgIGlmIChpc0Z1bGxzY3JlZW4pIHtcbiAgICAgICAgdGhpcy5pZnJhbWUuY2xhc3NMaXN0LmFkZChGQUtFX0ZVTExTQ1JFRU5fQ0xBU1MpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaWZyYW1lLmNsYXNzTGlzdC5yZW1vdmUoRkFLRV9GVUxMU0NSRUVOX0NMQVNTKTtcbiAgICB9XG59O1xuXG5QbGF5ZXIucHJvdG90eXBlLmluamVjdEZ1bGxzY3JlZW5TdHlsZXNoZWV0XyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3R5bGVTdHJpbmcgPSBbXG4gICAgICAgICdpZnJhbWUuJyArIEZBS0VfRlVMTFNDUkVFTl9DTEFTUyxcbiAgICAgICAgJ3snLFxuICAgICAgICAncG9zaXRpb246IGZpeGVkICFpbXBvcnRhbnQ7JyxcbiAgICAgICAgJ2Rpc3BsYXk6IGJsb2NrICFpbXBvcnRhbnQ7JyxcbiAgICAgICAgJ3otaW5kZXg6IDk5OTk5OTk5OTkgIWltcG9ydGFudDsnLFxuICAgICAgICAndG9wOiAwICFpbXBvcnRhbnQ7JyxcbiAgICAgICAgJ2xlZnQ6IDAgIWltcG9ydGFudDsnLFxuICAgICAgICAnd2lkdGg6IDEwMCUgIWltcG9ydGFudDsnLFxuICAgICAgICAnaGVpZ2h0OiAxMDAlICFpbXBvcnRhbnQ7JyxcbiAgICAgICAgJ21hcmdpbjogMCAhaW1wb3J0YW50OycsXG4gICAgICAgICd9JyxcbiAgICBdLmpvaW4oJ1xcbicpO1xuICAgIHZhciBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgc3R5bGUuaW5uZXJIVE1MID0gc3R5bGVTdHJpbmc7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzdHlsZSk7XG59O1xuXG5QbGF5ZXIucHJvdG90eXBlLmdldEVtYmVkVXJsXyA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBBc3N1bWUgdGhhdCB0aGUgc2NyaXB0IGlzIGluICRST09UL2J1aWxkL3NvbWV0aGluZy5qcywgYW5kIHRoYXQgdGhlIGlmcmFtZVxuICAgIC8vIEhUTUwgaXMgaW4gJFJPT1QvaW5kZXguaHRtbC5cbiAgICAvL1xuICAgIC8vIEUuZzogL3Zydmlldy8yLjAvYnVpbGQvdnJ2aWV3Lm1pbi5qcyA9PiAvdnJ2aWV3LzIuMC9pbmRleC5odG1sLlxuICAgIHZhciBwYXRoID0gQ1VSUkVOVF9TQ1JJUFRfU1JDO1xuICAgIHZhciBzcGxpdCA9IHBhdGguc3BsaXQoJy8nKTtcbiAgICB2YXIgcm9vdFNwbGl0ID0gc3BsaXQuc2xpY2UoMCwgc3BsaXQubGVuZ3RoIC0gMik7XG4gICAgdmFyIHJvb3RQYXRoID0gcm9vdFNwbGl0LmpvaW4oJy8nKTtcbiAgICByZXR1cm4gcm9vdFBhdGggKyAnL2luZGV4Lmh0bWwnO1xufTtcblxuUGxheWVyLnByb3RvdHlwZS5nZXREaXJOYW1lXyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcGF0aCA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZTtcbiAgICBwYXRoID0gcGF0aC5zdWJzdHJpbmcoMCwgcGF0aC5sYXN0SW5kZXhPZignLycpKTtcbiAgICByZXR1cm4gbG9jYXRpb24ucHJvdG9jb2wgKyAnLy8nICsgbG9jYXRpb24uaG9zdCArIHBhdGg7XG59O1xuXG4vKipcbiAqIE1ha2UgYWxsIG9mIHRoZSBVUkxzIGluc2lkZSBjb250ZW50SW5mbyBhYnNvbHV0ZSBpbnN0ZWFkIG9mIHJlbGF0aXZlLlxuICovXG5QbGF5ZXIucHJvdG90eXBlLmFic29sdXRpZnlQYXRoc18gPSBmdW5jdGlvbiAoY29udGVudEluZm8pIHtcbiAgICB2YXIgZGlyTmFtZSA9IHRoaXMuYXNzZXRzVXJsIHx8IHRoaXMuZ2V0RGlyTmFtZV8oKTtcbiAgICB2YXIgdXJsUGFyYW1zID0gWydpbWFnZScsICdwcmV2aWV3JywgJ3ZpZGVvJ107XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHVybFBhcmFtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgbmFtZSA9IHVybFBhcmFtc1tpXTtcbiAgICAgICAgdmFyIHBhdGggPSBjb250ZW50SW5mb1tuYW1lXTtcbiAgICAgICAgaWYgKHBhdGggJiYgVXRpbC5pc1BhdGhBYnNvbHV0ZShwYXRoKSkge1xuICAgICAgICAgICAgdmFyIGFic29sdXRlID0gVXRpbC5yZWxhdGl2ZVRvQWJzb2x1dGVQYXRoKGRpck5hbWUsIHBhdGgpO1xuICAgICAgICAgICAgY29udGVudEluZm9bbmFtZV0gPSBhYnNvbHV0ZTtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ0NvbnZlcnRlZCB0byBhYnNvbHV0ZTogJXMnLCBhYnNvbHV0ZSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5QbGF5ZXIucHJvdG90eXBlLmdldFBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2VuZGVyLnNlbmQoe3R5cGU6IE1lc3NhZ2UuR0VUX1BPU0lUSU9OLCBkYXRhOiB7fX0pO1xufTtcblxuUGxheWVyLnByb3RvdHlwZS5hY3RpdmF0ZVNoYXBlVG9vbCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNlbmRlci5zZW5kKHt0eXBlOiBNZXNzYWdlLlNUQVJUX0RSQVcsIGRhdGE6IHt9fSk7XG59O1xuUGxheWVyLnByb3RvdHlwZS5kZWFjdGl2YXRlU2hhcGVUb29sID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2VuZGVyLnNlbmQoe3R5cGU6IE1lc3NhZ2UuRU5EX0RSQVcsIGRhdGE6IHt9fSk7XG59O1xuXG5QbGF5ZXIucHJvdG90eXBlLmFkZFNoYXBlID0gZnVuY3Rpb24gKHNoYXBlSWQsIHBhcmFtcykge1xuICAgIHRoaXMuc2VuZGVyLnNlbmQoe3R5cGU6IE1lc3NhZ2UuQUREX1NIQVBFLCBkYXRhOiB7aWQ6IHNoYXBlSWQsIHBhcmFtczogcGFyYW1zfX0pO1xufTtcblxuUGxheWVyLnByb3RvdHlwZS5hZGRTaGFwZUtleWZyYW1lID0gZnVuY3Rpb24gKHNoYXBlSWQsIGZyYW1lLCBwYXJhbXMpIHtcbiAgICBwYXJhbXMuZnJhbWUgPSBmcmFtZTtcbiAgICB0aGlzLnNlbmRlci5zZW5kKHt0eXBlOiBNZXNzYWdlLkFERF9TSEFQRV9LRVlGUkFNRSwgZGF0YToge2lkOiBzaGFwZUlkLCBwYXJhbXM6IHBhcmFtc319KTtcbn07XG5cblBsYXllci5wcm90b3R5cGUuZWRpdFNoYXBlID0gZnVuY3Rpb24gKHNoYXBlSWQsIHBhcmFtcykge1xuICAgIHRoaXMuc2VuZGVyLnNlbmQoe3R5cGU6IE1lc3NhZ2UuRURJVF9TSEFQRSwgZGF0YToge2lkOiBzaGFwZUlkLCBwYXJhbXM6IHBhcmFtc319KTtcbn07XG5cblBsYXllci5wcm90b3R5cGUucmVtb3ZlU2hhcGUgPSBmdW5jdGlvbiAoc2hhcGVJZCkge1xuICAgIHRoaXMuc2VuZGVyLnNlbmQoe3R5cGU6IE1lc3NhZ2UuUkVNT1ZFX1NIQVBFLCBkYXRhOiB7aWQ6IHNoYXBlSWR9fSk7XG59O1xuXG5QbGF5ZXIucHJvdG90eXBlLnNlZWsgPSBmdW5jdGlvbiAoZnJhbWUpIHtcbiAgICB0aGlzLnNlbmRlci5zZW5kKHt0eXBlOiBNZXNzYWdlLlNFRUssIGRhdGE6IHtmcmFtZTogZnJhbWV9fSk7XG59O1xuXG5QbGF5ZXIucHJvdG90eXBlLmNsZWFyU2hhcGVzID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2VuZGVyLnNlbmQoe3R5cGU6IE1lc3NhZ2UuQ0xFQVJfU0hBUEVTLCBkYXRhOiB7fX0pO1xufTtcblxuUGxheWVyLnByb3RvdHlwZS5zZXRBdXRvcGxheSA9IGZ1bmN0aW9uIChib29sKSB7XG4gICAgdGhpcy5zZW5kZXIuc2VuZCh7dHlwZTogTWVzc2FnZS5TRVRfQVVUT1BMQVksIGRhdGE6IHsgYXV0b3BsYXk6IGJvb2wgfX0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQbGF5ZXI7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTYgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG4vKipcbiAqIE1lc3NhZ2VzIGZyb20gdGhlIEFQSSB0byB0aGUgZW1iZWQuXG4gKi9cbnZhciBNZXNzYWdlID0ge1xuICAgIFBMQVk6ICdwbGF5JyxcbiAgICBQQVVTRTogJ3BhdXNlJyxcbiAgICBBRERfSE9UU1BPVDogJ2FkZGhvdHNwb3QnLFxuICAgIFNFVF9DT05URU5UOiAnc2V0aW1hZ2UnLFxuICAgIFNFVF9WT0xVTUU6ICdzZXR2b2x1bWUnLFxuICAgIFNFVF9BVVRPUExBWTogJ3NldGF1dG9wbGF5JyxcbiAgICBUSU1FVVBEQVRFOiAndGltZXVwZGF0ZScsXG4gICAgU0VUX0NVUlJFTlRfVElNRTogJ3NldGN1cnJlbnR0aW1lJyxcbiAgICBTRUVLOiAnc2VlaycsXG4gICAgREVWSUNFX01PVElPTjogJ2RldmljZW1vdGlvbicsXG4gICAgR0VUX1BPU0lUSU9OOiAnZ2V0cG9zaXRpb24nLFxuICAgIFNUQVJUX0RSQVc6ICdzdGFydGRyYXcnLFxuICAgIEVORF9EUkFXOiAnZW5kZHJhdycsXG4gICAgQUREX1NIQVBFOiAnYWRkc2hhcGUnLFxuICAgIEFERF9TSEFQRV9LRVlGUkFNRTogJ2FkZHNoYXBla2V5ZnJhbWUnLFxuICAgIEVESVRfU0hBUEU6ICdlZGl0c2hhcGUnLFxuICAgIFJFTU9WRV9TSEFQRTogJ3JlbW92ZXNoYXBlJyxcbiAgICBDTEVBUl9TSEFQRVM6ICdjbGVhcnNoYXBlcycsXG4gICAgU0hBUEVfVFJBTlNGT1JNRUQ6ICdzaGFwZXRyYW5zZm9ybWVkJyxcbiAgICBTSEFQRV9TRUxFQ1RFRDogJ3NoYXBlc2VsZWN0ZWQnLFxuICAgIFNIQVBFX1VOU0VMRUNURUQ6ICdzaGFwZXVuc2VsZWN0ZWQnXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1lc3NhZ2U7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTYgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG5VdGlsID0gd2luZG93LlV0aWwgfHwge307XG5cblV0aWwuaXNEYXRhVVJJID0gZnVuY3Rpb24oc3JjKSB7XG4gIHJldHVybiBzcmMgJiYgc3JjLmluZGV4T2YoJ2RhdGE6JykgPT0gMDtcbn07XG5cblV0aWwuZ2VuZXJhdGVVVUlEID0gZnVuY3Rpb24oKSB7XG4gIGZ1bmN0aW9uIHM0KCkge1xuICAgIHJldHVybiBNYXRoLmZsb29yKCgxICsgTWF0aC5yYW5kb20oKSkgKiAweDEwMDAwKVxuICAgIC50b1N0cmluZygxNilcbiAgICAuc3Vic3RyaW5nKDEpO1xuICB9XG4gIHJldHVybiBzNCgpICsgczQoKSArICctJyArIHM0KCkgKyAnLScgKyBzNCgpICsgJy0nICtcbiAgICBzNCgpICsgJy0nICsgczQoKSArIHM0KCkgKyBzNCgpO1xufTtcblxuVXRpbC5pc01vYmlsZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgY2hlY2sgPSBmYWxzZTtcbiAgKGZ1bmN0aW9uKGEpe2lmKC8oYW5kcm9pZHxiYlxcZCt8bWVlZ28pLittb2JpbGV8YXZhbnRnb3xiYWRhXFwvfGJsYWNrYmVycnl8YmxhemVyfGNvbXBhbHxlbGFpbmV8ZmVubmVjfGhpcHRvcHxpZW1vYmlsZXxpcChob25lfG9kKXxpcmlzfGtpbmRsZXxsZ2UgfG1hZW1vfG1pZHB8bW1wfG1vYmlsZS4rZmlyZWZveHxuZXRmcm9udHxvcGVyYSBtKG9ifGluKWl8cGFsbSggb3MpP3xwaG9uZXxwKGl4aXxyZSlcXC98cGx1Y2tlcnxwb2NrZXR8cHNwfHNlcmllcyg0fDYpMHxzeW1iaWFufHRyZW98dXBcXC4oYnJvd3NlcnxsaW5rKXx2b2RhZm9uZXx3YXB8d2luZG93cyBjZXx4ZGF8eGlpbm8vaS50ZXN0KGEpfHwvMTIwN3w2MzEwfDY1OTB8M2dzb3w0dGhwfDUwWzEtNl1pfDc3MHN8ODAyc3xhIHdhfGFiYWN8YWMoZXJ8b298c1xcLSl8YWkoa298cm4pfGFsKGF2fGNhfGNvKXxhbW9pfGFuKGV4fG55fHl3KXxhcHR1fGFyKGNofGdvKXxhcyh0ZXx1cyl8YXR0d3xhdShkaXxcXC1tfHIgfHMgKXxhdmFufGJlKGNrfGxsfG5xKXxiaShsYnxyZCl8YmwoYWN8YXopfGJyKGV8dil3fGJ1bWJ8YndcXC0obnx1KXxjNTVcXC98Y2FwaXxjY3dhfGNkbVxcLXxjZWxsfGNodG18Y2xkY3xjbWRcXC18Y28obXB8bmQpfGNyYXd8ZGEoaXR8bGx8bmcpfGRidGV8ZGNcXC1zfGRldml8ZGljYXxkbW9ifGRvKGN8cClvfGRzKDEyfFxcLWQpfGVsKDQ5fGFpKXxlbShsMnx1bCl8ZXIoaWN8azApfGVzbDh8ZXooWzQtN10wfG9zfHdhfHplKXxmZXRjfGZseShcXC18Xyl8ZzEgdXxnNTYwfGdlbmV8Z2ZcXC01fGdcXC1tb3xnbyhcXC53fG9kKXxncihhZHx1bil8aGFpZXxoY2l0fGhkXFwtKG18cHx0KXxoZWlcXC18aGkocHR8dGEpfGhwKCBpfGlwKXxoc1xcLWN8aHQoYyhcXC18IHxffGF8Z3xwfHN8dCl8dHApfGh1KGF3fHRjKXxpXFwtKDIwfGdvfG1hKXxpMjMwfGlhYyggfFxcLXxcXC8pfGlicm98aWRlYXxpZzAxfGlrb218aW0xa3xpbm5vfGlwYXF8aXJpc3xqYSh0fHYpYXxqYnJvfGplbXV8amlnc3xrZGRpfGtlaml8a2d0KCB8XFwvKXxrbG9ufGtwdCB8a3djXFwtfGt5byhjfGspfGxlKG5vfHhpKXxsZyggZ3xcXC8oa3xsfHUpfDUwfDU0fFxcLVthLXddKXxsaWJ3fGx5bnh8bTFcXC13fG0zZ2F8bTUwXFwvfG1hKHRlfHVpfHhvKXxtYygwMXwyMXxjYSl8bVxcLWNyfG1lKHJjfHJpKXxtaShvOHxvYXx0cyl8bW1lZnxtbygwMXwwMnxiaXxkZXxkb3x0KFxcLXwgfG98dil8enopfG10KDUwfHAxfHYgKXxtd2JwfG15d2F8bjEwWzAtMl18bjIwWzItM118bjMwKDB8Mil8bjUwKDB8Mnw1KXxuNygwKDB8MSl8MTApfG5lKChjfG0pXFwtfG9ufHRmfHdmfHdnfHd0KXxub2soNnxpKXxuenBofG8yaW18b3AodGl8d3YpfG9yYW58b3dnMXxwODAwfHBhbihhfGR8dCl8cGR4Z3xwZygxM3xcXC0oWzEtOF18YykpfHBoaWx8cGlyZXxwbChheXx1Yyl8cG5cXC0yfHBvKGNrfHJ0fHNlKXxwcm94fHBzaW98cHRcXC1nfHFhXFwtYXxxYygwN3wxMnwyMXwzMnw2MHxcXC1bMi03XXxpXFwtKXxxdGVrfHIzODB8cjYwMHxyYWtzfHJpbTl8cm8odmV8em8pfHM1NVxcL3xzYShnZXxtYXxtbXxtc3xueXx2YSl8c2MoMDF8aFxcLXxvb3xwXFwtKXxzZGtcXC98c2UoYyhcXC18MHwxKXw0N3xtY3xuZHxyaSl8c2doXFwtfHNoYXJ8c2llKFxcLXxtKXxza1xcLTB8c2woNDV8aWQpfHNtKGFsfGFyfGIzfGl0fHQ1KXxzbyhmdHxueSl8c3AoMDF8aFxcLXx2XFwtfHYgKXxzeSgwMXxtYil8dDIoMTh8NTApfHQ2KDAwfDEwfDE4KXx0YShndHxsayl8dGNsXFwtfHRkZ1xcLXx0ZWwoaXxtKXx0aW1cXC18dFxcLW1vfHRvKHBsfHNoKXx0cyg3MHxtXFwtfG0zfG01KXx0eFxcLTl8dXAoXFwuYnxnMXxzaSl8dXRzdHx2NDAwfHY3NTB8dmVyaXx2aShyZ3x0ZSl8dmsoNDB8NVswLTNdfFxcLXYpfHZtNDB8dm9kYXx2dWxjfHZ4KDUyfDUzfDYwfDYxfDcwfDgwfDgxfDgzfDg1fDk4KXx3M2MoXFwtfCApfHdlYmN8d2hpdHx3aShnIHxuY3xudyl8d21sYnx3b251fHg3MDB8eWFzXFwtfHlvdXJ8emV0b3x6dGVcXC0vaS50ZXN0KGEuc3Vic3RyKDAsNCkpKWNoZWNrID0gdHJ1ZX0pKG5hdmlnYXRvci51c2VyQWdlbnR8fG5hdmlnYXRvci52ZW5kb3J8fHdpbmRvdy5vcGVyYSk7XG4gIHJldHVybiBjaGVjaztcbn07XG5cblV0aWwuaXNJT1MgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIC8oaVBhZHxpUGhvbmV8aVBvZCkvZy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpO1xufTtcblxuVXRpbC5pc1NhZmFyaSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gL14oKD8hY2hyb21lfGFuZHJvaWQpLikqc2FmYXJpL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KTtcbn07XG5cblV0aWwuY2xvbmVPYmplY3QgPSBmdW5jdGlvbihvYmopIHtcbiAgdmFyIG91dCA9IHt9O1xuICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICBvdXRba2V5XSA9IG9ialtrZXldO1xuICB9XG4gIHJldHVybiBvdXQ7XG59O1xuXG5VdGlsLmhhc2hDb2RlID0gZnVuY3Rpb24ocykge1xuICByZXR1cm4gcy5zcGxpdChcIlwiKS5yZWR1Y2UoZnVuY3Rpb24oYSxiKXthPSgoYTw8NSktYSkrYi5jaGFyQ29kZUF0KDApO3JldHVybiBhJmF9LDApO1xufTtcblxuVXRpbC5sb2FkVHJhY2tTcmMgPSBmdW5jdGlvbihjb250ZXh0LCBzcmMsIGNhbGxiYWNrLCBvcHRfcHJvZ3Jlc3NDYWxsYmFjaykge1xuICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICByZXF1ZXN0Lm9wZW4oJ0dFVCcsIHNyYywgdHJ1ZSk7XG4gIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcblxuICAvLyBEZWNvZGUgYXN5bmNocm9ub3VzbHkuXG4gIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgY29udGV4dC5kZWNvZGVBdWRpb0RhdGEocmVxdWVzdC5yZXNwb25zZSwgZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgICBjYWxsYmFjayhidWZmZXIpO1xuICAgIH0sIGZ1bmN0aW9uKGUpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgfSk7XG4gIH07XG4gIGlmIChvcHRfcHJvZ3Jlc3NDYWxsYmFjaykge1xuICAgIHJlcXVlc3Qub25wcm9ncmVzcyA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgIHZhciBwZXJjZW50ID0gZS5sb2FkZWQgLyBlLnRvdGFsO1xuICAgICAgb3B0X3Byb2dyZXNzQ2FsbGJhY2socGVyY2VudCk7XG4gICAgfTtcbiAgfVxuICByZXF1ZXN0LnNlbmQoKTtcbn07XG5cblV0aWwuaXNQb3cyID0gZnVuY3Rpb24obikge1xuICByZXR1cm4gKG4gJiAobiAtIDEpKSA9PSAwO1xufTtcblxuVXRpbC5jYXBpdGFsaXplID0gZnVuY3Rpb24ocykge1xuICByZXR1cm4gcy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHMuc2xpY2UoMSk7XG59O1xuXG5VdGlsLmlzSUZyYW1lID0gZnVuY3Rpb24oKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHdpbmRvdy5zZWxmICE9PSB3aW5kb3cudG9wO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn07XG5cbi8vIEZyb20gaHR0cDovL2dvby5nbC80V1gzdGdcblV0aWwuZ2V0UXVlcnlQYXJhbWV0ZXIgPSBmdW5jdGlvbihuYW1lKSB7XG4gIG5hbWUgPSBuYW1lLnJlcGxhY2UoL1tcXFtdLywgXCJcXFxcW1wiKS5yZXBsYWNlKC9bXFxdXS8sIFwiXFxcXF1cIik7XG4gIHZhciByZWdleCA9IG5ldyBSZWdFeHAoXCJbXFxcXD8mXVwiICsgbmFtZSArIFwiPShbXiYjXSopXCIpLFxuICAgICAgcmVzdWx0cyA9IHJlZ2V4LmV4ZWMobG9jYXRpb24uc2VhcmNoKTtcbiAgcmV0dXJuIHJlc3VsdHMgPT09IG51bGwgPyBcIlwiIDogZGVjb2RlVVJJQ29tcG9uZW50KHJlc3VsdHNbMV0ucmVwbGFjZSgvXFwrL2csIFwiIFwiKSk7XG59O1xuXG5cbi8vIEZyb20gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMTg3MTA3Ny9wcm9wZXItd2F5LXRvLWRldGVjdC13ZWJnbC1zdXBwb3J0LlxuVXRpbC5pc1dlYkdMRW5hYmxlZCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gIHRyeSB7IGdsID0gY2FudmFzLmdldENvbnRleHQoXCJ3ZWJnbFwiKTsgfVxuICBjYXRjaCAoeCkgeyBnbCA9IG51bGw7IH1cblxuICBpZiAoZ2wgPT0gbnVsbCkge1xuICAgIHRyeSB7IGdsID0gY2FudmFzLmdldENvbnRleHQoXCJleHBlcmltZW50YWwtd2ViZ2xcIik7IGV4cGVyaW1lbnRhbCA9IHRydWU7IH1cbiAgICBjYXRjaCAoeCkgeyBnbCA9IG51bGw7IH1cbiAgfVxuICByZXR1cm4gISFnbDtcbn07XG5cblV0aWwuY2xvbmUgPSBmdW5jdGlvbihvYmopIHtcbiAgcmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkob2JqKSk7XG59O1xuXG4vLyBGcm9tIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTAxNDA2MDQvZmFzdGVzdC1oeXBvdGVudXNlLWluLWphdmFzY3JpcHRcblV0aWwuaHlwb3QgPSBNYXRoLmh5cG90IHx8IGZ1bmN0aW9uKHgsIHkpIHtcbiAgcmV0dXJuIE1hdGguc3FydCh4KnggKyB5KnkpO1xufTtcblxuLy8gRnJvbSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xNzQ0NzcxOC82OTM5MzRcblV0aWwuaXNJRTExID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9UcmlkZW50Lyk7XG59O1xuXG5VdGlsLmdldFJlY3RDZW50ZXIgPSBmdW5jdGlvbihyZWN0KSB7XG4gIHJldHVybiBuZXcgVEhSRUUuVmVjdG9yMihyZWN0LnggKyByZWN0LndpZHRoLzIsIHJlY3QueSArIHJlY3QuaGVpZ2h0LzIpO1xufTtcblxuVXRpbC5nZXRTY3JlZW5XaWR0aCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gTWF0aC5tYXgod2luZG93LnNjcmVlbi53aWR0aCwgd2luZG93LnNjcmVlbi5oZWlnaHQpICpcbiAgICAgIHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvO1xufTtcblxuVXRpbC5nZXRTY3JlZW5IZWlnaHQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIE1hdGgubWluKHdpbmRvdy5zY3JlZW4ud2lkdGgsIHdpbmRvdy5zY3JlZW4uaGVpZ2h0KSAqXG4gICAgICB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbztcbn07XG5cblV0aWwuaXNJT1M5T3JMZXNzID0gZnVuY3Rpb24oKSB7XG4gIGlmICghVXRpbC5pc0lPUygpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHZhciByZSA9IC8oaVBob25lfGlQYWR8aVBvZCkgT1MgKFtcXGRfXSspLztcbiAgdmFyIGlPU1ZlcnNpb24gPSBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKHJlKTtcbiAgaWYgKCFpT1NWZXJzaW9uKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8vIEdldCB0aGUgbGFzdCBncm91cC5cbiAgdmFyIHZlcnNpb25TdHJpbmcgPSBpT1NWZXJzaW9uW2lPU1ZlcnNpb24ubGVuZ3RoIC0gMV07XG4gIHZhciBtYWpvclZlcnNpb24gPSBwYXJzZUZsb2F0KHZlcnNpb25TdHJpbmcpO1xuICByZXR1cm4gbWFqb3JWZXJzaW9uIDw9IDk7XG59O1xuXG5VdGlsLmdldEV4dGVuc2lvbiA9IGZ1bmN0aW9uKHVybCkge1xuICByZXR1cm4gdXJsLnNwbGl0KCcuJykucG9wKCk7XG59O1xuXG5VdGlsLmNyZWF0ZUdldFBhcmFtcyA9IGZ1bmN0aW9uKHBhcmFtcykge1xuICB2YXIgb3V0ID0gJz8nO1xuICBmb3IgKHZhciBrIGluIHBhcmFtcykge1xuICAgIHZhciBwYXJhbVN0cmluZyA9IGsgKyAnPScgKyBwYXJhbXNba10gKyAnJic7XG4gICAgb3V0ICs9IHBhcmFtU3RyaW5nO1xuICB9XG4gIC8vIFJlbW92ZSB0aGUgdHJhaWxpbmcgYW1wZXJzYW5kLlxuICBvdXQuc3Vic3RyaW5nKDAsIHBhcmFtcy5sZW5ndGggLSAyKTtcbiAgcmV0dXJuIG91dDtcbn07XG5cblV0aWwuc2VuZFBhcmVudE1lc3NhZ2UgPSBmdW5jdGlvbihtZXNzYWdlKSB7XG4gIGlmICh3aW5kb3cucGFyZW50KSB7XG4gICAgcGFyZW50LnBvc3RNZXNzYWdlKG1lc3NhZ2UsICcqJyk7XG4gIH1cbn07XG5cblV0aWwucGFyc2VCb29sZWFuID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgaWYgKHZhbHVlID09ICdmYWxzZScgfHwgdmFsdWUgPT0gMCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBlbHNlIGlmICh2YWx1ZSA9PSAndHJ1ZScgfHwgdmFsdWUgPT0gMSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAhIXZhbHVlO1xuICB9XG59O1xuXG4vKipcbiAqIEBwYXJhbSBiYXNlIHtTdHJpbmd9IEFuIGFic29sdXRlIGRpcmVjdG9yeSByb290LlxuICogQHBhcmFtIHJlbGF0aXZlIHtTdHJpbmd9IEEgcmVsYXRpdmUgcGF0aC5cbiAqXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBBbiBhYnNvbHV0ZSBwYXRoIGNvcnJlc3BvbmRpbmcgdG8gdGhlIHJvb3RQYXRoLlxuICpcbiAqIEZyb20gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMTQ3ODA0NjMvNjkzOTM0LlxuICovXG5VdGlsLnJlbGF0aXZlVG9BYnNvbHV0ZVBhdGggPSBmdW5jdGlvbihiYXNlLCByZWxhdGl2ZSkge1xuICB2YXIgc3RhY2sgPSBiYXNlLnNwbGl0KCcvJyk7XG4gIHZhciBwYXJ0cyA9IHJlbGF0aXZlLnNwbGl0KCcvJyk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAocGFydHNbaV0gPT0gJy4nKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKHBhcnRzW2ldID09ICcuLicpIHtcbiAgICAgIHN0YWNrLnBvcCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdGFjay5wdXNoKHBhcnRzW2ldKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0YWNrLmpvaW4oJy8nKTtcbn07XG5cbi8qKlxuICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZmYgdGhlIHNwZWNpZmllZCBwYXRoIGlzIGFuIGFic29sdXRlIHBhdGguXG4gKi9cblV0aWwuaXNQYXRoQWJzb2x1dGUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiAhIC9eKD86XFwvfFthLXpdKzpcXC9cXC8pLy50ZXN0KHBhdGgpO1xufVxuXG5VdGlsLmlzRW1wdHlPYmplY3QgPSBmdW5jdGlvbihvYmopIHtcbiAgcmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9iaikubGVuZ3RoID09IDA7XG59O1xuXG5VdGlsLmlzRGVidWcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFV0aWwucGFyc2VCb29sZWFuKFV0aWwuZ2V0UXVlcnlQYXJhbWV0ZXIoJ2RlYnVnJykpO1xufTtcblxuVXRpbC5nZXRDdXJyZW50U2NyaXB0ID0gZnVuY3Rpb24oKSB7XG4gIC8vIE5vdGU6IGluIElFMTEsIGRvY3VtZW50LmN1cnJlbnRTY3JpcHQgZG9lc24ndCB3b3JrLCBzbyB3ZSBmYWxsIGJhY2sgdG8gdGhpc1xuICAvLyBoYWNrLCB0YWtlbiBmcm9tIGh0dHBzOi8vZ29vLmdsL1RwRXh1SC5cbiAgaWYgKCFkb2N1bWVudC5jdXJyZW50U2NyaXB0KSB7XG4gICAgY29uc29sZS53YXJuKCdUaGlzIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBkb2N1bWVudC5jdXJyZW50U2NyaXB0LiBUcnlpbmcgZmFsbGJhY2suJyk7XG4gIH1cbiAgcmV0dXJuIGRvY3VtZW50LmN1cnJlbnRTY3JpcHQgfHwgZG9jdW1lbnQuc2NyaXB0c1tkb2N1bWVudC5zY3JpcHRzLmxlbmd0aCAtIDFdO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gVXRpbDtcbiJdfQ==
