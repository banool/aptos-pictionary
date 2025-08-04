// See the DEPLOYMENT.md for an explanation of where these came from. Don't rely on the module
// address or name, we publish essentially identical modules under different addresses
// and names.

// Do not change the ABI manually.

export const PICTIONARY_ABI = {
  "address": "0x30fb98688185215c8c129235b5e94a97a9b38f9c3e7510f011b0c9529d040dc1",
  "name": "pictionary",
  "friends": [],
  "exposed_functions": [
    {
      "name": "create_game",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "vector<address>",
        "vector<address>",
        "0x1::string::String",
        "0x1::string::String",
        "u64",
        "u16",
        "u16",
        "u64"
      ],
      "return": []
    },
    {
      "name": "get_canvas",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "u64",
        "u64"
      ],
      "return": [
        "0x1::ordered_map::OrderedMap<u16, 0x30fb98688185215c8c129235b5e94a97a9b38f9c3e7510f011b0c9529d040dc1::pictionary::Color>"
      ]
    },
    {
      "name": "get_current_round",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "u64",
        "0x1::string::String",
        "u64",
        "u64",
        "bool",
        "bool",
        "bool",
        "0x1::option::Option<u64>",
        "0x1::option::Option<u64>"
      ]
    },
    {
      "name": "get_current_word_for_artist",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "address"
      ],
      "return": [
        "0x1::string::String"
      ]
    },
    {
      "name": "get_game",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "address",
        "vector<address>",
        "vector<address>",
        "0x1::string::String",
        "0x1::string::String",
        "u64",
        "u64",
        "u64",
        "u64",
        "u64",
        "u64",
        "bool",
        "bool",
        "0x1::option::Option<u64>",
        "u16",
        "u16",
        "u64"
      ]
    },
    {
      "name": "get_round_history",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "vector<0x30fb98688185215c8c129235b5e94a97a9b38f9c3e7510f011b0c9529d040dc1::pictionary::RoundSummary>"
      ]
    },
    {
      "name": "make_guess",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "0x1::string::String"
      ],
      "return": []
    },
    {
      "name": "next_round",
      "visibility": "private",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address"
      ],
      "return": []
    },
    {
      "name": "start_game",
      "visibility": "private",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address"
      ],
      "return": []
    },
    {
      "name": "submit_canvas_delta",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "u64",
        "vector<u16>",
        "vector<u8>"
      ],
      "return": []
    },
    {
      "name": "update_word_list",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "vector<0x1::string::String>"
      ],
      "return": []
    }
  ],
  "structs": [
    {
      "name": "Canvas",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "pixels",
          "type": "0x1::ordered_map::OrderedMap<u16, 0x30fb98688185215c8c129235b5e94a97a9b38f9c3e7510f011b0c9529d040dc1::pictionary::Color>"
        },
        {
          "name": "width",
          "type": "u16"
        },
        {
          "name": "height",
          "type": "u16"
        },
        {
          "name": "last_updated",
          "type": "u64"
        }
      ]
    },
    {
      "name": "CanvasDelta",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "copy",
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "position",
          "type": "u16"
        },
        {
          "name": "color",
          "type": "0x30fb98688185215c8c129235b5e94a97a9b38f9c3e7510f011b0c9529d040dc1::pictionary::Color"
        }
      ]
    },
    {
      "name": "CanvasUpdated",
      "is_native": false,
      "is_event": true,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "game_address",
          "type": "address"
        },
        {
          "name": "team",
          "type": "u64"
        },
        {
          "name": "round_number",
          "type": "u64"
        },
        {
          "name": "artist",
          "type": "address"
        },
        {
          "name": "deltas",
          "type": "vector<0x30fb98688185215c8c129235b5e94a97a9b38f9c3e7510f011b0c9529d040dc1::pictionary::CanvasDelta>"
        },
        {
          "name": "timestamp",
          "type": "u64"
        }
      ]
    },
    {
      "name": "Color",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "copy",
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": []
    },
    {
      "name": "Game",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "creator",
          "type": "address"
        },
        {
          "name": "team0_players",
          "type": "vector<address>"
        },
        {
          "name": "team1_players",
          "type": "vector<address>"
        },
        {
          "name": "team0_name",
          "type": "0x1::string::String"
        },
        {
          "name": "team1_name",
          "type": "0x1::string::String"
        },
        {
          "name": "current_team0_artist",
          "type": "u64"
        },
        {
          "name": "current_team1_artist",
          "type": "u64"
        },
        {
          "name": "team0_score",
          "type": "u64"
        },
        {
          "name": "team1_score",
          "type": "u64"
        },
        {
          "name": "target_score",
          "type": "u64"
        },
        {
          "name": "current_round",
          "type": "u64"
        },
        {
          "name": "rounds",
          "type": "vector<0x30fb98688185215c8c129235b5e94a97a9b38f9c3e7510f011b0c9529d040dc1::pictionary::Round>"
        },
        {
          "name": "started",
          "type": "bool"
        },
        {
          "name": "finished",
          "type": "bool"
        },
        {
          "name": "winner",
          "type": "0x1::option::Option<u64>"
        },
        {
          "name": "canvas_width",
          "type": "u16"
        },
        {
          "name": "canvas_height",
          "type": "u16"
        },
        {
          "name": "round_duration",
          "type": "u64"
        },
        {
          "name": "extend_ref",
          "type": "0x1::object::ExtendRef"
        }
      ]
    },
    {
      "name": "GameCreated",
      "is_native": false,
      "is_event": true,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "game_address",
          "type": "address"
        },
        {
          "name": "creator",
          "type": "address"
        },
        {
          "name": "team0_players",
          "type": "vector<address>"
        },
        {
          "name": "team1_players",
          "type": "vector<address>"
        },
        {
          "name": "target_score",
          "type": "u64"
        }
      ]
    },
    {
      "name": "GameFinished",
      "is_native": false,
      "is_event": true,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "game_address",
          "type": "address"
        },
        {
          "name": "winner",
          "type": "u64"
        },
        {
          "name": "final_team0_score",
          "type": "u64"
        },
        {
          "name": "final_team1_score",
          "type": "u64"
        }
      ]
    },
    {
      "name": "GuessSubmitted",
      "is_native": false,
      "is_event": true,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "game_address",
          "type": "address"
        },
        {
          "name": "guesser",
          "type": "address"
        },
        {
          "name": "team",
          "type": "u64"
        },
        {
          "name": "guess",
          "type": "0x1::string::String"
        },
        {
          "name": "round_number",
          "type": "u64"
        },
        {
          "name": "timestamp",
          "type": "u64"
        }
      ]
    },
    {
      "name": "Round",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "round_number",
          "type": "u64"
        },
        {
          "name": "word",
          "type": "0x1::string::String"
        },
        {
          "name": "start_time",
          "type": "u64"
        },
        {
          "name": "duration_seconds",
          "type": "u64"
        },
        {
          "name": "team0_canvas",
          "type": "0x30fb98688185215c8c129235b5e94a97a9b38f9c3e7510f011b0c9529d040dc1::pictionary::Canvas"
        },
        {
          "name": "team1_canvas",
          "type": "0x30fb98688185215c8c129235b5e94a97a9b38f9c3e7510f011b0c9529d040dc1::pictionary::Canvas"
        },
        {
          "name": "team0_guessed",
          "type": "bool"
        },
        {
          "name": "team1_guessed",
          "type": "bool"
        },
        {
          "name": "team0_guess_time",
          "type": "0x1::option::Option<u64>"
        },
        {
          "name": "team1_guess_time",
          "type": "0x1::option::Option<u64>"
        }
      ]
    },
    {
      "name": "RoundFinished",
      "is_native": false,
      "is_event": true,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "game_address",
          "type": "address"
        },
        {
          "name": "round_number",
          "type": "u64"
        },
        {
          "name": "word",
          "type": "0x1::string::String"
        },
        {
          "name": "team0_points_earned",
          "type": "u64"
        },
        {
          "name": "team1_points_earned",
          "type": "u64"
        },
        {
          "name": "team0_total_score",
          "type": "u64"
        },
        {
          "name": "team1_total_score",
          "type": "u64"
        }
      ]
    },
    {
      "name": "RoundStarted",
      "is_native": false,
      "is_event": true,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "game_address",
          "type": "address"
        },
        {
          "name": "round_number",
          "type": "u64"
        },
        {
          "name": "word",
          "type": "0x1::string::String"
        },
        {
          "name": "team0_artist",
          "type": "address"
        },
        {
          "name": "team1_artist",
          "type": "address"
        },
        {
          "name": "start_time",
          "type": "u64"
        }
      ]
    },
    {
      "name": "RoundSummary",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "copy",
        "drop"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "round_number",
          "type": "u64"
        },
        {
          "name": "word",
          "type": "0x1::string::String"
        },
        {
          "name": "start_time",
          "type": "u64"
        },
        {
          "name": "duration_seconds",
          "type": "u64"
        },
        {
          "name": "team0_guessed",
          "type": "bool"
        },
        {
          "name": "team1_guessed",
          "type": "bool"
        },
        {
          "name": "team0_guess_time",
          "type": "0x1::option::Option<u64>"
        },
        {
          "name": "team1_guess_time",
          "type": "0x1::option::Option<u64>"
        }
      ]
    },
    {
      "name": "WordList",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "words",
          "type": "vector<0x1::string::String>"
        },
        {
          "name": "extend_ref",
          "type": "0x1::object::ExtendRef"
        }
      ]
    }
  ]
} as const;
