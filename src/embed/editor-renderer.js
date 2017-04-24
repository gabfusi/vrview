"use strict";

var EventEmitter = require('eventemitter3');
var TWEEN = require('tween.js');
var Util = require('../util');

// Constants for the active/inactive animation.
var INACTIVE_COLOR = new THREE.Color(1, 1, 1);
var ACTIVE_COLOR = new THREE.Color(0.8, 0, 0);
var ACTIVE_DURATION = 100;

function EditorRenderer(worldRenderer) {

    this.worldRenderer = worldRenderer;
    this.scene = worldRenderer.scene;

    // if player is in editor mode
    this.editorMode = true;
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
    // currently selected shape
    this.selectedShape = null;
    // currently selected shape handle
    this.selectedShapeHandle = null;
    // flag for track dragging
    this.isDragging = false;

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

    // check if click intersects with some shapes...
    intersectingShape = this.getIntersectingShapeOrHandles_();
    isHandle = intersectingShape && intersectingShape.name === 'handle';

    // shape handle selected
    if(isHandle) {
        handle = intersectingShape;
        intersectingShape = handle.parent;
        this.selectedShapeHandle = handle;
        console.log('handle!', handle)
    } else {
        this.selectedShapeHandle = null;
    }

    // check if current shape has to be unselected
    if(this.selectedShape && !intersectingShape) {
        // if a shape was selected but now it's not, deselect it
        if(this.editorMode) {
            this.blurShape_(this.selectedShape.id);
        }

        this.deselectShape();
    }

    // check if a shape has to be selected
    if(!this.selectedShape) {
        // if shape not already selected, select it
        if(intersectingShape) {
            this.selectShape(intersectingShape);

            if(this.editorMode) {
                this.focusShape_(intersectingShape.id);
            }
        }
    }

    if(this.editorMode) {
        this.isDragging = true;

        if(this.selectedShape) {

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
    if(this.isDrawing()) {
        // prevent camera rotation
        e.stopPropagation();

        if(this.isDragging) {
            this.updateMouse_(e);
            var pointOnSphere = this.getClickPositionOnSphere_();

            if(this.selectedShapeHandle) {
                // translate shape handle
                this.selectedShapeHandle.position.copy(pointOnSphere);
                this.updateShapeFill_(this.selectedShapeHandle.parent, true);
            }
            else if(this.selectedShape) {
                // translate entire shape
                if(this.prevPointerPosition) {
                    // TODO!
                    //var delta = this.calculateDelta_(this.prevPointerPosition, pointOnSphere);
                    //this.translateShape_(this.selectedShape, delta);
                    //console.log(delta);
                }

                this.prevPointerPosition = pointOnSphere;
            }
        }

    }
};

/**
 * On Mouse up
 * @param e
 * @private
 */
EditorRenderer.prototype.onMouseUp_ = function (e) {
    if(this.isDrawing()) {
        e.stopPropagation();
    }
    this.isDragging = false;

    if(this.selectedShapeHandle) {
        this.emit('transformed', this.selectedShapeHandle.parent)
    }
};

/**
 * Select a shape
 * @param shape
 */
EditorRenderer.prototype.selectShape = function(shape) {
    this.selectedShape = shape;
    this.emit('shapeselected', this.selectedShape);
};
/**
 * Deselect current shape
 */
EditorRenderer.prototype.deselectShape = function() {
    this.selectedShape = null;
    this.emit('shapeunselected');
};

/**
 * Focus a shape
 * @param shape_id
 * @private
 */
EditorRenderer.prototype.focusShape_ = function(shape_id) {
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
EditorRenderer.prototype.blurShape_ = function(shape_id) {
    var shape = this.shapes[shape_id];
    var outer = shape.getObjectByName('fill');

    this.tween = new TWEEN.Tween(outer.material.color).to(INACTIVE_COLOR, ACTIVE_DURATION)
        .start();
};

/**
 * Add a point to the current drawing shape
 * Called on mousedown
 * @param point
 * @returns {boolean}
 * @private
 */
EditorRenderer.prototype.addPointToShape_ = function (point) {

    if(!point) {
        return false;
    }

    var closeShape = false;

    // check if current point can close the geometry object
    if(this.currentShapeGeometry && this.drawingShape && this.currentShapeGeometry.vertices.length > 2) {
        closeShape = this.isPointNearTo_(point, this.currentShapeGeometry.vertices[0]);
    }

    // create a new geometry object
    if(!this.drawingShape) {
        this.drawingShape = true;
        this.currentShapeGeometry = new THREE.Geometry();
    }

    // add currrent point to geometry object
    if(!this.drawingShape || !closeShape) {

        this.currentShapeGeometry.vertices.push(
            new THREE.Vector3(point.x, point.y, point.z)
        );

        // draw temp segment
        this.renderDrawnSegment_();
    }

    // close the geometry object and render the shape
    if(closeShape) {

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

EditorRenderer.prototype.createShape = function (vertices, id) {

    var shape = this.createShape_(vertices);
    if(id) shape.name = id;

    // add shape to scene
    this.shapes[shape.id] = shape;
    this.shapesRoot.add(shape);

    return shape;
};

/**
 * Creates a shape form a set of vertices (points)
 * @param vertices
 * @param id (optional)
 * @returns {SEA3D.Object3D|THREE.SEA3D.Object3D|*|Object3D|W|x}
 */
EditorRenderer.prototype.createShape_ = function (vertices) {

    //var shapeGeometry = new THREE.Geometry();
    //shapeGeometry.vertices = points;

    // draw borders of the shape
    //var borders = new THREE.Line(shapeGeometry, new THREE.LineBasicMaterial({color: "red"}));
    //borders.name = 'borders';

    // draw fill
    var fill = this.createShapeFill_(vertices);

    // handles wrapper object
    //var handles = new THREE.Object3D();
    //handles.name = 'handles';

    // wrapper object
    var shape = new THREE.Object3D();
    shape.name = 'shape';
    shape.add(fill);

    // draw handles
    for(var i = 0; i < vertices.length; i++) {
        var handle = this.createHandle_(vertices[i]);
        shape.add(handle);
    }

    //shape.add(handles);
    //shape.add(borders);

    console.log('Created shape with ' + vertices.length + ' vertices!', shape);

    return shape;
};

EditorRenderer.prototype.editShape = function (id, params) {
    console.warn('editShape(id, params) not implemented yet!', id, params);
};
EditorRenderer.prototype.removeShape = function (id, params) {
    console.warn('removeShape(id) not implemented yet!', id);
};

/**
 * Updates a shape Mesh after an handle drag
 * @private
 */
EditorRenderer.prototype.updateShapeFill_ = function(shape, isShapeSelected) {
    var vertices = [];

    for(var i = 0; i < shape.children.length; i++) {
        var obj = shape.children[i];
        if(obj.name === 'handle') {
            vertices.push(obj.position);
        }
    }

    var newFill = this.createShapeFill_(vertices, isShapeSelected);

    shape.remove(shape.getObjectByName('fill'));
    shape.add(newFill);
};

/**
 * Creates a Mesh between given points
 * @param vertices
 * @param isShapeSelected
 * @returns {THREE.SEA3D.Mesh|Raycaster.params.Mesh|{}|SEA3D.Mesh|Jb.params.Mesh|pe.params.Mesh|*}
 * @private
 */
EditorRenderer.prototype.createShapeFill_ = function(vertices, isShapeSelected) {

    var fillGeometry = new THREE.Geometry();
    var fillMaterial = new THREE.MeshBasicMaterial({ color: isShapeSelected ? ACTIVE_COLOR : 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.6});
    var faces = [];
    var triangles = THREE.ShapeUtils.triangulateShape (vertices, []);
    for(var i = 0; i < triangles.length; i++){
        faces.push(new THREE.Face3( triangles[i][0], triangles[i][1], triangles[i][2] ));
    }
    fillGeometry.faces = faces;
    fillGeometry.vertices = vertices;
    var fill = new THREE.Mesh(fillGeometry, fillMaterial);
    fill.name = 'fill';

    return fill;
};

/**
 * Render the current drawn segment with temp handles
 * @private
 */
EditorRenderer.prototype.renderDrawnSegment_ = function () {

    var vertices = this.currentShapeGeometry.vertices.slice();
    var currentVertex = vertices[vertices.length-1];

    // segment
    if(vertices.length > 1) {
        var lastVertex = vertices[vertices.length-2];
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
    if(!this.drawingShape) { return; }

    this.drawingShape = false;
    this.currentShapeGeometry = null;
    for( var i = this.shapesTempRoot.children.length - 1; i >= 0; i--) {
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
    var handleMaterial = new THREE.MeshBasicMaterial({ color: "blue" });
    var handleGeometry = new THREE.SphereGeometry(0.02, 32, 32);
    var handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(point.x, point.y, point.z);
    handle.name = 'handle';
    return handle;
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
    for (var i = 0; i < targetList.length; i++) {
        var shape = targetList[i];
        var intersects = ray.intersectObjects(shape.children);

        console.log(intersects)

        // if there is one (or more) intersections
        if (intersects.length) {
            for(var j = 0; j < intersects.length; j++) {
                if(intersects[j].object.name === 'handle') {
                    return intersects[j].object;
                }
                else if(intersects[j].object.name === 'fill') {
                    return intersects[j].object.parent;
                }
            }
        }
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



EditorRenderer.prototype.calculateDelta_ = function (p1, p2) {
    var x, y, z;

    x = p2.x - p1.x;
    y = p2.y - p1.y;
    z = p2.z - p1.z;

    return new THREE.Vector3(x, y, z);
};

EditorRenderer.prototype.translateShape_ = function (shape, delta) {
    var shapeNeedsUpdate = false;

    if(delta.x === delta.y === delta.z === 0) {
        return;
    }

    shape.translateX(delta.x);
    shape.translateY(delta.y);
    shape.translateZ(delta.z);

    return;

    for(var i = 0; i < shape.children.length; i++) {
        if(shape.children[i].name === 'handle') {
            /*
             shape.children[i].translateX(delta.x);
             shape.children[i].translateY(delta.y);
             shape.children[i].translateZ(delta.z);
             */

            var point = new THREE.Vector3(
                shape.children[i].position.x + delta.x,
                shape.children[i].position.y + delta.y,
                shape.children[i].position.z + delta.z);

            var pointOnSphere = this.getPointPositionOnSphere_(point);

            if(pointOnSphere) {
                shape.children[i].position.x = pointOnSphere.x;
                shape.children[i].position.y = pointOnSphere.y;
                shape.children[i].position.z = pointOnSphere.z;
                shapeNeedsUpdate = true;
            }

        }
    }

    if(shapeNeedsUpdate) {
        this.updateShapeFill_(shape, true);
        shape.lookAt(new THREE.Vector3(0,0,0))
    }
};

EditorRenderer.prototype.getPointPositionOnSphere_ = function (point) {

    // create a Ray with origin at the mouse position
    //   and direction into the scene (camera direction)
    var camera = this.worldRenderer.camera;
    var vector = new THREE.Vector3(point.x, point.y, point.z);
    vector.unproject(camera);
    var ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());

    // create an array containing all objects in the scene with which the ray intersects
    var targetList = this.scene.getObjectByName('photo').children;
    var intersects = ray.intersectObjects(targetList);

    // if there is one (or more) intersections
    if (intersects.length > 0) {
        //var h = this.createHandle_(intersects[0].point);
        //this.selectedShape.add(h);
        return intersects[0].point;
    }

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

    return (Math.pow(p1.x-p2.x, 2) + Math.pow(p1.y-p2.y, 2) + Math.pow(p1.z-p2.z, 2)) < Math.pow(gutter, 2)
};

module.exports = EditorRenderer;