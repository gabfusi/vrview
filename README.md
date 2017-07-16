VR View
=======

This work is part of my computer science thesis, and its a fork of the [VR View web player](https://github.com/googlevr/vrview) by Google.

See also [the client application](https://github.com/gabfusi/prometeo360-editor-client) and [the server](https://github.com/gabfusi/prometeo360-editor-server).

=======

VR View allows you to embed 360 degree VR media into websites on desktop and
mobile. For more information, please read the documentation available at
<http://developers.google.com/cardboard/vrview>.

# Building

This project uses browserify to manage dependencies and build.  Watchify is
especially convenient to preserve the write-and-reload model of development.
This package lives in the npm index.

Relevant commands:

    npm run build - builds the iframe embed.
    npm run build-api - builds the JS API.
    npm run watch - auto-builds the iframe embed whenever any source changes.
    npm run watch-api - auto-builds the JS API code whenever any source changes.
