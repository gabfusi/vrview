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
var vrView;

// All the scenes for the experience
var scenes = {
  dolphins: {
    image: 'dolphins.jpg',
    preview: 'dolphins-preview.jpg',
    hotspots: {
      whaleRight: {
        pitch: 0,
        yaw: 110,
        radius: 0.05,
        distance: 1
      },
      whaleLeft: {
        pitch: 0,
        yaw: 150,
        radius: 0.05,
        distance: 1
      },
      walrus: {
        pitch: 0,
        yaw: 170,
        radius: 0.05,
        distance: 1
      }
    }
  },
  whaleLeft: {
    image: 'whale-left.jpg',
    preview: 'whale-left-preview.jpg',
    hotspots: {
      whaleRight: {
        pitch: 0,
        yaw: 125,
        radius: 0.05,
        distance: 1
      },
      dolphins: {
        pitch: 0,
        yaw: 110,
        radius: 0.05,
        distance: 1
      },
      walrus: {
        pitch: 0,
        yaw: 30,
        radius: 0.05,
        distance: 1
      }
    }
  },
  whaleRight: {
    image: 'whale-right.jpg',
    preview: 'whale-right-preview.jpg',
    hotspots: {
      dolphins: {
        pitch: 0,
        yaw: 305,
        radius: 0.05,
        distance: 1
      },
      whaleLeft: {
        pitch: 0,
        yaw: 180,
        radius: 0.05,
        distance: 1
      },
      walrus: {
        pitch: 0,
        yaw: 210,
        radius: 0.05,
        distance: 1
      }
    }
  },
  walrus: {
    image: 'walrus.jpg',
    preview: 'walrus-preview.jpg',
      isDebug:true,
    hotspots: {
      whaleLeft: {
        pitch: 0,
        yaw: 0,
        radius: 0.5,
        distance: 1,
          custom: [{
              x: -0.13, y: -0.08
          },{
              x: -0.13, y: 0.07
          },{
              x: 0.04, y: 0.06
          },{
              x: 0.04, y: -0.07
          }]
      },
      whaleRight: {
        pitch: 0,
        yaw: 340,
        radius: 0.05,
        distance: 1
      },
      dolphins: {
        pitch: 0,
        yaw: 320,
        radius: 0.05,
        distance: 1
      }
    }
  }
};

function onLoad() {
  vrView = new VRView.Player('#vrview', {
    image: 'blank.png',
    preview: 'blank.png',
    is_stereo: true,
    is_autopan_off: true
  });

  vrView.on('ready', onVRViewReady);
  vrView.on('modechange', onModeChange);
  vrView.on('click', onHotspotClick);
  vrView.on('error', onVRViewError);
    vrView.on('getposition', onGetPosition);
    vrView.on('enddraw', onShapeDrawn);
    vrView.on('shapetransformed', onShapeTransformed);
    vrView.on('shapeselected', onShapeSelected);
    vrView.on('shapeunselected', onShapeUnselected);

    document.getElementById('activateTool').addEventListener('click', function() {
        vrView.activateShapeTool();
    });

    document.getElementById('deactivateTool').addEventListener('click', function() {
        vrView.deactivateShapeTool();
    });

    document.getElementById('addShape').addEventListener('click', function() {

        vrView.addShape(37, {
            vertices: [{"x":-0.6494294324965203,"y":0.23421261198200685,"z":0.7200792805745425},{"x":-0.7541588674358198,"y":0.23436800185747322,"z":0.6105142454262472},{"x":-0.6922991620677248,"y":0.4515368344437288,"z":0.5604369567065645},{"x":-0.5986122602617642,"y":0.4478480375011406,"z":0.6614371749391494}]
        });
    });

}

function onVRViewReady(e) {
  console.log('onVRViewReady');
  loadScene('walrus');
}

function onModeChange(e) {
  console.log('onModeChange', e.mode);
}

function onHotspotClick(e) {
  if (e.id) {
      console.log('onHotspotClick', e.id, e);
    //loadScene(e.id);
  }
}

function onShapeDrawn(e) {
    console.log('Shape drawn', e);
    console.log(JSON.stringify(e.vertices));
}
function onShapeTransformed(e) {
    console.log('Shape transformed', e);
}
function onShapeSelected(e) {
    console.log('Shape selected', e);
}
function onShapeUnselected(e) {
    console.log('Shape unselected', e);
}

function loadScene(id) {
  console.log('loadScene', id);

  // Set the image
  vrView.setContent({
    image: scenes[id].image,
    preview: scenes[id].preview,
    is_stereo: true,
    is_autopan_off: true
  });

  // Add all the hotspots for the scene
  var newScene = scenes[id];
  var sceneHotspots = Object.keys(newScene.hotspots);
  for (var i = 0; i < sceneHotspots.length; i++) {
    var hotspotKey = sceneHotspots[i];
    var hotspot = newScene.hotspots[hotspotKey];

    vrView.addHotspot(hotspotKey, {
      pitch: hotspot.pitch,
      yaw: hotspot.yaw,
      radius: hotspot.radius,
      distance: hotspot.distance,
      custom: hotspot.custom || null
    });
  }

    // get Center position
    vrView.getPosition();
}

function onVRViewError(e) {
  console.log('Error! %s', e.message);
}

function onGetPosition(e) {
   console.log(e)
}

window.addEventListener('load', onLoad);
