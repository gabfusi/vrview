"use strict";

(function (undefined) {

  var page, movie;

  // on document ready
  document.addEventListener("DOMContentLoaded", onLoad);

  /**
   * On DOM ready
   */
  function onLoad() {
    movie = window._sharedData.movie;
    initPlayer(movie);
  }

  /**
   * initialize player
   * @param movie
   */
  function initPlayer(movie) {

    if(typeof window.PlayerVR === 'undefined') {
      console.error("Cannot find PlayerVR!");
      return;
    }

    var player = new PlayerVR(movie, {
      videoPath: '/examples/shapes/videos/'
    });
    window.pp = player;

  }

})();
