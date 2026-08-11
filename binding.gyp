{
  "targets": [
    {
      "target_name": "security_engine",
      "sources": [ "src/native/engine.cpp" ],
      "include_dirs": [
        "<!(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "conditions": [
        ["OS=='win'", {
          "defines": [ "_HAS_EXCEPTIONS=0" ]
        }]
      ],
      "configurations": {
        "Release": {
          "cflags": [ "-O3", "-DNDEBUG" ]
        },
        "Debug": {
          "cflags": [ "-g", "-O0" ]
        }
      }
    }
  ]
}
