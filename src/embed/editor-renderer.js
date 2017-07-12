"use strict";

var EventEmitter = require('eventemitter3');
var TWEEN = require('tween.js');
var Util = require('../util');
var earcut = require('earcut');

// Constants for the active/inactive animation.
var INACTIVE_COLOR = new THREE.Color(1, 1, 1);
var ACTIVE_COLOR = new THREE.Color(0.8, 0, 0);
var ACTIVE_DURATION = 100;

function EditorRenderer(worldRenderer) {

  this.worldRenderer = worldRenderer;
  this.scene = worldRenderer.scene;

  // if player is in editor mode
  this.editorMode = false;
  // if draw shape tool is active
  this.toolActive = false;
  // if user is currently drawing a shape
  this.drawingShape = false;
  // geometry of the currently drawing shape
  this.currentShapeGeometry = null;
  // handles of the currently drawing shape
  this.currentShapeHandles = [];
  // shapes drawn
  this.shapes = {};
  // shapes info (start/end frame, color, etc)
  this.shapesInfo = {};
  // shapes keyframes (position of vertices during video time)
  this.shapesKeyframes = {};
  // currently selected shape
  this.selectedShape = null;
  // currently selected shape handle
  this.selectedShapeHandle = null;
  // flag for track dragging
  this.isDragging = false;
  // video time
  this.videoTime = 0;
  // pointerCursorActive
  this.pointerCursorActive = false;

  var body = document.body;
  if (!Util.isMobile()) {
    // Only enable mouse events on desktop.
    body.addEventListener('mousedown', this.onMouseDown_.bind(this), false);
    body.addEventListener('mousemove', this.onMouseMove_.bind(this), false);
    body.addEventListener('mouseup', this.onMouseUp_.bind(this), false);
  }

  // Add a placeholder for shapes.
  this.shapesRoot = new THREE.Object3D();
  this.scene.add(this.shapesRoot);

  // Add a placeholder for temp shapes borders.
  this.shapesTempRoot = new THREE.Object3D();
  this.scene.add(this.shapesTempRoot);

  // For raycasting. Initialize mouse to be off screen initially.
  this.pointer = new THREE.Vector2(1, 1);
  this.raycaster = new THREE.Raycaster();
}

EditorRenderer.prototype = new EventEmitter();

EditorRenderer.prototype.setEditorMode = function (bool) {
  this.editorMode = bool;
};

/**
 * Update shapes, called on render and executed on videoTime change
 * @param currentTime
 */
EditorRenderer.prototype.update = function (currentTime) {

  if (!currentTime) {
    currentTime = 0;
  }
  if (this.videoTime === currentTime) {
    return;
  }

  // on each video frame
  this.videoTime = currentTime;

  var shape,
    shapePoints,
    shapePointVector,
    shapePointTransitionQuaternion,
    temp,
    shapesKeyframesIndex,
    percentage;

  for (var shape_id in this.shapesKeyframes) {

    temp = this.getShapeAnimationPercentage_(shape_id, currentTime);
    shape = this.shapes[shape_id];

    if (temp === -1) {

      // hide shape
      shape.visible = false;
      continue;

    } else if (temp === false) {

      // do not interpolate shape

      if (!shape.visible) {
        shape.visible = true;
      }

      continue;
    }

    shapesKeyframesIndex = temp[0]; // initial keyframe index
    percentage = temp[1];           // percentage [0, 1] of the transformation

    shapePoints = this.shapesKeyframes[shape_id][shapesKeyframesIndex].vertices;

    // translate all shape point using Quaternion.slerp
    for (var i = 0, l = shapePoints.length; i < l; i++) {

      if (shape.children[i].name === 'handle' && typeof shapePoints[i].quaternion !== 'undefined') {
        shapePointVector = new THREE.Vector3(shapePoints[i].x, shapePoints[i].y, shapePoints[i].z);
        shapePointTransitionQuaternion = (new THREE.Quaternion()).slerp(shapePoints[i].quaternion, percentage);
        shape.children[i].position.copy(shapePointVector.applyQuaternion(shapePointTransitionQuaternion));
      }
    }

    this.updateShapeFill_(shape, false);

    if (!shape.visible) {
      shape.visible = true;
    }
  }

};

/**
 * Set shape vertices quaternion and returns:
 * false -> means no transformation needed, shape must remain as it is
 * -1 -> hide shape
 * [ shapesKeyframesIndex, quaternion percentage [0,1] ]
 *
 * @param shape_id
 * @param frame
 * @returns {*}
 * @private
 */
EditorRenderer.prototype.getShapeAnimationPercentage_ = function (shape_id, frame) {

  var shapeKeyframes = this.shapesKeyframes[shape_id],
    prevFrame,
    nextFrame,
    firstFrame,
    lastFrame,
    relativeFrame,
    Q1, Q2;

  // relative frame calc
  firstFrame = this.shapesInfo[shape_id].start_frame;
  lastFrame = this.shapesInfo[shape_id].end_frame;
  relativeFrame = frame - firstFrame;

  if (frame > lastFrame || frame < firstFrame) {
    // hide after shape end keyframe
    return -1;
  }

  // if this shape doesn't have keyframes
  if (!shapeKeyframes) {
    return false;
  }

  if (shapeKeyframes.length < 2) {
    // don't trasform if there is only 1 keyframe
    return false;
  }

  // get rotation quaternions
  for (var i = 0, l = shapeKeyframes.length; i < l; i++) {

    prevFrame = shapeKeyframes[i].frame;

    if (i + 1 === l) {
      // mimic a keyframe on shape lastFrame
      nextFrame = lastFrame;
      return false;
    }

    nextFrame = shapeKeyframes[i + 1].frame;

    if (prevFrame <= relativeFrame && relativeFrame <= nextFrame) {

      // calculate shape transformations
      for (var j = 0, ll = shapeKeyframes[i].vertices.length; j < ll; j++) {

        // add rotation quaternion to keyframe if not exists
        if (typeof shapeKeyframes[i].vertices[j].quaternion === 'undefined') {

          Q1 = shapeKeyframes[i].vertices[j];
          Q2 = shapeKeyframes[i + 1].vertices[j];

          shapeKeyframes[i].vertices[j].quaternion = (new THREE.Quaternion()).setFromUnitVectors(Q1.normalize(), Q2.normalize());

          // console.debug('Created quaternion for shape ' + shape_id + ' from frame ' + shapeKeyframes[i].frame + ' and frame ' + shapeKeyframes[i + 1].frame)
        } //else {
          //console.debug('Quaternion exists for shape ' + shape_id + ' at frame ' + shapeKeyframes[i].frame)
        //}

      }

      // return animation percentage [0, 1]
      return [i, (relativeFrame - prevFrame) / (nextFrame - prevFrame)];
    }
  }

  // console.warn('Frame outside shape time frame, hide shape...', startFrame, relativeFrame, endFrame);
  return false;

};

/**
 * Returns true if draw tool is active or if a shape is selected
 * @returns {boolean}
 */
EditorRenderer.prototype.isDrawing = function () {
  return !!(this.toolActive || this.selectedShape || this.selectedShapeHandle);
};

/**
 * Activate draw shape tool
 */
EditorRenderer.prototype.startDraw = function () {
  this.toolActive = true;
};
/**
 * Deactivate draw shape tool
 */
EditorRenderer.prototype.endDraw = function () {
  this.toolActive = false;
  this.clearDrawnSegments_();
};

/**
 * On mouse down
 * @param e
 * @private
 */
EditorRenderer.prototype.onMouseDown_ = function (e) {
  var intersectingShape;
  var handle;
  var isHandle;
  this.updateMouse_(e);
  this.wasShapeTransformed = false;
  this.wasShapeHandleTransformed = false;

  // check if click intersects with some shapes...
  intersectingShape = this.getIntersectingShapeOrHandles_();
  isHandle = intersectingShape && intersectingShape.name === 'handle';

  // shape handle selected
  if (isHandle) {
    handle = intersectingShape;
    intersectingShape = handle.parent;
    this.selectedShapeHandle = handle;
    console.log('handle!', handle)
  } else {
    this.selectedShapeHandle = null;
  }

  // check if current shape has to be unselected
  if (this.selectedShape && (!intersectingShape || this.selectedShape !== intersectingShape)) {
    // if a shape was selected but now it's not, deselect it
    if (this.editorMode) {
      this.blurShape_(this.selectedShape.name);
    }

    this.deselectShape();
  }

  // check if a shape has to be selected
  if (!this.selectedShape) {
    // if shape not already selected, select it
    if (intersectingShape) {
      this.selectShape(intersectingShape);

      if (this.editorMode) {
        this.focusShape_(intersectingShape.name);
      }
    }
  }

  if (this.editorMode) {
    this.isDragging = true;

    if (this.selectedShape) {

    }

    if (this.toolActive) {
      var pointOnSphere = this.getClickPositionOnSphere_();
      this.addPointToShape_(pointOnSphere);
    }
  }

};

/**
 * On mouse move
 * @param e
 * @private
 */
EditorRenderer.prototype.onMouseMove_ = function (e) {
  var pointOnSphere;
  if (this.isDrawing()) {
    // prevent camera rotation
    e.stopPropagation();

    if (this.isDragging) {
      this.updateMouse_(e);
      pointOnSphere = this.getClickPositionOnSphere_();

      if (this.selectedShapeHandle) {
        // translate shape handle
        this.wasShapeHandleTransformed = true;
        this.selectedShapeHandle.position.copy(pointOnSphere);
        this.updateShapeFill_(this.selectedShapeHandle.parent, true);
      }
      else if (this.selectedShape) {
        // translate entire shape
        if (this.prevPointerPosition) {
          this.wasShapeTransformed = true;
          this.translateShape_(this.selectedShape, this.prevPointerPosition, pointOnSphere);
        }

        this.prevPointerPosition = pointOnSphere;
      }
    }
  }
  else if (!this.editorMode) {
    // custom cursor on area mouse over
    this.updateMouse_(e);
    var intersectingShape = this.getIntersectingShapeOrHandles_();

    if(intersectingShape && intersectingShape.name !== 'handle' && intersectingShape.visible === true
      && !this.pointerCursorActive) {
        document.body.classList.add('action-pointer');
        this.pointerCursorActive = true;
    } else if(this.pointerCursorActive) {
        document.body.classList.remove('action-pointer');
        this.pointerCursorActive = false;
      }
    }

};

/**
 * On Mouse up
 * @param e
 * @private
 */
EditorRenderer.prototype.onMouseUp_ = function (e) {
  if (this.isDrawing()) {
    e.stopPropagation();
  }

  this.isDragging = false;

  if (this.selectedShapeHandle && this.wasShapeHandleTransformed) {
    this.emit('transformed', this.selectedShapeHandle.parent);
    this.selectedShapeHandle = null;
  }

  else if (this.selectedShape && this.wasShapeTransformed) {
    this.emit('transformed', this.selectedShape);
    this.prevPointerPosition = null;
  }
};

/**
 * Select a shape
 * @param shape
 */
EditorRenderer.prototype.selectShape = function (shape) {
  this.selectedShape = shape;
  this.emit('shapeselected', this.selectedShape);
};
/**
 * Deselect current shape
 */
EditorRenderer.prototype.deselectShape = function () {
  this.selectedShape = null;
  this.emit('shapeunselected');
};

/**
 * Focus a shape
 * @param shape_id
 * @private
 */
EditorRenderer.prototype.focusShape_ = function (shape_id) {
  var shape = this.shapes[shape_id];
  var outer = shape.getObjectByName('fill');

  this.tween = new TWEEN.Tween(outer.material.color).to(ACTIVE_COLOR, ACTIVE_DURATION)
    .start();
};

/**
 * Blur a shape
 * @param shape_id
 * @private
 */
EditorRenderer.prototype.blurShape_ = function (shape_id) {
  var shape = this.shapes[shape_id];
  var outer = shape.getObjectByName('fill');

  var shapeBg = typeof this.shapesInfo[shape_id] !== 'undefined' ? this.shapesInfo[shape_id].background_color : INACTIVE_COLOR;

  console.log(shapeBg);

  this.tween = new TWEEN.Tween(outer.material.color).to(shapeBg, ACTIVE_DURATION)
    .start();
};

function parseCSSColor(rgba) {
  if (!rgba) return;

  var ret = {
    color: INACTIVE_COLOR,
    opacity: 1
  };

  if (rgba.indexOf('#') === 0) {
    ret.color = rgba; // hex
  } else {

    var rgb = rgba.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/i);

    if (rgb) {
      ret.color = "rgb(" + parseInt(rgb[1], 10) + "," + parseInt(rgb[2], 10) + "," + parseInt(rgb[3], 10) + ")";
      ret.opacity = typeof rgb[4] !== 'undefined' ? parseFloat(rgb[1]) : 1;
    }
  }

  return ret;
}

/**
 * Add a point to the current drawing shape
 * Called on mousedown
 * @param point
 * @returns {boolean}
 * @private
 */
EditorRenderer.prototype.addPointToShape_ = function (point) {

  if (!point) {
    return false;
  }

  var closeShape = false;

  // check if current point can close the geometry object
  if (this.currentShapeGeometry && this.drawingShape && this.currentShapeGeometry.vertices.length > 2) {
    closeShape = this.isPointNearTo_(point, this.currentShapeGeometry.vertices[0]);
  }

  // create a new geometry object
  if (!this.drawingShape) {
    this.drawingShape = true;
    this.currentShapeGeometry = new THREE.Geometry();
  }

  // add currrent point to geometry object
  if (!this.drawingShape || !closeShape) {

    this.currentShapeGeometry.vertices.push(
      new THREE.Vector3(point.x, point.y, point.z)
    );

    // draw temp segment
    this.renderDrawnSegment_();
  }

  // close the geometry object and render the shape
  if (closeShape) {

    // add last vertex (same as first) to close the shape
    this.currentShapeGeometry.vertices.push(
      new THREE.Vector3(this.currentShapeGeometry.vertices[0].x, this.currentShapeGeometry.vertices[0].y, this.currentShapeGeometry.vertices[0].z)
    );

    var shape = this.createShape(this.currentShapeGeometry.vertices);

    // reset shape drawing helpers (temp handles and segments)
    this.clearDrawnSegments_();

    // deactivate tool
    this.endDraw();
    this.emit('drawn', shape);
  }

};


/**
 * Creates a shape
 * @param vertices
 * @param id
 * @returns {SEA3D.Object3D|THREE.SEA3D.Object3D|*|Object3D|W|x}
 */
EditorRenderer.prototype.createShape = function (vertices, id) {

  var shape = this.createShape_(vertices, id);
  shape.name = id || shape.uuid;

  // add vertices to shapes keyframes
  this.shapesKeyframes[shape.name] = [{
    frame: 0,
    vertices: vertices
  }];

  // add empty shape info
  this.shapesInfo[shape.name] = {
    background_color: INACTIVE_COLOR,
    start_frame: 0,
    end_frame: 60
  };

  // add shape to scene
  this.shapes[shape.name] = shape;
  this.shapesRoot.add(shape);

  return shape;
};

/**
 * Creates a shape form a set of vertices (points)
 * @param vertices
 * @returns {SEA3D.Object3D|THREE.SEA3D.Object3D|*|Object3D|W|x}
 */
EditorRenderer.prototype.createShape_ = function (vertices, shapeId) {

  //var shapeGeometry = new THREE.Geometry();
  //shapeGeometry.vertices = points;

  // draw borders of the shape
  //var borders = new THREE.Line(shapeGeometry, new THREE.LineBasicMaterial({color: "red"}));
  //borders.name = 'borders';

  // draw fill
  var fill = this.createShapeFill_(vertices, false, shapeId);

  // handles wrapper object
  //var handles = new THREE.Object3D();
  //handles.name = 'handles';

  // wrapper object
  var shape = new THREE.Object3D();
  shape.name = 'shape';

  // draw handles
  for (var i = 0; i < vertices.length; i++) {
    var handle = this.createHandle_(vertices[i]);
    shape.add(handle);
  }


  shape.add(fill);
  //shape.add(handles);
  //shape.add(borders);

  console.log('Created shape with ' + vertices.length + ' vertices!', shape);

  return shape;
};

/**
 * edit a shape at a specified frame
 * @param id
 * @param params
 */
EditorRenderer.prototype.editShape = function (id, params) {

  if (typeof this.shapes[id] === 'undefined') {
    console.warn('Cannot update shape, no shape found:' + id);
    return false;
  }

  this.shapesInfo[id] = null;

  var bg = parseCSSColor(params.background_color);

  this.shapesInfo[id] = {
    background_color: INACTIVE_COLOR,
    start_frame: params.start_frame || 0,
    end_frame: params.end_frame || 60
  };

  if (bg) {
    this.shapesInfo[id].background_color = new THREE.Color(bg.color);
    this.shapesInfo[id].opacity = bg.opacity;
  }

};

/**
 * Remove a shape and all its keyframes
 * @param id
 */
EditorRenderer.prototype.removeShape = function (id) {
  // If there's no shape with this ID, fail.
  if (!this.shapes[id]) {
    console.error('Attempt to remove non-existing shape with id %s.', id);
    return;
  }
  // Remove the mesh from the scene.
  this.shapesRoot.remove(this.shapes[id]);

  delete this.shapes[id];
  delete this.shapesInfo[id];
  delete this.shapesKeyframes[id];

  // If this shape was selected, make sure it gets unselected.
  this.selectedShape = null;
};

/**
 * Removes all the shapes and keyframes
 */
EditorRenderer.prototype.clearShapes = function () {
  for (var id in this.shapes) {
    this.removeShape(id);
  }

  this.shapes = {};
  this.shapesInfo = {};
  this.shapesKeyframes = {};
};

/**
 * Updates a shape Mesh after an handle drag
 * @private
 */
EditorRenderer.prototype.updateShapeFill_ = function (shape, isShapeSelected) {
  var vertices = [];

  for (var i = 0; i < shape.children.length; i++) {
    var obj = shape.children[i];
    if (obj.name === 'handle') {
      vertices.push(obj.position);
    }
  }

  var newFill = this.createShapeFill_(vertices, isShapeSelected, shape.name);

  shape.remove(shape.getObjectByName('fill'));
  shape.add(newFill);
};

/**
 * Creates a Mesh between given points
 * @param vertices
 * @param isShapeSelected
 * @param shapeId
 * @returns {THREE.SEA3D.Mesh|Raycaster.params.Mesh|{}|SEA3D.Mesh|Jb.params.Mesh|pe.params.Mesh|*}
 * @private
 */
EditorRenderer.prototype.createShapeFill_ = function (vertices, isShapeSelected, shapeId) {

  // console.log(shapeId, typeof this.shapesInfo[shapeId] !== 'undefined' ? this.shapesInfo[shapeId] : false)

  var fill;
  var fillGeometry = new THREE.Geometry();
  var fillMaterial = new THREE.MeshBasicMaterial({
    color: isShapeSelected ? ACTIVE_COLOR :
      (typeof this.shapesInfo[shapeId] !== 'undefined' ? this.shapesInfo[shapeId].background_color : 0xffffff),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6
  });
  var faces = [];
  var flattenVertices = [];
  var triangles;
  var i, l;

  for (i = 0, l = vertices.length; i < l; i++) {
    flattenVertices.push(vertices[i].x, vertices[i].y, vertices[i].z);
  }

  triangles = earcut(flattenVertices, null, 3);

  for (i = 0, l = triangles.length; i < l; i += 3) {
    if (i % 3 === 0) {
      faces.push(new THREE.Face3(triangles[i], triangles[i + 1], triangles[i + 2]));
    }
  }

  fillGeometry.faces = faces;
  fillGeometry.vertices = vertices;
  fill = new THREE.Mesh(fillGeometry, fillMaterial);
  fill.name = 'fill';

  return fill;
};

/**
 * Render the current drawn segment with temp handles
 * @private
 */
EditorRenderer.prototype.renderDrawnSegment_ = function () {

  var vertices = this.currentShapeGeometry.vertices.slice();
  var currentVertex = vertices[vertices.length - 1];

  // segment
  if (vertices.length > 1) {
    var lastVertex = vertices[vertices.length - 2];
    var tempGeometry = new THREE.Geometry();
    tempGeometry.vertices = [
      new THREE.Vector3(lastVertex.x, lastVertex.y, lastVertex.z),
      new THREE.Vector3(currentVertex.x, currentVertex.y, currentVertex.z)
    ];
    var tempLine = new THREE.Line(tempGeometry, new THREE.LineBasicMaterial({color: "red"}));
    this.shapesTempRoot.add(tempLine);
  }

  // handle
  var handle = this.createHandle_(currentVertex);
  this.shapesTempRoot.add(handle);
  this.currentShapeHandles.push(handle);

};

/**
 * Remove temp drawn segments
 * @private
 */
EditorRenderer.prototype.clearDrawnSegments_ = function () {
  if (!this.drawingShape) {
    return;
  }

  this.drawingShape = false;
  this.currentShapeGeometry = null;
  for (var i = this.shapesTempRoot.children.length - 1; i >= 0; i--) {
    this.shapesTempRoot.remove(this.shapesTempRoot.children[i]);
  }
  this.currentShapeHandles.length = 0;
};

/**
 * Creates an handle
 * @param point
 * @returns {THREE.SEA3D.Mesh|Raycaster.params.Mesh|{}|SEA3D.Mesh|Jb.params.Mesh|pe.params.Mesh|*}
 * @private
 */
EditorRenderer.prototype.createHandle_ = function (point) {
  var handleMaterial = new THREE.MeshBasicMaterial({color: "blue"});
  var handleGeometry = new THREE.SphereGeometry(0.02, 32, 32);
  var handle = new THREE.Mesh(handleGeometry, handleMaterial);
  handle.position.set(point.x, point.y, point.z);
  handle.name = 'handle';
  handle.visible = this.editorMode;
  return handle;
};

/**
 * Add a keyframe to a shape
 * @param shape_id
 * @param frame
 * @param vertices
 * @returns {boolean}
 */
EditorRenderer.prototype.addShapeKeyframe = function (shape_id, frame, vertices) {

  var shape;

  if (typeof this.shapes[shape_id] === 'undefined') {
    console.warn('Cannot add keyframe to shape with id ' + shape_id + ', it doesn\'t exists.');
    return false;
  }

  shape = this.shapes[shape_id];

  if (!(vertices instanceof Array && shape.children.length - 1 === vertices.length)) {
    console.warn('Cannot add keyframe to shape with id ' + shape_id + ', different number of vertices.');
    return false;
  }

  // add to shapesKeyframes object
  this.shapesKeyframes[shape_id].push({
    frame: frame,
    vertices: vertices
  });

  // order frames ascending
  this.shapesKeyframes[shape_id].sort(function (a, b) {
    return (a.frame > b.frame) ? 1 : ((b.frame > a.frame) ? -1 : 0);
  });

  var keyframeIndex = this.getShapeKeyframeIndex_(shape_id, frame);

  // for all shape vertices
  for (var j = 0; j < this.shapesKeyframes[shape_id][keyframeIndex].vertices.length; j++) {
    if (keyframeIndex > 0) {
      // delete quaternion of the previous keyframe!
      delete this.shapesKeyframes[shape_id][keyframeIndex - 1].vertices[j].quaternion;
    }
  }

};

/**
 * Edit a keyframe shape
 * @param shape_id
 * @param keyframe
 * @param vertices
 */
EditorRenderer.prototype.editShapeKeyframe = function (shape_id, keyframe, vertices) {

  var keyframeIndex = this.getShapeKeyframeIndex_(shape_id, keyframe);

  if (keyframeIndex === false) {
    console.warn('Cannot update shape, no keyframe or shape found at ' + keyframe + ' for shape with id ' + shape_id);
    return false;
  }

  // for all shape vertices
  for (var j = 0; j < this.shapesKeyframes[shape_id][keyframeIndex].vertices.length; j++) {

    console.log('deleting ' + keyframeIndex + ' ' + JSON.stringify(this.shapesKeyframes[shape_id][keyframeIndex].vertices[j].quaternion));

    if (keyframeIndex > 0) {
      // delete quaternion of the previous keyframe!
      delete this.shapesKeyframes[shape_id][keyframeIndex - 1].vertices[j].quaternion;
    }
    // delete quaternion at given keyframe
    delete this.shapesKeyframes[shape_id][keyframeIndex].vertices[j].quaternion;

    // update vertices at given keyframe
    this.shapesKeyframes[shape_id][keyframeIndex].vertices = vertices;
  }

};

/**
 * Remove a keyframe
 * @param shape_id
 * @param keyframe
 */
EditorRenderer.prototype.removeShapeKeyframe = function (shape_id, keyframe) {

  var keyframeIndex = this.getShapeKeyframeIndex_(shape_id, keyframe);

  if (keyframeIndex === false) {
    console.warn('Cannot update shape, no keyframe or shape found at ' + keyframe + ' for shape with id ' + shape_id);
    return false;
  }

  // remove previous and next frame quaternion for all vertices
  for (var j = 0; j < this.shapesKeyframes[shape_id][keyframeIndex].vertices.length; j++) {
    if (keyframeIndex > 0) {
      delete this.shapesKeyframes[shape_id][keyframeIndex - 1].vertices[j].quaternion;
    }
    if (keyframeIndex <= this.shapesKeyframes[shape_id].length - 1) {
      delete this.shapesKeyframes[shape_id][keyframeIndex + 1].vertices[j].quaternion;
    }
  }

  // delete current keyframe
  this.shapesKeyframes[shape_id].splice(keyframeIndex, 1);


  console.log('Deleted keyframe ' + keyframe + ' for shape ' + shape_id);

};

/**
 *
 * @param shape_id
 * @param keyframe
 * @returns {*}
 * @private
 */
EditorRenderer.prototype.getShapeKeyframeIndex_ = function (shape_id, keyframe) {

  if (typeof this.shapesKeyframes[shape_id] === 'undefined') {
    console.warn('Cannot update shape, no shape found:' + shape_id);
    return false;
  }

  for (var i = 0; i < this.shapesKeyframes[shape_id].length; i++) {
    if (this.shapesKeyframes[shape_id][i].frame === keyframe) {
      return i;
    }
  }

  return false;
};


/**
 * Return the shape selected by a mouse click
 * @returns {*}
 * @private
 */
EditorRenderer.prototype.getIntersectingShapeOrHandles_ = function () {

  // create a Ray with origin at the mouse position
  //   and direction into the scene (camera direction)
  var camera = this.worldRenderer.camera;
  var vector = new THREE.Vector3(this.pointer.x, this.pointer.y, 1);
  vector.unproject(camera);
  var ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());

  // create an array containing all objects in the scene with which the ray intersects
  var targetList = this.shapesRoot.children;
  var intersectingHandles = [];
  var intersectingShapes = [];
  for (var i = 0; i < targetList.length; i++) {
    var shape = targetList[i];
    var intersects = ray.intersectObjects(shape.children);

    // if there is one (or more) intersections
    if (intersects.length) {
      for (var j = 0; j < intersects.length; j++) {
        if (intersects[j].object.name === 'handle') {
          intersectingHandles.push(intersects[j]);
        }
        else if (intersects[j].object.name === 'fill') {
          intersectingShapes.push(intersects[j]);
        }
      }
    }
  }

  var sorted;

  if (intersectingHandles.length) {
    sorted = intersectingHandles.sort(function (a, b) {
      return a.distance - b.distance;
    });
    return sorted[0].object.visible ? sorted[0].object : false;
  }
  else if (intersectingShapes.length) {
    sorted = intersectingShapes.sort(function (a, b) {
      return a.distance - b.distance;
    });
    return sorted[0].object.parent.visible ? sorted[0].object.parent : false;
  }
};

/**
 * Return the pointer (click) position relative to the sphere
 * @returns {*}
 * @private
 */
EditorRenderer.prototype.getClickPositionOnSphere_ = function () {

  // create a Ray with origin at the mouse position
  //   and direction into the scene (camera direction)
  var camera = this.worldRenderer.camera;
  var vector = new THREE.Vector3(this.pointer.x, this.pointer.y, 1);
  vector.unproject(camera);
  var ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());

  // create an array containing all objects in the scene with which the ray intersects
  var targetList = this.scene.getObjectByName('photo').children;
  var intersects = ray.intersectObjects(targetList);

  // if there is one (or more) intersections
  if (intersects.length > 0) {
    return intersects[0].point;
  }

};

/**
 * Translate a shape (on mouse move)
 * @param shape
 * @param fromPoint
 * @param toPoint
 * @private
 */
EditorRenderer.prototype.translateShape_ = function (shape, fromPoint, toPoint) {

  var quaternion = new THREE.Quaternion().setFromUnitVectors(fromPoint.normalize(), toPoint.normalize());

  for (var i = 0; i < shape.children.length; i++) {
    if (shape.children[i].name === 'handle') {
      shape.children[i].position.applyQuaternion(quaternion);
    }
  }

  this.updateShapeFill_(shape, true);
};

/**
 * Update mouse position
 * @param e
 * @private
 */
EditorRenderer.prototype.updateMouse_ = function (e) {
  var size = this.getSize_();
  this.pointer.x = (e.clientX / size.width) * 2 - 1;
  this.pointer.y = -(e.clientY / size.height) * 2 + 1;
};

/**
 * Get viewport size
 * @returns {*}
 * @private
 */
EditorRenderer.prototype.getSize_ = function () {
  return this.worldRenderer.renderer.getSize();
};

/**
 * Check if a point is near to another
 * @param p1
 * @param p2
 * @returns {boolean}
 * @private
 */
EditorRenderer.prototype.isPointNearTo_ = function (p1, p2) {
  var gutter = 0.05;

  //console.log((Math.pow(p1.x-p2.x, 2) + Math.pow(p1.y-p2.y, 2) + Math.pow(p1.z-p2.z, 2)), Math.pow(gutter, 2));

  return (Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2)) < Math.pow(gutter, 2)
};


module.exports = EditorRenderer;