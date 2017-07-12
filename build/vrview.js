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
    case 'sceneready':
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
      if (type === 'ready' || type === 'sceneready') {
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

Player.prototype.editShape = function (shapeId, params) {
  this.sender.send({type: Message.EDIT_SHAPE, data: {id: shapeId, params: params}});
};

Player.prototype.removeShape = function (shapeId) {
  this.sender.send({type: Message.REMOVE_SHAPE, data: {id: shapeId}});
};


Player.prototype.addShapeKeyframe = function (shapeId, frame, params) {
  params.frame = frame;
  this.sender.send({type: Message.ADD_SHAPE_KEYFRAME, data: {id: shapeId, params: params}});
};
Player.prototype.editShapeKeyframe = function (shapeId, frame, params) {
  params.frame = frame;
  this.sender.send({type: Message.EDIT_SHAPE_KEYFRAME, data: {id: shapeId, params: params}});
};
Player.prototype.removeShapeKeyframe = function (shapeId, frame) {
  this.sender.send({type: Message.REMOVE_SHAPE_KEYFRAME, data: {id: shapeId, params: {frame: frame}}});
};

Player.prototype.seek = function (frame) {
  this.sender.send({type: Message.SEEK, data: {frame: frame}});
};

Player.prototype.clearShapes = function () {
  this.sender.send({type: Message.CLEAR_SHAPES, data: {}});
};

Player.prototype.setAutoplay = function (bool) {
  this.sender.send({type: Message.SET_AUTOPLAY, data: {autoplay: bool}});
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
    EDIT_SHAPE_KEYFRAME: 'editshapekeyframe',
    REMOVE_SHAPE_KEYFRAME: 'removeshapekeyframe',
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXZlbnRlbWl0dGVyMy9pbmRleC5qcyIsInNyYy9hcGkvaWZyYW1lLW1lc3NhZ2Utc2VuZGVyLmpzIiwic3JjL2FwaS9tYWluLmpzIiwic3JjL2FwaS9wbGF5ZXIuanMiLCJzcmMvbWVzc2FnZS5qcyIsInNyYy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIGhhcyA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbi8vXG4vLyBXZSBzdG9yZSBvdXIgRUUgb2JqZWN0cyBpbiBhIHBsYWluIG9iamVjdCB3aG9zZSBwcm9wZXJ0aWVzIGFyZSBldmVudCBuYW1lcy5cbi8vIElmIGBPYmplY3QuY3JlYXRlKG51bGwpYCBpcyBub3Qgc3VwcG9ydGVkIHdlIHByZWZpeCB0aGUgZXZlbnQgbmFtZXMgd2l0aCBhXG4vLyBgfmAgdG8gbWFrZSBzdXJlIHRoYXQgdGhlIGJ1aWx0LWluIG9iamVjdCBwcm9wZXJ0aWVzIGFyZSBub3Qgb3ZlcnJpZGRlbiBvclxuLy8gdXNlZCBhcyBhbiBhdHRhY2sgdmVjdG9yLlxuLy8gV2UgYWxzbyBhc3N1bWUgdGhhdCBgT2JqZWN0LmNyZWF0ZShudWxsKWAgaXMgYXZhaWxhYmxlIHdoZW4gdGhlIGV2ZW50IG5hbWVcbi8vIGlzIGFuIEVTNiBTeW1ib2wuXG4vL1xudmFyIHByZWZpeCA9IHR5cGVvZiBPYmplY3QuY3JlYXRlICE9PSAnZnVuY3Rpb24nID8gJ34nIDogZmFsc2U7XG5cbi8qKlxuICogUmVwcmVzZW50YXRpb24gb2YgYSBzaW5nbGUgRXZlbnRFbWl0dGVyIGZ1bmN0aW9uLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIEV2ZW50IGhhbmRsZXIgdG8gYmUgY2FsbGVkLlxuICogQHBhcmFtIHtNaXhlZH0gY29udGV4dCBDb250ZXh0IGZvciBmdW5jdGlvbiBleGVjdXRpb24uXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvbmNlPWZhbHNlXSBPbmx5IGVtaXQgb25jZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIEVFKGZuLCBjb250ZXh0LCBvbmNlKSB7XG4gIHRoaXMuZm4gPSBmbjtcbiAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgdGhpcy5vbmNlID0gb25jZSB8fCBmYWxzZTtcbn1cblxuLyoqXG4gKiBNaW5pbWFsIEV2ZW50RW1pdHRlciBpbnRlcmZhY2UgdGhhdCBpcyBtb2xkZWQgYWdhaW5zdCB0aGUgTm9kZS5qc1xuICogRXZlbnRFbWl0dGVyIGludGVyZmFjZS5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBhcGkgcHVibGljXG4gKi9cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHsgLyogTm90aGluZyB0byBzZXQgKi8gfVxuXG4vKipcbiAqIEhvbGQgdGhlIGFzc2lnbmVkIEV2ZW50RW1pdHRlcnMgYnkgbmFtZS5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICogQHByaXZhdGVcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuXG4vKipcbiAqIFJldHVybiBhbiBhcnJheSBsaXN0aW5nIHRoZSBldmVudHMgZm9yIHdoaWNoIHRoZSBlbWl0dGVyIGhhcyByZWdpc3RlcmVkXG4gKiBsaXN0ZW5lcnMuXG4gKlxuICogQHJldHVybnMge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5ldmVudE5hbWVzID0gZnVuY3Rpb24gZXZlbnROYW1lcygpIHtcbiAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50c1xuICAgICwgbmFtZXMgPSBbXVxuICAgICwgbmFtZTtcblxuICBpZiAoIWV2ZW50cykgcmV0dXJuIG5hbWVzO1xuXG4gIGZvciAobmFtZSBpbiBldmVudHMpIHtcbiAgICBpZiAoaGFzLmNhbGwoZXZlbnRzLCBuYW1lKSkgbmFtZXMucHVzaChwcmVmaXggPyBuYW1lLnNsaWNlKDEpIDogbmFtZSk7XG4gIH1cblxuICBpZiAoT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scykge1xuICAgIHJldHVybiBuYW1lcy5jb25jYXQoT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhldmVudHMpKTtcbiAgfVxuXG4gIHJldHVybiBuYW1lcztcbn07XG5cbi8qKlxuICogUmV0dXJuIGEgbGlzdCBvZiBhc3NpZ25lZCBldmVudCBsaXN0ZW5lcnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IFRoZSBldmVudHMgdGhhdCBzaG91bGQgYmUgbGlzdGVkLlxuICogQHBhcmFtIHtCb29sZWFufSBleGlzdHMgV2Ugb25seSBuZWVkIHRvIGtub3cgaWYgdGhlcmUgYXJlIGxpc3RlbmVycy5cbiAqIEByZXR1cm5zIHtBcnJheXxCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbiBsaXN0ZW5lcnMoZXZlbnQsIGV4aXN0cykge1xuICB2YXIgZXZ0ID0gcHJlZml4ID8gcHJlZml4ICsgZXZlbnQgOiBldmVudFxuICAgICwgYXZhaWxhYmxlID0gdGhpcy5fZXZlbnRzICYmIHRoaXMuX2V2ZW50c1tldnRdO1xuXG4gIGlmIChleGlzdHMpIHJldHVybiAhIWF2YWlsYWJsZTtcbiAgaWYgKCFhdmFpbGFibGUpIHJldHVybiBbXTtcbiAgaWYgKGF2YWlsYWJsZS5mbikgcmV0dXJuIFthdmFpbGFibGUuZm5dO1xuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gYXZhaWxhYmxlLmxlbmd0aCwgZWUgPSBuZXcgQXJyYXkobCk7IGkgPCBsOyBpKyspIHtcbiAgICBlZVtpXSA9IGF2YWlsYWJsZVtpXS5mbjtcbiAgfVxuXG4gIHJldHVybiBlZTtcbn07XG5cbi8qKlxuICogRW1pdCBhbiBldmVudCB0byBhbGwgcmVnaXN0ZXJlZCBldmVudCBsaXN0ZW5lcnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IFRoZSBuYW1lIG9mIHRoZSBldmVudC5cbiAqIEByZXR1cm5zIHtCb29sZWFufSBJbmRpY2F0aW9uIGlmIHdlJ3ZlIGVtaXR0ZWQgYW4gZXZlbnQuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiBlbWl0KGV2ZW50LCBhMSwgYTIsIGEzLCBhNCwgYTUpIHtcbiAgdmFyIGV2dCA9IHByZWZpeCA/IHByZWZpeCArIGV2ZW50IDogZXZlbnQ7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1tldnRdKSByZXR1cm4gZmFsc2U7XG5cbiAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1tldnRdXG4gICAgLCBsZW4gPSBhcmd1bWVudHMubGVuZ3RoXG4gICAgLCBhcmdzXG4gICAgLCBpO1xuXG4gIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgbGlzdGVuZXJzLmZuKSB7XG4gICAgaWYgKGxpc3RlbmVycy5vbmNlKSB0aGlzLnJlbW92ZUxpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lcnMuZm4sIHVuZGVmaW5lZCwgdHJ1ZSk7XG5cbiAgICBzd2l0Y2ggKGxlbikge1xuICAgICAgY2FzZSAxOiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQpLCB0cnVlO1xuICAgICAgY2FzZSAyOiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExKSwgdHJ1ZTtcbiAgICAgIGNhc2UgMzogcmV0dXJuIGxpc3RlbmVycy5mbi5jYWxsKGxpc3RlbmVycy5jb250ZXh0LCBhMSwgYTIpLCB0cnVlO1xuICAgICAgY2FzZSA0OiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExLCBhMiwgYTMpLCB0cnVlO1xuICAgICAgY2FzZSA1OiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExLCBhMiwgYTMsIGE0KSwgdHJ1ZTtcbiAgICAgIGNhc2UgNjogcmV0dXJuIGxpc3RlbmVycy5mbi5jYWxsKGxpc3RlbmVycy5jb250ZXh0LCBhMSwgYTIsIGEzLCBhNCwgYTUpLCB0cnVlO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDEsIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0xKTsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICB9XG5cbiAgICBsaXN0ZW5lcnMuZm4uYXBwbHkobGlzdGVuZXJzLmNvbnRleHQsIGFyZ3MpO1xuICB9IGVsc2Uge1xuICAgIHZhciBsZW5ndGggPSBsaXN0ZW5lcnMubGVuZ3RoXG4gICAgICAsIGo7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChsaXN0ZW5lcnNbaV0ub25jZSkgdGhpcy5yZW1vdmVMaXN0ZW5lcihldmVudCwgbGlzdGVuZXJzW2ldLmZuLCB1bmRlZmluZWQsIHRydWUpO1xuXG4gICAgICBzd2l0Y2ggKGxlbikge1xuICAgICAgICBjYXNlIDE6IGxpc3RlbmVyc1tpXS5mbi5jYWxsKGxpc3RlbmVyc1tpXS5jb250ZXh0KTsgYnJlYWs7XG4gICAgICAgIGNhc2UgMjogbGlzdGVuZXJzW2ldLmZuLmNhbGwobGlzdGVuZXJzW2ldLmNvbnRleHQsIGExKTsgYnJlYWs7XG4gICAgICAgIGNhc2UgMzogbGlzdGVuZXJzW2ldLmZuLmNhbGwobGlzdGVuZXJzW2ldLmNvbnRleHQsIGExLCBhMik7IGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGlmICghYXJncykgZm9yIChqID0gMSwgYXJncyA9IG5ldyBBcnJheShsZW4gLTEpOyBqIDwgbGVuOyBqKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaiAtIDFdID0gYXJndW1lbnRzW2pdO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxpc3RlbmVyc1tpXS5mbi5hcHBseShsaXN0ZW5lcnNbaV0uY29udGV4dCwgYXJncyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyIGEgbmV3IEV2ZW50TGlzdGVuZXIgZm9yIHRoZSBnaXZlbiBldmVudC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgTmFtZSBvZiB0aGUgZXZlbnQuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBDYWxsYmFjayBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7TWl4ZWR9IFtjb250ZXh0PXRoaXNdIFRoZSBjb250ZXh0IG9mIHRoZSBmdW5jdGlvbi5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBmdW5jdGlvbiBvbihldmVudCwgZm4sIGNvbnRleHQpIHtcbiAgdmFyIGxpc3RlbmVyID0gbmV3IEVFKGZuLCBjb250ZXh0IHx8IHRoaXMpXG4gICAgLCBldnQgPSBwcmVmaXggPyBwcmVmaXggKyBldmVudCA6IGV2ZW50O1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKSB0aGlzLl9ldmVudHMgPSBwcmVmaXggPyB7fSA6IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIGlmICghdGhpcy5fZXZlbnRzW2V2dF0pIHRoaXMuX2V2ZW50c1tldnRdID0gbGlzdGVuZXI7XG4gIGVsc2Uge1xuICAgIGlmICghdGhpcy5fZXZlbnRzW2V2dF0uZm4pIHRoaXMuX2V2ZW50c1tldnRdLnB1c2gobGlzdGVuZXIpO1xuICAgIGVsc2UgdGhpcy5fZXZlbnRzW2V2dF0gPSBbXG4gICAgICB0aGlzLl9ldmVudHNbZXZ0XSwgbGlzdGVuZXJcbiAgICBdO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZCBhbiBFdmVudExpc3RlbmVyIHRoYXQncyBvbmx5IGNhbGxlZCBvbmNlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBOYW1lIG9mIHRoZSBldmVudC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIENhbGxiYWNrIGZ1bmN0aW9uLlxuICogQHBhcmFtIHtNaXhlZH0gW2NvbnRleHQ9dGhpc10gVGhlIGNvbnRleHQgb2YgdGhlIGZ1bmN0aW9uLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24gb25jZShldmVudCwgZm4sIGNvbnRleHQpIHtcbiAgdmFyIGxpc3RlbmVyID0gbmV3IEVFKGZuLCBjb250ZXh0IHx8IHRoaXMsIHRydWUpXG4gICAgLCBldnQgPSBwcmVmaXggPyBwcmVmaXggKyBldmVudCA6IGV2ZW50O1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKSB0aGlzLl9ldmVudHMgPSBwcmVmaXggPyB7fSA6IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIGlmICghdGhpcy5fZXZlbnRzW2V2dF0pIHRoaXMuX2V2ZW50c1tldnRdID0gbGlzdGVuZXI7XG4gIGVsc2Uge1xuICAgIGlmICghdGhpcy5fZXZlbnRzW2V2dF0uZm4pIHRoaXMuX2V2ZW50c1tldnRdLnB1c2gobGlzdGVuZXIpO1xuICAgIGVsc2UgdGhpcy5fZXZlbnRzW2V2dF0gPSBbXG4gICAgICB0aGlzLl9ldmVudHNbZXZ0XSwgbGlzdGVuZXJcbiAgICBdO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBldmVudCBsaXN0ZW5lcnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IFRoZSBldmVudCB3ZSB3YW50IHRvIHJlbW92ZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIFRoZSBsaXN0ZW5lciB0aGF0IHdlIG5lZWQgdG8gZmluZC5cbiAqIEBwYXJhbSB7TWl4ZWR9IGNvbnRleHQgT25seSByZW1vdmUgbGlzdGVuZXJzIG1hdGNoaW5nIHRoaXMgY29udGV4dC5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gb25jZSBPbmx5IHJlbW92ZSBvbmNlIGxpc3RlbmVycy5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbiByZW1vdmVMaXN0ZW5lcihldmVudCwgZm4sIGNvbnRleHQsIG9uY2UpIHtcbiAgdmFyIGV2dCA9IHByZWZpeCA/IHByZWZpeCArIGV2ZW50IDogZXZlbnQ7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1tldnRdKSByZXR1cm4gdGhpcztcblxuICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW2V2dF1cbiAgICAsIGV2ZW50cyA9IFtdO1xuXG4gIGlmIChmbikge1xuICAgIGlmIChsaXN0ZW5lcnMuZm4pIHtcbiAgICAgIGlmIChcbiAgICAgICAgICAgbGlzdGVuZXJzLmZuICE9PSBmblxuICAgICAgICB8fCAob25jZSAmJiAhbGlzdGVuZXJzLm9uY2UpXG4gICAgICAgIHx8IChjb250ZXh0ICYmIGxpc3RlbmVycy5jb250ZXh0ICE9PSBjb250ZXh0KVxuICAgICAgKSB7XG4gICAgICAgIGV2ZW50cy5wdXNoKGxpc3RlbmVycyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBsaXN0ZW5lcnMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgIGxpc3RlbmVyc1tpXS5mbiAhPT0gZm5cbiAgICAgICAgICB8fCAob25jZSAmJiAhbGlzdGVuZXJzW2ldLm9uY2UpXG4gICAgICAgICAgfHwgKGNvbnRleHQgJiYgbGlzdGVuZXJzW2ldLmNvbnRleHQgIT09IGNvbnRleHQpXG4gICAgICAgICkge1xuICAgICAgICAgIGV2ZW50cy5wdXNoKGxpc3RlbmVyc1tpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvL1xuICAvLyBSZXNldCB0aGUgYXJyYXksIG9yIHJlbW92ZSBpdCBjb21wbGV0ZWx5IGlmIHdlIGhhdmUgbm8gbW9yZSBsaXN0ZW5lcnMuXG4gIC8vXG4gIGlmIChldmVudHMubGVuZ3RoKSB7XG4gICAgdGhpcy5fZXZlbnRzW2V2dF0gPSBldmVudHMubGVuZ3RoID09PSAxID8gZXZlbnRzWzBdIDogZXZlbnRzO1xuICB9IGVsc2Uge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbZXZ0XTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYWxsIGxpc3RlbmVycyBvciBvbmx5IHRoZSBsaXN0ZW5lcnMgZm9yIHRoZSBzcGVjaWZpZWQgZXZlbnQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IFRoZSBldmVudCB3YW50IHRvIHJlbW92ZSBhbGwgbGlzdGVuZXJzIGZvci5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24gcmVtb3ZlQWxsTGlzdGVuZXJzKGV2ZW50KSB7XG4gIGlmICghdGhpcy5fZXZlbnRzKSByZXR1cm4gdGhpcztcblxuICBpZiAoZXZlbnQpIGRlbGV0ZSB0aGlzLl9ldmVudHNbcHJlZml4ID8gcHJlZml4ICsgZXZlbnQgOiBldmVudF07XG4gIGVsc2UgdGhpcy5fZXZlbnRzID0gcHJlZml4ID8ge30gOiBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy9cbi8vIEFsaWFzIG1ldGhvZHMgbmFtZXMgYmVjYXVzZSBwZW9wbGUgcm9sbCBsaWtlIHRoYXQuXG4vL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmYgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUub247XG5cbi8vXG4vLyBUaGlzIGZ1bmN0aW9uIGRvZXNuJ3QgYXBwbHkgYW55bW9yZS5cbi8vXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uIHNldE1heExpc3RlbmVycygpIHtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vL1xuLy8gRXhwb3NlIHRoZSBwcmVmaXguXG4vL1xuRXZlbnRFbWl0dGVyLnByZWZpeGVkID0gcHJlZml4O1xuXG4vL1xuLy8gRXhwb3NlIHRoZSBtb2R1bGUuXG4vL1xuaWYgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgbW9kdWxlKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xufVxuIiwiLypcbiAqIENvcHlyaWdodCAyMDE2IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbnZhciBNZXNzYWdlID0gcmVxdWlyZSgnLi4vbWVzc2FnZScpO1xuXG4vKipcbiAqIFNlbmRzIGV2ZW50cyB0byB0aGUgZW1iZWRkZWQgVlIgdmlldyBJRnJhbWUgdmlhIHBvc3RNZXNzYWdlLiBBbHNvIGhhbmRsZXNcbiAqIG1lc3NhZ2VzIHNlbnQgYmFjayBmcm9tIHRoZSBJRnJhbWU6XG4gKlxuICogICAgY2xpY2s6IFdoZW4gYSBob3RzcG90IHdhcyBjbGlja2VkLlxuICogICAgbW9kZWNoYW5nZTogV2hlbiB0aGUgdXNlciBjaGFuZ2VzIHZpZXdpbmcgbW9kZSAoVlJ8RnVsbHNjcmVlbnxldGMpLlxuICovXG5mdW5jdGlvbiBJRnJhbWVNZXNzYWdlU2VuZGVyKGlmcmFtZSkge1xuICBpZiAoIWlmcmFtZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ05vIGlmcmFtZSBzcGVjaWZpZWQnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgdGhpcy5pZnJhbWUgPSBpZnJhbWU7XG5cbiAgLy8gT24gaU9TLCBpZiB0aGUgaWZyYW1lIGlzIGFjcm9zcyBkb21haW5zLCBhbHNvIHNlbmQgRGV2aWNlTW90aW9uIGRhdGEuXG4gIGlmICh0aGlzLmlzSU9TXygpKSB7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2RldmljZW1vdGlvbicsIHRoaXMub25EZXZpY2VNb3Rpb25fLmJpbmQodGhpcyksIGZhbHNlKTtcbiAgfVxufVxuXG4vKipcbiAqIFNlbmRzIGEgbWVzc2FnZSB0byB0aGUgYXNzb2NpYXRlZCBWUiBWaWV3IElGcmFtZS5cbiAqL1xuSUZyYW1lTWVzc2FnZVNlbmRlci5wcm90b3R5cGUuc2VuZCA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgdmFyIGlmcmFtZVdpbmRvdyA9IHRoaXMuaWZyYW1lLmNvbnRlbnRXaW5kb3c7XG4gIGlmcmFtZVdpbmRvdy5wb3N0TWVzc2FnZShtZXNzYWdlLCAnKicpO1xufTtcblxuSUZyYW1lTWVzc2FnZVNlbmRlci5wcm90b3R5cGUub25EZXZpY2VNb3Rpb25fID0gZnVuY3Rpb24oZSkge1xuICB2YXIgbWVzc2FnZSA9IHtcbiAgICB0eXBlOiBNZXNzYWdlLkRFVklDRV9NT1RJT04sXG4gICAgZGV2aWNlTW90aW9uRXZlbnQ6IHRoaXMuY2xvbmVEZXZpY2VNb3Rpb25FdmVudF8oZSlcbiAgfTtcblxuICB0aGlzLnNlbmQobWVzc2FnZSk7XG59O1xuXG5JRnJhbWVNZXNzYWdlU2VuZGVyLnByb3RvdHlwZS5jbG9uZURldmljZU1vdGlvbkV2ZW50XyA9IGZ1bmN0aW9uKGUpIHtcbiAgcmV0dXJuIHtcbiAgICBhY2NlbGVyYXRpb246IHtcbiAgICAgIHg6IGUuYWNjZWxlcmF0aW9uLngsXG4gICAgICB5OiBlLmFjY2VsZXJhdGlvbi55LFxuICAgICAgejogZS5hY2NlbGVyYXRpb24ueixcbiAgICB9LFxuICAgIGFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHk6IHtcbiAgICAgIHg6IGUuYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eS54LFxuICAgICAgeTogZS5hY2NlbGVyYXRpb25JbmNsdWRpbmdHcmF2aXR5LnksXG4gICAgICB6OiBlLmFjY2VsZXJhdGlvbkluY2x1ZGluZ0dyYXZpdHkueixcbiAgICB9LFxuICAgIHJvdGF0aW9uUmF0ZToge1xuICAgICAgYWxwaGE6IGUucm90YXRpb25SYXRlLmFscGhhLFxuICAgICAgYmV0YTogZS5yb3RhdGlvblJhdGUuYmV0YSxcbiAgICAgIGdhbW1hOiBlLnJvdGF0aW9uUmF0ZS5nYW1tYSxcbiAgICB9LFxuICAgIGludGVydmFsOiBlLmludGVydmFsLFxuICAgIHRpbWVTdGFtcDogZS50aW1lU3RhbXBcbiAgfTtcbn07XG5cbklGcmFtZU1lc3NhZ2VTZW5kZXIucHJvdG90eXBlLmlzSU9TXyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gL2lQYWR8aVBob25lfGlQb2QvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkgJiYgIXdpbmRvdy5NU1N0cmVhbTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSUZyYW1lTWVzc2FnZVNlbmRlcjtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNiBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbnZhciBQbGF5ZXIgPSByZXF1aXJlKCcuL3BsYXllcicpO1xuXG52YXIgVlJWaWV3ID0ge1xuICBQbGF5ZXI6IFBsYXllclxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBWUlZpZXc7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTYgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRlbWl0dGVyMycpO1xudmFyIElGcmFtZU1lc3NhZ2VTZW5kZXIgPSByZXF1aXJlKCcuL2lmcmFtZS1tZXNzYWdlLXNlbmRlcicpO1xudmFyIE1lc3NhZ2UgPSByZXF1aXJlKCcuLi9tZXNzYWdlJyk7XG52YXIgVXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuLy8gU2F2ZSB0aGUgZXhlY3V0aW5nIHNjcmlwdC4gVGhpcyB3aWxsIGJlIHVzZWQgdG8gY2FsY3VsYXRlIHRoZSBlbWJlZCBVUkwuXG52YXIgQ1VSUkVOVF9TQ1JJUFRfU1JDID0gVXRpbC5nZXRDdXJyZW50U2NyaXB0KCkuc3JjO1xudmFyIEZBS0VfRlVMTFNDUkVFTl9DTEFTUyA9ICd2cnZpZXctZmFrZS1mdWxsc2NyZWVuJztcblxuLyoqXG4gKiBFbnRyeSBwb2ludCBmb3IgdGhlIFZSIFZpZXcgSlMgQVBJLlxuICpcbiAqIEVtaXRzIHRoZSBmb2xsb3dpbmcgZXZlbnRzOlxuICogICAgcmVhZHk6IFdoZW4gdGhlIHBsYXllciBpcyBsb2FkZWQuXG4gKiAgICBtb2RlY2hhbmdlOiBXaGVuIHRoZSB2aWV3aW5nIG1vZGUgY2hhbmdlcyAobm9ybWFsLCBmdWxsc2NyZWVuLCBWUikuXG4gKiAgICBjbGljayAoaWQpOiBXaGVuIGEgaG90c3BvdCBpcyBjbGlja2VkLlxuICovXG5mdW5jdGlvbiBQbGF5ZXIoc2VsZWN0b3IsIGNvbnRlbnRJbmZvLCBvcHRpb25zKSB7XG4gIC8vIGN1c3RvbSBnbG9iYWwgb3B0aW9uc1xuICB0aGlzLmF1dG9wbGF5ID0gb3B0aW9ucyAmJiB0eXBlb2Ygb3B0aW9ucy5hdXRvcGxheSAhPT0gJ3VuZGVmaW5lZCcgPyAhIW9wdGlvbnMuYXV0b3BsYXkgOiB0cnVlO1xuICB0aGlzLmFzc2V0c1VybCA9IG9wdGlvbnMgJiYgdHlwZW9mIG9wdGlvbnMuYXNzZXRzVXJsICE9PSAndW5kZWZpbmVkJyA/IG9wdGlvbnMuYXNzZXRzVXJsIDogZmFsc2U7XG5cbiAgY29udGVudEluZm8uYXV0b3BsYXkgPSB0aGlzLmF1dG9wbGF5O1xuXG4gIC8vIENyZWF0ZSBhIFZSIFZpZXcgaWZyYW1lIGRlcGVuZGluZyBvbiB0aGUgcGFyYW1ldGVycy5cbiAgdmFyIGlmcmFtZSA9IHRoaXMuY3JlYXRlSWZyYW1lXyhjb250ZW50SW5mbyk7XG4gIHRoaXMuaWZyYW1lID0gaWZyYW1lO1xuXG4gIHZhciBwYXJlbnRFbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICBwYXJlbnRFbC5hcHBlbmRDaGlsZChpZnJhbWUpO1xuXG4gIC8vIE1ha2UgYSBzZW5kZXIgYXMgd2VsbCwgZm9yIHJlbHlpbmcgY29tbWFuZHMgdG8gdGhlIGNoaWxkIElGcmFtZS5cbiAgdGhpcy5zZW5kZXIgPSBuZXcgSUZyYW1lTWVzc2FnZVNlbmRlcihpZnJhbWUpO1xuXG4gIC8vIExpc3RlbiB0byBtZXNzYWdlcyBmcm9tIHRoZSBJRnJhbWUuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgdGhpcy5vbk1lc3NhZ2VfLmJpbmQodGhpcyksIGZhbHNlKTtcblxuICAvLyBFeHBvc2UgYSBwdWJsaWMgLmlzUGF1c2VkIGF0dHJpYnV0ZS5cbiAgdGhpcy5pc1BhdXNlZCA9IGZhbHNlO1xuICB0aGlzLnRpbWVfID0ge2N1cnJlbnRUaW1lOiAwLCBkdXJhdGlvbjogMH07XG4gIHRoaXMudm9sdW1lXyA9IDE7XG5cbiAgaWYgKFV0aWwuaXNJT1MoKSkge1xuICAgIHRoaXMuaW5qZWN0RnVsbHNjcmVlblN0eWxlc2hlZXRfKCk7XG4gIH1cbn1cblBsYXllci5wcm90b3R5cGUgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cbi8qKlxuICogQHBhcmFtIHBpdGNoIHtOdW1iZXJ9IFRoZSBsYXRpdHVkZSBvZiBjZW50ZXIsIHNwZWNpZmllZCBpbiBkZWdyZWVzLCBiZXR3ZWVuXG4gKiAtOTAgYW5kIDkwLCB3aXRoIDAgYXQgdGhlIGhvcml6b24uXG4gKiBAcGFyYW0geWF3IHtOdW1iZXJ9IFRoZSBsb25naXR1ZGUgb2YgY2VudGVyLCBzcGVjaWZpZWQgaW4gZGVncmVlcywgYmV0d2VlblxuICogLTE4MCBhbmQgMTgwLCB3aXRoIDAgYXQgdGhlIGltYWdlIGNlbnRlci5cbiAqIEBwYXJhbSByYWRpdXMge051bWJlcn0gVGhlIHJhZGl1cyBvZiB0aGUgaG90c3BvdCwgc3BlY2lmaWVkIGluIG1ldGVycy5cbiAqIEBwYXJhbSBkaXN0YW5jZSB7TnVtYmVyfSBUaGUgZGlzdGFuY2Ugb2YgdGhlIGhvdHNwb3QgZnJvbSBjYW1lcmEsIHNwZWNpZmllZFxuICogaW4gbWV0ZXJzLlxuICogQHBhcmFtIGhvdHNwb3RJZCB7U3RyaW5nfSBUaGUgSUQgb2YgdGhlIGhvdHNwb3QuXG4gKi9cblBsYXllci5wcm90b3R5cGUuYWRkSG90c3BvdCA9IGZ1bmN0aW9uIChob3RzcG90SWQsIHBhcmFtcykge1xuICAvLyBUT0RPOiBBZGQgdmFsaWRhdGlvbiB0byBwYXJhbXMuXG4gIHZhciBkYXRhID0ge1xuICAgIHBpdGNoOiBwYXJhbXMucGl0Y2gsXG4gICAgeWF3OiBwYXJhbXMueWF3LFxuICAgIHJhZGl1czogcGFyYW1zLnJhZGl1cyxcbiAgICBkaXN0YW5jZTogcGFyYW1zLmRpc3RhbmNlLFxuICAgIGN1c3RvbTogcGFyYW1zLmN1c3RvbSB8fCBudWxsLFxuICAgIGlkOiBob3RzcG90SWRcbiAgfTtcbiAgdGhpcy5zZW5kZXIuc2VuZCh7dHlwZTogTWVzc2FnZS5BRERfSE9UU1BPVCwgZGF0YTogZGF0YX0pO1xufTtcblxuUGxheWVyLnByb3RvdHlwZS5wbGF5ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNlbmRlci5zZW5kKHt0eXBlOiBNZXNzYWdlLlBMQVl9KTtcbn07XG5cblBsYXllci5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuc2VuZGVyLnNlbmQoe3R5cGU6IE1lc3NhZ2UuUEFVU0V9KTtcbn07XG5cblBsYXllci5wcm90b3R5cGUuc2V0Q29udGVudCA9IGZ1bmN0aW9uIChjb250ZW50SW5mbykge1xuICB0aGlzLmFic29sdXRpZnlQYXRoc18oY29udGVudEluZm8pO1xuICB2YXIgZGF0YSA9IHtcbiAgICBjb250ZW50SW5mbzogY29udGVudEluZm9cbiAgfTtcbiAgdGhpcy5zZW5kZXIuc2VuZCh7dHlwZTogTWVzc2FnZS5TRVRfQ09OVEVOVCwgZGF0YTogZGF0YX0pO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBzb2Z0d2FyZSB2b2x1bWUgb2YgdGhlIHZpZGVvLiAwIGlzIG11dGUsIDEgaXMgbWF4LlxuICovXG5QbGF5ZXIucHJvdG90eXBlLnNldFZvbHVtZSA9IGZ1bmN0aW9uICh2b2x1bWVMZXZlbCkge1xuICB2YXIgZGF0YSA9IHtcbiAgICB2b2x1bWVMZXZlbDogdm9sdW1lTGV2ZWxcbiAgfTtcbiAgdGhpcy5zZW5kZXIuc2VuZCh7dHlwZTogTWVzc2FnZS5TRVRfVk9MVU1FLCBkYXRhOiBkYXRhfSk7XG59O1xuXG5QbGF5ZXIucHJvdG90eXBlLmdldFZvbHVtZSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMudm9sdW1lXztcbn07XG5cbi8qKlxuICogU2V0IHRoZSBjdXJyZW50IHRpbWUgb2YgdGhlIG1lZGlhIGJlaW5nIHBsYXllZFxuICogQHBhcmFtIHtOdW1iZXJ9IHRpbWVcbiAqL1xuUGxheWVyLnByb3RvdHlwZS5zZXRDdXJyZW50VGltZSA9IGZ1bmN0aW9uICh0aW1lKSB7XG4gIHZhciBkYXRhID0ge1xuICAgIGN1cnJlbnRUaW1lOiB0aW1lXG4gIH07XG4gIHRoaXMuc2VuZGVyLnNlbmQoe3R5cGU6IE1lc3NhZ2UuU0VUX0NVUlJFTlRfVElNRSwgZGF0YTogZGF0YX0pO1xufTtcblxuUGxheWVyLnByb3RvdHlwZS5nZXRDdXJyZW50VGltZSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMudGltZV8uY3VycmVudFRpbWU7XG59O1xuXG5QbGF5ZXIucHJvdG90eXBlLmdldER1cmF0aW9uID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy50aW1lXy5kdXJhdGlvbjtcbn07XG5cbi8qKlxuICogSGVscGVyIGZvciBjcmVhdGluZyBhbiBpZnJhbWUuXG4gKlxuICogQHJldHVybiB7SUZyYW1lRWxlbWVudH0gVGhlIGlmcmFtZS5cbiAqL1xuUGxheWVyLnByb3RvdHlwZS5jcmVhdGVJZnJhbWVfID0gZnVuY3Rpb24gKGNvbnRlbnRJbmZvKSB7XG4gIHRoaXMuYWJzb2x1dGlmeVBhdGhzXyhjb250ZW50SW5mbyk7XG5cbiAgdmFyIGlmcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lmcmFtZScpO1xuICBpZnJhbWUuc2V0QXR0cmlidXRlKCdhbGxvd2Z1bGxzY3JlZW4nLCB0cnVlKTtcbiAgaWZyYW1lLnNldEF0dHJpYnV0ZSgnc2Nyb2xsaW5nJywgJ25vJyk7XG4gIGlmcmFtZS5zdHlsZS5ib3JkZXIgPSAwO1xuXG4gIC8vIEhhbmRsZSBpZnJhbWUgc2l6ZSBpZiB3aWR0aCBhbmQgaGVpZ2h0IGFyZSBzcGVjaWZpZWQuXG4gIGlmIChjb250ZW50SW5mby5oYXNPd25Qcm9wZXJ0eSgnd2lkdGgnKSkge1xuICAgIGlmcmFtZS5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgY29udGVudEluZm8ud2lkdGgpO1xuICAgIGRlbGV0ZSBjb250ZW50SW5mby53aWR0aDtcbiAgfVxuICBpZiAoY29udGVudEluZm8uaGFzT3duUHJvcGVydHkoJ2hlaWdodCcpKSB7XG4gICAgaWZyYW1lLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgY29udGVudEluZm8uaGVpZ2h0KTtcbiAgICBkZWxldGUgY29udGVudEluZm8uaGVpZ2h0O1xuICB9XG5cbiAgdmFyIHVybCA9IHRoaXMuZ2V0RW1iZWRVcmxfKCkgKyBVdGlsLmNyZWF0ZUdldFBhcmFtcyhjb250ZW50SW5mbyk7XG4gIGlmcmFtZS5zcmMgPSB1cmw7XG5cbiAgcmV0dXJuIGlmcmFtZTtcbn07XG5cblBsYXllci5wcm90b3R5cGUub25NZXNzYWdlXyA9IGZ1bmN0aW9uIChldmVudCkge1xuICB2YXIgbWVzc2FnZSA9IGV2ZW50LmRhdGE7XG4gIGlmICghbWVzc2FnZSB8fCAhbWVzc2FnZS50eXBlKSB7XG4gICAgY29uc29sZS53YXJuKCdSZWNlaXZlZCBtZXNzYWdlIHdpdGggbm8gdHlwZS4nKTtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIHR5cGUgPSBtZXNzYWdlLnR5cGUudG9Mb3dlckNhc2UoKTtcbiAgdmFyIGRhdGEgPSBtZXNzYWdlLmRhdGE7XG5cbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSAncmVhZHknOlxuICAgIGNhc2UgJ3NjZW5lcmVhZHknOlxuICAgIGNhc2UgJ21vZGVjaGFuZ2UnOlxuICAgIGNhc2UgJ2Vycm9yJzpcbiAgICBjYXNlICdjbGljayc6XG4gICAgY2FzZSAnZ2V0cG9zaXRpb24nOlxuICAgIGNhc2UgJ3N0YXJ0ZHJhdyc6XG4gICAgY2FzZSAnZW5kZHJhdyc6XG4gICAgY2FzZSAnc2hhcGV0cmFuc2Zvcm1lZCc6XG4gICAgY2FzZSAnc2hhcGVzZWxlY3RlZCc6XG4gICAgY2FzZSAnc2hhcGV1bnNlbGVjdGVkJzpcbiAgICBjYXNlICdlbmRlZCc6XG4gICAgICBpZiAodHlwZSA9PT0gJ3JlYWR5JyB8fCB0eXBlID09PSAnc2NlbmVyZWFkeScpIHtcbiAgICAgICAgdGhpcy50aW1lXy5kdXJhdGlvbiA9IGRhdGEuZHVyYXRpb247XG4gICAgICB9XG4gICAgICB0aGlzLmVtaXQodHlwZSwgZGF0YSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdwYXVzZWQnOlxuICAgICAgdGhpcy5pc1BhdXNlZCA9IGRhdGE7XG4gICAgICBpZiAodGhpcy5pc1BhdXNlZCkge1xuICAgICAgICB0aGlzLmVtaXQoJ3BhdXNlJywgZGF0YSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmVtaXQoJ3BsYXknLCBkYXRhKTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3ZvbHVtZWNoYW5nZSc6XG4gICAgICB0aGlzLnZvbHVtZV8gPSBkYXRhO1xuICAgICAgdGhpcy5lbWl0KCd0aW1ldXBkYXRlJywgZGF0YSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICd0aW1ldXBkYXRlJzpcbiAgICAgIHRoaXMudGltZV8gPSBkYXRhO1xuICAgICAgdGhpcy5lbWl0KCd0aW1ldXBkYXRlJywgZGF0YSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdlbnRlci1mdWxsc2NyZWVuJzpcbiAgICBjYXNlICdlbnRlci12cic6XG4gICAgICB0aGlzLnNldEZha2VGdWxsc2NyZWVuXyh0cnVlKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2V4aXQtZnVsbHNjcmVlbic6XG4gICAgICB0aGlzLnNldEZha2VGdWxsc2NyZWVuXyhmYWxzZSk7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgY29uc29sZS53YXJuKCdHb3QgdW5rbm93biBtZXNzYWdlIG9mIHR5cGUgJXMgZnJvbSAlcycsIG1lc3NhZ2UudHlwZSwgbWVzc2FnZS5vcmlnaW4pO1xuICB9XG59O1xuXG4vKipcbiAqIE5vdGU6IGlPUyBkb2Vzbid0IHN1cHBvcnQgdGhlIGZ1bGxzY3JlZW4gQVBJLlxuICogSW4gc3RhbmRhbG9uZSA8aWZyYW1lPiBtb2RlLCBWUiBWaWV3IGVtdWxhdGVzIGZ1bGxzY3JlZW4gYnkgcmVkaXJlY3RpbmcgdG9cbiAqIGFub3RoZXIgcGFnZS5cbiAqIEluIEpTIEFQSSBtb2RlLCB3ZSBzdHJldGNoIHRoZSBpZnJhbWUgdG8gY292ZXIgdGhlIGV4dGVudCBvZiB0aGUgcGFnZSB1c2luZ1xuICogQ1NTLiBUbyBkbyB0aGlzIGNsZWFubHksIHdlIGFsc28gaW5qZWN0IGEgc3R5bGVzaGVldC5cbiAqL1xuUGxheWVyLnByb3RvdHlwZS5zZXRGYWtlRnVsbHNjcmVlbl8gPSBmdW5jdGlvbiAoaXNGdWxsc2NyZWVuKSB7XG4gIGlmIChpc0Z1bGxzY3JlZW4pIHtcbiAgICB0aGlzLmlmcmFtZS5jbGFzc0xpc3QuYWRkKEZBS0VfRlVMTFNDUkVFTl9DTEFTUyk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5pZnJhbWUuY2xhc3NMaXN0LnJlbW92ZShGQUtFX0ZVTExTQ1JFRU5fQ0xBU1MpO1xuICB9XG59O1xuXG5QbGF5ZXIucHJvdG90eXBlLmluamVjdEZ1bGxzY3JlZW5TdHlsZXNoZWV0XyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHN0eWxlU3RyaW5nID0gW1xuICAgICdpZnJhbWUuJyArIEZBS0VfRlVMTFNDUkVFTl9DTEFTUyxcbiAgICAneycsXG4gICAgJ3Bvc2l0aW9uOiBmaXhlZCAhaW1wb3J0YW50OycsXG4gICAgJ2Rpc3BsYXk6IGJsb2NrICFpbXBvcnRhbnQ7JyxcbiAgICAnei1pbmRleDogOTk5OTk5OTk5OSAhaW1wb3J0YW50OycsXG4gICAgJ3RvcDogMCAhaW1wb3J0YW50OycsXG4gICAgJ2xlZnQ6IDAgIWltcG9ydGFudDsnLFxuICAgICd3aWR0aDogMTAwJSAhaW1wb3J0YW50OycsXG4gICAgJ2hlaWdodDogMTAwJSAhaW1wb3J0YW50OycsXG4gICAgJ21hcmdpbjogMCAhaW1wb3J0YW50OycsXG4gICAgJ30nLFxuICBdLmpvaW4oJ1xcbicpO1xuICB2YXIgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICBzdHlsZS5pbm5lckhUTUwgPSBzdHlsZVN0cmluZztcbiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzdHlsZSk7XG59O1xuXG5QbGF5ZXIucHJvdG90eXBlLmdldEVtYmVkVXJsXyA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gQXNzdW1lIHRoYXQgdGhlIHNjcmlwdCBpcyBpbiAkUk9PVC9idWlsZC9zb21ldGhpbmcuanMsIGFuZCB0aGF0IHRoZSBpZnJhbWVcbiAgLy8gSFRNTCBpcyBpbiAkUk9PVC9pbmRleC5odG1sLlxuICAvL1xuICAvLyBFLmc6IC92cnZpZXcvMi4wL2J1aWxkL3Zydmlldy5taW4uanMgPT4gL3Zydmlldy8yLjAvaW5kZXguaHRtbC5cbiAgdmFyIHBhdGggPSBDVVJSRU5UX1NDUklQVF9TUkM7XG4gIHZhciBzcGxpdCA9IHBhdGguc3BsaXQoJy8nKTtcbiAgdmFyIHJvb3RTcGxpdCA9IHNwbGl0LnNsaWNlKDAsIHNwbGl0Lmxlbmd0aCAtIDIpO1xuICB2YXIgcm9vdFBhdGggPSByb290U3BsaXQuam9pbignLycpO1xuICByZXR1cm4gcm9vdFBhdGggKyAnL2luZGV4Lmh0bWwnO1xufTtcblxuUGxheWVyLnByb3RvdHlwZS5nZXREaXJOYW1lXyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHBhdGggPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWU7XG4gIHBhdGggPSBwYXRoLnN1YnN0cmluZygwLCBwYXRoLmxhc3RJbmRleE9mKCcvJykpO1xuICByZXR1cm4gbG9jYXRpb24ucHJvdG9jb2wgKyAnLy8nICsgbG9jYXRpb24uaG9zdCArIHBhdGg7XG59O1xuXG4vKipcbiAqIE1ha2UgYWxsIG9mIHRoZSBVUkxzIGluc2lkZSBjb250ZW50SW5mbyBhYnNvbHV0ZSBpbnN0ZWFkIG9mIHJlbGF0aXZlLlxuICovXG5QbGF5ZXIucHJvdG90eXBlLmFic29sdXRpZnlQYXRoc18gPSBmdW5jdGlvbiAoY29udGVudEluZm8pIHtcbiAgdmFyIGRpck5hbWUgPSB0aGlzLmFzc2V0c1VybCB8fCB0aGlzLmdldERpck5hbWVfKCk7XG4gIHZhciB1cmxQYXJhbXMgPSBbJ2ltYWdlJywgJ3ByZXZpZXcnLCAndmlkZW8nXTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHVybFBhcmFtcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBuYW1lID0gdXJsUGFyYW1zW2ldO1xuICAgIHZhciBwYXRoID0gY29udGVudEluZm9bbmFtZV07XG4gICAgaWYgKHBhdGggJiYgVXRpbC5pc1BhdGhBYnNvbHV0ZShwYXRoKSkge1xuICAgICAgdmFyIGFic29sdXRlID0gVXRpbC5yZWxhdGl2ZVRvQWJzb2x1dGVQYXRoKGRpck5hbWUsIHBhdGgpO1xuICAgICAgY29udGVudEluZm9bbmFtZV0gPSBhYnNvbHV0ZTtcbiAgICAgIC8vY29uc29sZS5sb2coJ0NvbnZlcnRlZCB0byBhYnNvbHV0ZTogJXMnLCBhYnNvbHV0ZSk7XG4gICAgfVxuICB9XG59O1xuXG5QbGF5ZXIucHJvdG90eXBlLmdldFBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNlbmRlci5zZW5kKHt0eXBlOiBNZXNzYWdlLkdFVF9QT1NJVElPTiwgZGF0YToge319KTtcbn07XG5cblBsYXllci5wcm90b3R5cGUuYWN0aXZhdGVTaGFwZVRvb2wgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuc2VuZGVyLnNlbmQoe3R5cGU6IE1lc3NhZ2UuU1RBUlRfRFJBVywgZGF0YToge319KTtcbn07XG5QbGF5ZXIucHJvdG90eXBlLmRlYWN0aXZhdGVTaGFwZVRvb2wgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuc2VuZGVyLnNlbmQoe3R5cGU6IE1lc3NhZ2UuRU5EX0RSQVcsIGRhdGE6IHt9fSk7XG59O1xuXG5QbGF5ZXIucHJvdG90eXBlLmFkZFNoYXBlID0gZnVuY3Rpb24gKHNoYXBlSWQsIHBhcmFtcykge1xuICB0aGlzLnNlbmRlci5zZW5kKHt0eXBlOiBNZXNzYWdlLkFERF9TSEFQRSwgZGF0YToge2lkOiBzaGFwZUlkLCBwYXJhbXM6IHBhcmFtc319KTtcbn07XG5cblBsYXllci5wcm90b3R5cGUuZWRpdFNoYXBlID0gZnVuY3Rpb24gKHNoYXBlSWQsIHBhcmFtcykge1xuICB0aGlzLnNlbmRlci5zZW5kKHt0eXBlOiBNZXNzYWdlLkVESVRfU0hBUEUsIGRhdGE6IHtpZDogc2hhcGVJZCwgcGFyYW1zOiBwYXJhbXN9fSk7XG59O1xuXG5QbGF5ZXIucHJvdG90eXBlLnJlbW92ZVNoYXBlID0gZnVuY3Rpb24gKHNoYXBlSWQpIHtcbiAgdGhpcy5zZW5kZXIuc2VuZCh7dHlwZTogTWVzc2FnZS5SRU1PVkVfU0hBUEUsIGRhdGE6IHtpZDogc2hhcGVJZH19KTtcbn07XG5cblxuUGxheWVyLnByb3RvdHlwZS5hZGRTaGFwZUtleWZyYW1lID0gZnVuY3Rpb24gKHNoYXBlSWQsIGZyYW1lLCBwYXJhbXMpIHtcbiAgcGFyYW1zLmZyYW1lID0gZnJhbWU7XG4gIHRoaXMuc2VuZGVyLnNlbmQoe3R5cGU6IE1lc3NhZ2UuQUREX1NIQVBFX0tFWUZSQU1FLCBkYXRhOiB7aWQ6IHNoYXBlSWQsIHBhcmFtczogcGFyYW1zfX0pO1xufTtcblBsYXllci5wcm90b3R5cGUuZWRpdFNoYXBlS2V5ZnJhbWUgPSBmdW5jdGlvbiAoc2hhcGVJZCwgZnJhbWUsIHBhcmFtcykge1xuICBwYXJhbXMuZnJhbWUgPSBmcmFtZTtcbiAgdGhpcy5zZW5kZXIuc2VuZCh7dHlwZTogTWVzc2FnZS5FRElUX1NIQVBFX0tFWUZSQU1FLCBkYXRhOiB7aWQ6IHNoYXBlSWQsIHBhcmFtczogcGFyYW1zfX0pO1xufTtcblBsYXllci5wcm90b3R5cGUucmVtb3ZlU2hhcGVLZXlmcmFtZSA9IGZ1bmN0aW9uIChzaGFwZUlkLCBmcmFtZSkge1xuICB0aGlzLnNlbmRlci5zZW5kKHt0eXBlOiBNZXNzYWdlLlJFTU9WRV9TSEFQRV9LRVlGUkFNRSwgZGF0YToge2lkOiBzaGFwZUlkLCBwYXJhbXM6IHtmcmFtZTogZnJhbWV9fX0pO1xufTtcblxuUGxheWVyLnByb3RvdHlwZS5zZWVrID0gZnVuY3Rpb24gKGZyYW1lKSB7XG4gIHRoaXMuc2VuZGVyLnNlbmQoe3R5cGU6IE1lc3NhZ2UuU0VFSywgZGF0YToge2ZyYW1lOiBmcmFtZX19KTtcbn07XG5cblBsYXllci5wcm90b3R5cGUuY2xlYXJTaGFwZXMgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuc2VuZGVyLnNlbmQoe3R5cGU6IE1lc3NhZ2UuQ0xFQVJfU0hBUEVTLCBkYXRhOiB7fX0pO1xufTtcblxuUGxheWVyLnByb3RvdHlwZS5zZXRBdXRvcGxheSA9IGZ1bmN0aW9uIChib29sKSB7XG4gIHRoaXMuc2VuZGVyLnNlbmQoe3R5cGU6IE1lc3NhZ2UuU0VUX0FVVE9QTEFZLCBkYXRhOiB7YXV0b3BsYXk6IGJvb2x9fSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBsYXllcjtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNiBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbi8qKlxuICogTWVzc2FnZXMgZnJvbSB0aGUgQVBJIHRvIHRoZSBlbWJlZC5cbiAqL1xudmFyIE1lc3NhZ2UgPSB7XG4gICAgUExBWTogJ3BsYXknLFxuICAgIFBBVVNFOiAncGF1c2UnLFxuICAgIEFERF9IT1RTUE9UOiAnYWRkaG90c3BvdCcsXG4gICAgU0VUX0NPTlRFTlQ6ICdzZXRpbWFnZScsXG4gICAgU0VUX1ZPTFVNRTogJ3NldHZvbHVtZScsXG4gICAgU0VUX0FVVE9QTEFZOiAnc2V0YXV0b3BsYXknLFxuICAgIFRJTUVVUERBVEU6ICd0aW1ldXBkYXRlJyxcbiAgICBTRVRfQ1VSUkVOVF9USU1FOiAnc2V0Y3VycmVudHRpbWUnLFxuICAgIFNFRUs6ICdzZWVrJyxcbiAgICBERVZJQ0VfTU9USU9OOiAnZGV2aWNlbW90aW9uJyxcbiAgICBHRVRfUE9TSVRJT046ICdnZXRwb3NpdGlvbicsXG4gICAgU1RBUlRfRFJBVzogJ3N0YXJ0ZHJhdycsXG4gICAgRU5EX0RSQVc6ICdlbmRkcmF3JyxcbiAgICBBRERfU0hBUEU6ICdhZGRzaGFwZScsXG4gICAgQUREX1NIQVBFX0tFWUZSQU1FOiAnYWRkc2hhcGVrZXlmcmFtZScsXG4gICAgRURJVF9TSEFQRV9LRVlGUkFNRTogJ2VkaXRzaGFwZWtleWZyYW1lJyxcbiAgICBSRU1PVkVfU0hBUEVfS0VZRlJBTUU6ICdyZW1vdmVzaGFwZWtleWZyYW1lJyxcbiAgICBFRElUX1NIQVBFOiAnZWRpdHNoYXBlJyxcbiAgICBSRU1PVkVfU0hBUEU6ICdyZW1vdmVzaGFwZScsXG4gICAgQ0xFQVJfU0hBUEVTOiAnY2xlYXJzaGFwZXMnLFxuICAgIFNIQVBFX1RSQU5TRk9STUVEOiAnc2hhcGV0cmFuc2Zvcm1lZCcsXG4gICAgU0hBUEVfU0VMRUNURUQ6ICdzaGFwZXNlbGVjdGVkJyxcbiAgICBTSEFQRV9VTlNFTEVDVEVEOiAnc2hhcGV1bnNlbGVjdGVkJ1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNZXNzYWdlO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE2IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuVXRpbCA9IHdpbmRvdy5VdGlsIHx8IHt9O1xuXG5VdGlsLmlzRGF0YVVSSSA9IGZ1bmN0aW9uKHNyYykge1xuICByZXR1cm4gc3JjICYmIHNyYy5pbmRleE9mKCdkYXRhOicpID09IDA7XG59O1xuXG5VdGlsLmdlbmVyYXRlVVVJRCA9IGZ1bmN0aW9uKCkge1xuICBmdW5jdGlvbiBzNCgpIHtcbiAgICByZXR1cm4gTWF0aC5mbG9vcigoMSArIE1hdGgucmFuZG9tKCkpICogMHgxMDAwMClcbiAgICAudG9TdHJpbmcoMTYpXG4gICAgLnN1YnN0cmluZygxKTtcbiAgfVxuICByZXR1cm4gczQoKSArIHM0KCkgKyAnLScgKyBzNCgpICsgJy0nICsgczQoKSArICctJyArXG4gICAgczQoKSArICctJyArIHM0KCkgKyBzNCgpICsgczQoKTtcbn07XG5cblV0aWwuaXNNb2JpbGUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGNoZWNrID0gZmFsc2U7XG4gIChmdW5jdGlvbihhKXtpZigvKGFuZHJvaWR8YmJcXGQrfG1lZWdvKS4rbW9iaWxlfGF2YW50Z298YmFkYVxcL3xibGFja2JlcnJ5fGJsYXplcnxjb21wYWx8ZWxhaW5lfGZlbm5lY3xoaXB0b3B8aWVtb2JpbGV8aXAoaG9uZXxvZCl8aXJpc3xraW5kbGV8bGdlIHxtYWVtb3xtaWRwfG1tcHxtb2JpbGUuK2ZpcmVmb3h8bmV0ZnJvbnR8b3BlcmEgbShvYnxpbilpfHBhbG0oIG9zKT98cGhvbmV8cChpeGl8cmUpXFwvfHBsdWNrZXJ8cG9ja2V0fHBzcHxzZXJpZXMoNHw2KTB8c3ltYmlhbnx0cmVvfHVwXFwuKGJyb3dzZXJ8bGluayl8dm9kYWZvbmV8d2FwfHdpbmRvd3MgY2V8eGRhfHhpaW5vL2kudGVzdChhKXx8LzEyMDd8NjMxMHw2NTkwfDNnc298NHRocHw1MFsxLTZdaXw3NzBzfDgwMnN8YSB3YXxhYmFjfGFjKGVyfG9vfHNcXC0pfGFpKGtvfHJuKXxhbChhdnxjYXxjbyl8YW1vaXxhbihleHxueXx5dyl8YXB0dXxhcihjaHxnbyl8YXModGV8dXMpfGF0dHd8YXUoZGl8XFwtbXxyIHxzICl8YXZhbnxiZShja3xsbHxucSl8YmkobGJ8cmQpfGJsKGFjfGF6KXxicihlfHYpd3xidW1ifGJ3XFwtKG58dSl8YzU1XFwvfGNhcGl8Y2N3YXxjZG1cXC18Y2VsbHxjaHRtfGNsZGN8Y21kXFwtfGNvKG1wfG5kKXxjcmF3fGRhKGl0fGxsfG5nKXxkYnRlfGRjXFwtc3xkZXZpfGRpY2F8ZG1vYnxkbyhjfHApb3xkcygxMnxcXC1kKXxlbCg0OXxhaSl8ZW0obDJ8dWwpfGVyKGljfGswKXxlc2w4fGV6KFs0LTddMHxvc3x3YXx6ZSl8ZmV0Y3xmbHkoXFwtfF8pfGcxIHV8ZzU2MHxnZW5lfGdmXFwtNXxnXFwtbW98Z28oXFwud3xvZCl8Z3IoYWR8dW4pfGhhaWV8aGNpdHxoZFxcLShtfHB8dCl8aGVpXFwtfGhpKHB0fHRhKXxocCggaXxpcCl8aHNcXC1jfGh0KGMoXFwtfCB8X3xhfGd8cHxzfHQpfHRwKXxodShhd3x0Yyl8aVxcLSgyMHxnb3xtYSl8aTIzMHxpYWMoIHxcXC18XFwvKXxpYnJvfGlkZWF8aWcwMXxpa29tfGltMWt8aW5ub3xpcGFxfGlyaXN8amEodHx2KWF8amJyb3xqZW11fGppZ3N8a2RkaXxrZWppfGtndCggfFxcLyl8a2xvbnxrcHQgfGt3Y1xcLXxreW8oY3xrKXxsZShub3x4aSl8bGcoIGd8XFwvKGt8bHx1KXw1MHw1NHxcXC1bYS13XSl8bGlid3xseW54fG0xXFwtd3xtM2dhfG01MFxcL3xtYSh0ZXx1aXx4byl8bWMoMDF8MjF8Y2EpfG1cXC1jcnxtZShyY3xyaSl8bWkobzh8b2F8dHMpfG1tZWZ8bW8oMDF8MDJ8Yml8ZGV8ZG98dChcXC18IHxvfHYpfHp6KXxtdCg1MHxwMXx2ICl8bXdicHxteXdhfG4xMFswLTJdfG4yMFsyLTNdfG4zMCgwfDIpfG41MCgwfDJ8NSl8bjcoMCgwfDEpfDEwKXxuZSgoY3xtKVxcLXxvbnx0Znx3Znx3Z3x3dCl8bm9rKDZ8aSl8bnpwaHxvMmltfG9wKHRpfHd2KXxvcmFufG93ZzF8cDgwMHxwYW4oYXxkfHQpfHBkeGd8cGcoMTN8XFwtKFsxLThdfGMpKXxwaGlsfHBpcmV8cGwoYXl8dWMpfHBuXFwtMnxwbyhja3xydHxzZSl8cHJveHxwc2lvfHB0XFwtZ3xxYVxcLWF8cWMoMDd8MTJ8MjF8MzJ8NjB8XFwtWzItN118aVxcLSl8cXRla3xyMzgwfHI2MDB8cmFrc3xyaW05fHJvKHZlfHpvKXxzNTVcXC98c2EoZ2V8bWF8bW18bXN8bnl8dmEpfHNjKDAxfGhcXC18b298cFxcLSl8c2RrXFwvfHNlKGMoXFwtfDB8MSl8NDd8bWN8bmR8cmkpfHNnaFxcLXxzaGFyfHNpZShcXC18bSl8c2tcXC0wfHNsKDQ1fGlkKXxzbShhbHxhcnxiM3xpdHx0NSl8c28oZnR8bnkpfHNwKDAxfGhcXC18dlxcLXx2ICl8c3koMDF8bWIpfHQyKDE4fDUwKXx0NigwMHwxMHwxOCl8dGEoZ3R8bGspfHRjbFxcLXx0ZGdcXC18dGVsKGl8bSl8dGltXFwtfHRcXC1tb3x0byhwbHxzaCl8dHMoNzB8bVxcLXxtM3xtNSl8dHhcXC05fHVwKFxcLmJ8ZzF8c2kpfHV0c3R8djQwMHx2NzUwfHZlcml8dmkocmd8dGUpfHZrKDQwfDVbMC0zXXxcXC12KXx2bTQwfHZvZGF8dnVsY3x2eCg1Mnw1M3w2MHw2MXw3MHw4MHw4MXw4M3w4NXw5OCl8dzNjKFxcLXwgKXx3ZWJjfHdoaXR8d2koZyB8bmN8bncpfHdtbGJ8d29udXx4NzAwfHlhc1xcLXx5b3VyfHpldG98enRlXFwtL2kudGVzdChhLnN1YnN0cigwLDQpKSljaGVjayA9IHRydWV9KShuYXZpZ2F0b3IudXNlckFnZW50fHxuYXZpZ2F0b3IudmVuZG9yfHx3aW5kb3cub3BlcmEpO1xuICByZXR1cm4gY2hlY2s7XG59O1xuXG5VdGlsLmlzSU9TID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAvKGlQYWR8aVBob25lfGlQb2QpL2cudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KTtcbn07XG5cblV0aWwuaXNTYWZhcmkgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIC9eKCg/IWNocm9tZXxhbmRyb2lkKS4pKnNhZmFyaS9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCk7XG59O1xuXG5VdGlsLmNsb25lT2JqZWN0ID0gZnVuY3Rpb24ob2JqKSB7XG4gIHZhciBvdXQgPSB7fTtcbiAgZm9yIChrZXkgaW4gb2JqKSB7XG4gICAgb3V0W2tleV0gPSBvYmpba2V5XTtcbiAgfVxuICByZXR1cm4gb3V0O1xufTtcblxuVXRpbC5oYXNoQ29kZSA9IGZ1bmN0aW9uKHMpIHtcbiAgcmV0dXJuIHMuc3BsaXQoXCJcIikucmVkdWNlKGZ1bmN0aW9uKGEsYil7YT0oKGE8PDUpLWEpK2IuY2hhckNvZGVBdCgwKTtyZXR1cm4gYSZhfSwwKTtcbn07XG5cblV0aWwubG9hZFRyYWNrU3JjID0gZnVuY3Rpb24oY29udGV4dCwgc3JjLCBjYWxsYmFjaywgb3B0X3Byb2dyZXNzQ2FsbGJhY2spIHtcbiAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgcmVxdWVzdC5vcGVuKCdHRVQnLCBzcmMsIHRydWUpO1xuICByZXF1ZXN0LnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG5cbiAgLy8gRGVjb2RlIGFzeW5jaHJvbm91c2x5LlxuICByZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgIGNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKHJlcXVlc3QucmVzcG9uc2UsIGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgICAgY2FsbGJhY2soYnVmZmVyKTtcbiAgICB9LCBmdW5jdGlvbihlKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgIH0pO1xuICB9O1xuICBpZiAob3B0X3Byb2dyZXNzQ2FsbGJhY2spIHtcbiAgICByZXF1ZXN0Lm9ucHJvZ3Jlc3MgPSBmdW5jdGlvbihlKSB7XG4gICAgICB2YXIgcGVyY2VudCA9IGUubG9hZGVkIC8gZS50b3RhbDtcbiAgICAgIG9wdF9wcm9ncmVzc0NhbGxiYWNrKHBlcmNlbnQpO1xuICAgIH07XG4gIH1cbiAgcmVxdWVzdC5zZW5kKCk7XG59O1xuXG5VdGlsLmlzUG93MiA9IGZ1bmN0aW9uKG4pIHtcbiAgcmV0dXJuIChuICYgKG4gLSAxKSkgPT0gMDtcbn07XG5cblV0aWwuY2FwaXRhbGl6ZSA9IGZ1bmN0aW9uKHMpIHtcbiAgcmV0dXJuIHMuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzLnNsaWNlKDEpO1xufTtcblxuVXRpbC5pc0lGcmFtZSA9IGZ1bmN0aW9uKCkge1xuICB0cnkge1xuICAgIHJldHVybiB3aW5kb3cuc2VsZiAhPT0gd2luZG93LnRvcDtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59O1xuXG4vLyBGcm9tIGh0dHA6Ly9nb28uZ2wvNFdYM3RnXG5VdGlsLmdldFF1ZXJ5UGFyYW1ldGVyID0gZnVuY3Rpb24obmFtZSkge1xuICBuYW1lID0gbmFtZS5yZXBsYWNlKC9bXFxbXS8sIFwiXFxcXFtcIikucmVwbGFjZSgvW1xcXV0vLCBcIlxcXFxdXCIpO1xuICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKFwiW1xcXFw/Jl1cIiArIG5hbWUgKyBcIj0oW14mI10qKVwiKSxcbiAgICAgIHJlc3VsdHMgPSByZWdleC5leGVjKGxvY2F0aW9uLnNlYXJjaCk7XG4gIHJldHVybiByZXN1bHRzID09PSBudWxsID8gXCJcIiA6IGRlY29kZVVSSUNvbXBvbmVudChyZXN1bHRzWzFdLnJlcGxhY2UoL1xcKy9nLCBcIiBcIikpO1xufTtcblxuXG4vLyBGcm9tIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTE4NzEwNzcvcHJvcGVyLXdheS10by1kZXRlY3Qtd2ViZ2wtc3VwcG9ydC5cblV0aWwuaXNXZWJHTEVuYWJsZWQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICB0cnkgeyBnbCA9IGNhbnZhcy5nZXRDb250ZXh0KFwid2ViZ2xcIik7IH1cbiAgY2F0Y2ggKHgpIHsgZ2wgPSBudWxsOyB9XG5cbiAgaWYgKGdsID09IG51bGwpIHtcbiAgICB0cnkgeyBnbCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiZXhwZXJpbWVudGFsLXdlYmdsXCIpOyBleHBlcmltZW50YWwgPSB0cnVlOyB9XG4gICAgY2F0Y2ggKHgpIHsgZ2wgPSBudWxsOyB9XG4gIH1cbiAgcmV0dXJuICEhZ2w7XG59O1xuXG5VdGlsLmNsb25lID0gZnVuY3Rpb24ob2JqKSB7XG4gIHJldHVybiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG9iaikpO1xufTtcblxuLy8gRnJvbSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzEwMTQwNjA0L2Zhc3Rlc3QtaHlwb3RlbnVzZS1pbi1qYXZhc2NyaXB0XG5VdGlsLmh5cG90ID0gTWF0aC5oeXBvdCB8fCBmdW5jdGlvbih4LCB5KSB7XG4gIHJldHVybiBNYXRoLnNxcnQoeCp4ICsgeSp5KTtcbn07XG5cbi8vIEZyb20gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMTc0NDc3MTgvNjkzOTM0XG5VdGlsLmlzSUUxMSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvVHJpZGVudC8pO1xufTtcblxuVXRpbC5nZXRSZWN0Q2VudGVyID0gZnVuY3Rpb24ocmVjdCkge1xuICByZXR1cm4gbmV3IFRIUkVFLlZlY3RvcjIocmVjdC54ICsgcmVjdC53aWR0aC8yLCByZWN0LnkgKyByZWN0LmhlaWdodC8yKTtcbn07XG5cblV0aWwuZ2V0U2NyZWVuV2lkdGggPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIE1hdGgubWF4KHdpbmRvdy5zY3JlZW4ud2lkdGgsIHdpbmRvdy5zY3JlZW4uaGVpZ2h0KSAqXG4gICAgICB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbztcbn07XG5cblV0aWwuZ2V0U2NyZWVuSGVpZ2h0ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBNYXRoLm1pbih3aW5kb3cuc2NyZWVuLndpZHRoLCB3aW5kb3cuc2NyZWVuLmhlaWdodCkgKlxuICAgICAgd2luZG93LmRldmljZVBpeGVsUmF0aW87XG59O1xuXG5VdGlsLmlzSU9TOU9yTGVzcyA9IGZ1bmN0aW9uKCkge1xuICBpZiAoIVV0aWwuaXNJT1MoKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICB2YXIgcmUgPSAvKGlQaG9uZXxpUGFkfGlQb2QpIE9TIChbXFxkX10rKS87XG4gIHZhciBpT1NWZXJzaW9uID0gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaChyZSk7XG4gIGlmICghaU9TVmVyc2lvbikge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICAvLyBHZXQgdGhlIGxhc3QgZ3JvdXAuXG4gIHZhciB2ZXJzaW9uU3RyaW5nID0gaU9TVmVyc2lvbltpT1NWZXJzaW9uLmxlbmd0aCAtIDFdO1xuICB2YXIgbWFqb3JWZXJzaW9uID0gcGFyc2VGbG9hdCh2ZXJzaW9uU3RyaW5nKTtcbiAgcmV0dXJuIG1ham9yVmVyc2lvbiA8PSA5O1xufTtcblxuVXRpbC5nZXRFeHRlbnNpb24gPSBmdW5jdGlvbih1cmwpIHtcbiAgcmV0dXJuIHVybC5zcGxpdCgnLicpLnBvcCgpO1xufTtcblxuVXRpbC5jcmVhdGVHZXRQYXJhbXMgPSBmdW5jdGlvbihwYXJhbXMpIHtcbiAgdmFyIG91dCA9ICc/JztcbiAgZm9yICh2YXIgayBpbiBwYXJhbXMpIHtcbiAgICB2YXIgcGFyYW1TdHJpbmcgPSBrICsgJz0nICsgcGFyYW1zW2tdICsgJyYnO1xuICAgIG91dCArPSBwYXJhbVN0cmluZztcbiAgfVxuICAvLyBSZW1vdmUgdGhlIHRyYWlsaW5nIGFtcGVyc2FuZC5cbiAgb3V0LnN1YnN0cmluZygwLCBwYXJhbXMubGVuZ3RoIC0gMik7XG4gIHJldHVybiBvdXQ7XG59O1xuXG5VdGlsLnNlbmRQYXJlbnRNZXNzYWdlID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICBpZiAod2luZG93LnBhcmVudCkge1xuICAgIHBhcmVudC5wb3N0TWVzc2FnZShtZXNzYWdlLCAnKicpO1xuICB9XG59O1xuXG5VdGlsLnBhcnNlQm9vbGVhbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICh2YWx1ZSA9PSAnZmFsc2UnIHx8IHZhbHVlID09IDApIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0gZWxzZSBpZiAodmFsdWUgPT0gJ3RydWUnIHx8IHZhbHVlID09IDEpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gISF2YWx1ZTtcbiAgfVxufTtcblxuLyoqXG4gKiBAcGFyYW0gYmFzZSB7U3RyaW5nfSBBbiBhYnNvbHV0ZSBkaXJlY3Rvcnkgcm9vdC5cbiAqIEBwYXJhbSByZWxhdGl2ZSB7U3RyaW5nfSBBIHJlbGF0aXZlIHBhdGguXG4gKlxuICogQHJldHVybnMge1N0cmluZ30gQW4gYWJzb2x1dGUgcGF0aCBjb3JyZXNwb25kaW5nIHRvIHRoZSByb290UGF0aC5cbiAqXG4gKiBGcm9tIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzE0NzgwNDYzLzY5MzkzNC5cbiAqL1xuVXRpbC5yZWxhdGl2ZVRvQWJzb2x1dGVQYXRoID0gZnVuY3Rpb24oYmFzZSwgcmVsYXRpdmUpIHtcbiAgdmFyIHN0YWNrID0gYmFzZS5zcGxpdCgnLycpO1xuICB2YXIgcGFydHMgPSByZWxhdGl2ZS5zcGxpdCgnLycpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHBhcnRzW2ldID09ICcuJykge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmIChwYXJ0c1tpXSA9PSAnLi4nKSB7XG4gICAgICBzdGFjay5wb3AoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhY2sucHVzaChwYXJ0c1tpXSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdGFjay5qb2luKCcvJyk7XG59O1xuXG4vKipcbiAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWZmIHRoZSBzcGVjaWZpZWQgcGF0aCBpcyBhbiBhYnNvbHV0ZSBwYXRoLlxuICovXG5VdGlsLmlzUGF0aEFic29sdXRlID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gISAvXig/OlxcL3xbYS16XSs6XFwvXFwvKS8udGVzdChwYXRoKTtcbn1cblxuVXRpbC5pc0VtcHR5T2JqZWN0ID0gZnVuY3Rpb24ob2JqKSB7XG4gIHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvYmopLmxlbmd0aCA9PSAwO1xufTtcblxuVXRpbC5pc0RlYnVnID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBVdGlsLnBhcnNlQm9vbGVhbihVdGlsLmdldFF1ZXJ5UGFyYW1ldGVyKCdkZWJ1ZycpKTtcbn07XG5cblV0aWwuZ2V0Q3VycmVudFNjcmlwdCA9IGZ1bmN0aW9uKCkge1xuICAvLyBOb3RlOiBpbiBJRTExLCBkb2N1bWVudC5jdXJyZW50U2NyaXB0IGRvZXNuJ3Qgd29yaywgc28gd2UgZmFsbCBiYWNrIHRvIHRoaXNcbiAgLy8gaGFjaywgdGFrZW4gZnJvbSBodHRwczovL2dvby5nbC9UcEV4dUguXG4gIGlmICghZG9jdW1lbnQuY3VycmVudFNjcmlwdCkge1xuICAgIGNvbnNvbGUud2FybignVGhpcyBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgZG9jdW1lbnQuY3VycmVudFNjcmlwdC4gVHJ5aW5nIGZhbGxiYWNrLicpO1xuICB9XG4gIHJldHVybiBkb2N1bWVudC5jdXJyZW50U2NyaXB0IHx8IGRvY3VtZW50LnNjcmlwdHNbZG9jdW1lbnQuc2NyaXB0cy5sZW5ndGggLSAxXTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFV0aWw7XG4iXX0=
