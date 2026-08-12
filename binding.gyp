{
  "targets": [
    {
      "target_name": "security_engine",
      "sources": [ "src/native/engine.cpp" ],
      "include_dirs": [
        "<!(node -p \"require('node-addon-api').include_dir\")",
        "/usr/include",
        "/usr/include/openssl"
      ],
      "libraries": [ "-lssl", "-lcrypto" ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "conditions": [
        ["OS=='win'", {
          "defines": [ "_HAS_EXCEPTIONS=0" ]
        }],
        ["OS=='linux'", {
          "cflags": [ "-pthread" ],
          "cflags_cc": [ "-pthread" ]
        }]
      ],
      "configurations": {
        "Release": {
          "cflags": [ "-O3", "-DNDEBUG", "-fomit-frame-pointer" ],
          "cflags_cc": [ "-O3", "-DNDEBUG", "-fomit-frame-pointer" ],
          "conditions": [
            ["target_arch=='x64'", {
              "cflags": [ "-msse4.2", "-mavx2", "-mfma" ],
              "cflags_cc": [ "-msse4.2", "-mavx2", "-mfma" ]
            }]
          ]
        },
        "Debug": {
          "cflags": [ "-g", "-O0", "-fno-omit-frame-pointer", "-fno-optimize-sibling-calls" ],
          "cflags_cc": [ "-g", "-O0", "-fno-omit-frame-pointer", "-fno-optimize-sibling-calls" ]
        }
      }
    }
  ]
}
