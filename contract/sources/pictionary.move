module pictionary::pictionary {
    use std::option::{Self, Option};
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use aptos_framework::event;
    use aptos_framework::object::{Self, ExtendRef};
    use aptos_framework::randomness;
    use aptos_framework::simple_map::{Self, SimpleMap};
    use aptos_framework::timestamp;

    // Error codes
    /// Game not found
    const EGAME_NOT_FOUND: u64 = 1;
    /// Not authorized - only game creator can perform this action
    const ENOT_AUTHORIZED: u64 = 2;
    /// Game already started
    const EGAME_ALREADY_STARTED: u64 = 3;
    /// Game not started yet
    const EGAME_NOT_STARTED: u64 = 4;
    /// Invalid team - must be 0 or 1
    const EINVALID_TEAM: u64 = 5;
    /// Team needs at least 2 players
    const ETEAM_TOO_SMALL: u64 = 6;
    /// Player already in a team
    const EPLAYER_ALREADY_IN_TEAM: u64 = 7;
    /// Not player's turn to draw
    const ENOT_ARTIST_TURN: u64 = 8;
    /// Round not active - cannot draw or guess
    const EROUND_NOT_ACTIVE: u64 = 9;
    /// Invalid canvas position
    const EINVALID_CANVAS_POSITION: u64 = 10;
    /// Game already finished
    const EGAME_FINISHED: u64 = 11;
    /// Round time expired
    const EROUND_TIME_EXPIRED: u64 = 12;

    // Color palette for drawing
    enum Color has store, copy, drop {
        Black,
        White,
        Red,
        Green,
        Blue,
        Yellow,
        Orange,
        Purple,
        Pink,
        Brown,
        Gray,
        LightBlue,
        LightGreen,
        LightRed,
    }

    // Canvas pixel delta for efficient updates
    struct CanvasDelta has store, copy, drop {
        position: u16,
        color: Color,
    }

    // Canvas representing the drawing area
    struct Canvas has store {
        pixels: SimpleMap<u16, Color>,
        width: u16,
        height: u16,
        last_updated: u64, // timestamp
    }

    // Round information
    struct Round has store {
        round_number: u64,
        word: String,
        start_time: u64,
        duration_seconds: u64,
        team0_canvas: Canvas,
        team1_canvas: Canvas,
        team0_guessed: bool,
        team1_guessed: bool,
        team0_guess_time: Option<u64>,
        team1_guess_time: Option<u64>,
        finished: bool,
    }

    // Main game object
    struct Game has key {
        creator: address,
        team0_players: vector<address>,
        team1_players: vector<address>,
        current_team0_artist: u64, // index in team0_players
        current_team1_artist: u64, // index in team1_players
        team0_score: u64,
        team1_score: u64,
        target_score: u64,
        current_round: u64,
        rounds: vector<Round>,
        started: bool,
        finished: bool,
        winner: Option<u64>, // 0 or 1 for team, none if not finished
        canvas_width: u16,
        canvas_height: u16,
        round_duration: u64,
        extend_ref: ExtendRef,
    }

    // Word list for the game
    struct WordList has key {
        words: vector<String>,
        extend_ref: ExtendRef,
    }

    // Events
    #[event]
    struct GameCreated has drop, store {
        game_address: address,
        creator: address,
        team0_players: vector<address>,
        team1_players: vector<address>,
        target_score: u64,
    }

    #[event]
    struct RoundStarted has drop, store {
        game_address: address,
        round_number: u64,
        word: String,
        team0_artist: address,
        team1_artist: address,
        start_time: u64,
    }

    #[event]
    struct CanvasUpdated has drop, store {
        game_address: address,
        team: u64,
        round_number: u64,
        artist: address,
        deltas: vector<CanvasDelta>,
        timestamp: u64,
    }

    #[event]
    struct GuessSubmitted has drop, store {
        game_address: address,
        guesser: address,
        team: u64,
        guess: String,
        round_number: u64,
        timestamp: u64,
    }

    #[event]
    struct RoundFinished has drop, store {
        game_address: address,
        round_number: u64,
        word: String,
        team0_points_earned: u64,
        team1_points_earned: u64,
        team0_total_score: u64,
        team1_total_score: u64,
    }

    #[event]
    struct GameFinished has drop, store {
        game_address: address,
        winner: u64,
        final_team0_score: u64,
        final_team1_score: u64,
    }

    // Initialize the module with a default word list
    fun init_module(deployer: &signer) {
        let constructor_ref = object::create_named_object(deployer, b"WordList");
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let word_list_signer = object::generate_signer(&constructor_ref);

        let default_words = vector[
            string::utf8(b"cat"),
            string::utf8(b"dog"),
            string::utf8(b"house"),
            string::utf8(b"tree"),
            string::utf8(b"car"),
            string::utf8(b"bird"),
            string::utf8(b"fish"),
            string::utf8(b"flower"),
            string::utf8(b"sun"),
            string::utf8(b"moon"),
            string::utf8(b"star"),
            string::utf8(b"book"),
            string::utf8(b"chair"),
            string::utf8(b"table"),
            string::utf8(b"computer"),
            string::utf8(b"phone"),
            string::utf8(b"apple"),
            string::utf8(b"banana"),
            string::utf8(b"pizza"),
            string::utf8(b"cake"),
        ];

        move_to(&word_list_signer, WordList {
            words: default_words,
            extend_ref,
        });
    }

    // Create a new game
    public entry fun create_game(
        creator: &signer,
        team0_players: vector<address>,
        team1_players: vector<address>,
        target_score: u64,
        canvas_width: u16,
        canvas_height: u16,
        round_duration: u64,
    ) {
        // Validate teams have at least 2 players each
        assert!(vector::length(&team0_players) >= 2, ETEAM_TOO_SMALL);
        assert!(vector::length(&team1_players) >= 2, ETEAM_TOO_SMALL);

        // Create a new object for the game
        let constructor_ref = object::create_object(signer::address_of(creator));
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let game_signer = object::generate_signer(&constructor_ref);
        let game_address = signer::address_of(&game_signer);

        let game = Game {
            creator: signer::address_of(creator),
            team0_players,
            team1_players,
            current_team0_artist: 0,
            current_team1_artist: 0,
            team0_score: 0,
            team1_score: 0,
            target_score,
            current_round: 0,
            rounds: vector::empty(),
            started: false,
            finished: false,
            winner: option::none(),
            canvas_width: if (canvas_width == 0) 500 else canvas_width,
            canvas_height: if (canvas_height == 0) 500 else canvas_height,
            round_duration: if (round_duration == 0) 30 else round_duration,
            extend_ref,
        };

        // Emit game created event
        event::emit(GameCreated {
            game_address,
            creator: signer::address_of(creator),
            team0_players: game.team0_players,
            team1_players: game.team1_players,
            target_score,
        });

        move_to(&game_signer, game);
    }

    // Start the game (only creator can do this)
    #[lint::allow_unsafe_randomness]
    public entry fun start_game(creator: &signer, game_address: address) acquires Game, WordList {
        let game = borrow_global_mut<Game>(game_address);
        assert!(game.creator == signer::address_of(creator), ENOT_AUTHORIZED);
        assert!(!game.started, EGAME_ALREADY_STARTED);
        assert!(!game.finished, EGAME_FINISHED);

        game.started = true;
        start_new_round(game_address);
    }

    // Internal function to start a new round
    fun start_new_round(game_address: address) acquires Game, WordList {
        let game = borrow_global_mut<Game>(game_address);
        assert!(game.started, EGAME_NOT_STARTED);
        assert!(!game.finished, EGAME_FINISHED);

        // Select a random word
        let word_list = borrow_global<WordList>(@pictionary);
        let word_index = randomness::u64_range(0, vector::length(&word_list.words));
        let word = *vector::borrow(&word_list.words, word_index);

        // Create new canvases for this round
        let team0_canvas = Canvas {
            pixels: simple_map::create(),
            width: game.canvas_width,
            height: game.canvas_height,
            last_updated: timestamp::now_seconds(),
        };

        let team1_canvas = Canvas {
            pixels: simple_map::create(),
            width: game.canvas_width,
            height: game.canvas_height,
            last_updated: timestamp::now_seconds(),
        };

        // Create new round
        let round = Round {
            round_number: game.current_round,
            word,
            start_time: timestamp::now_seconds(),
            duration_seconds: game.round_duration,
            team0_canvas,
            team1_canvas,
            team0_guessed: false,
            team1_guessed: false,
            team0_guess_time: option::none(),
            team1_guess_time: option::none(),
            finished: false,
        };

        vector::push_back(&mut game.rounds, round);

        // Get current artists
        let team0_artist = *vector::borrow(&game.team0_players, game.current_team0_artist);
        let team1_artist = *vector::borrow(&game.team1_players, game.current_team1_artist);

        // Emit round started event
        event::emit(RoundStarted {
            game_address,
            round_number: game.current_round,
            word,
            team0_artist,
            team1_artist,
            start_time: timestamp::now_seconds(),
        });

        game.current_round = game.current_round + 1;
    }

    // Submit canvas delta (drawing updates)
    public entry fun submit_canvas_delta(
        artist: &signer,
        game_address: address,
        team: u64,
        positions: vector<u16>,
        colors: vector<u8>, // Using u8 to represent Color enum variants
    ) acquires Game {
        // Convert u8 colors to Color enum
        let deltas = vector::empty<CanvasDelta>();
        let i = 0;
        while (i < vector::length(&positions)) {
            let position = *vector::borrow(&positions, i);
            let color_u8 = *vector::borrow(&colors, i);
            let color = u8_to_color(color_u8);
            vector::push_back(&mut deltas, CanvasDelta { position, color });
            i = i + 1;
        };
        
        let game = borrow_global_mut<Game>(game_address);
        assert!(game.started, EGAME_NOT_STARTED);
        assert!(!game.finished, EGAME_FINISHED);
        assert!(team == 0 || team == 1, EINVALID_TEAM);

        let artist_address = signer::address_of(artist);
        let current_round_index = game.current_round - 1;
        let round = vector::borrow_mut(&mut game.rounds, current_round_index);
        assert!(!round.finished, EROUND_NOT_ACTIVE);

        // Check if round has expired
        let current_time = timestamp::now_seconds();
        if (current_time > round.start_time + round.duration_seconds) {
            round.finished = true;
            finish_round(game_address);
            return
        };

        // Verify it's the artist's turn
        if (team == 0) {
            let expected_artist = *vector::borrow(&game.team0_players, game.current_team0_artist);
            assert!(artist_address == expected_artist, ENOT_ARTIST_TURN);
        } else {
            let expected_artist = *vector::borrow(&game.team1_players, game.current_team1_artist);
            assert!(artist_address == expected_artist, ENOT_ARTIST_TURN);
        };

        // Apply deltas to canvas
        let canvas = if (team == 0) {
            &mut round.team0_canvas
        } else {
            &mut round.team1_canvas
        };

        let i = 0;
        while (i < vector::length(&deltas)) {
            let delta = vector::borrow(&deltas, i);
            
            // Validate position is within canvas bounds
            let max_position = (canvas.width as u32) * (canvas.height as u32);
            assert!((delta.position as u32) < max_position, EINVALID_CANVAS_POSITION);
            
            simple_map::upsert(&mut canvas.pixels, delta.position, delta.color);
            i = i + 1;
        };

        canvas.last_updated = current_time;

        // Emit canvas updated event
        event::emit(CanvasUpdated {
            game_address,
            team,
            round_number: current_round_index,
            artist: artist_address,
            deltas,
            timestamp: current_time,
        });
    }

    // Make a guess
    public entry fun make_guess(
        guesser: &signer,
        game_address: address,
        guess: String,
    ) acquires Game {
        let game = borrow_global_mut<Game>(game_address);
        assert!(game.started, EGAME_NOT_STARTED);
        assert!(!game.finished, EGAME_FINISHED);

        let guesser_address = signer::address_of(guesser);
        let current_round_index = game.current_round - 1;
        
        // Determine which team the guesser is on first (before borrowing round mutably)
        let team = get_player_team(game, guesser_address);
        
        let round = vector::borrow_mut(&mut game.rounds, current_round_index);
        assert!(!round.finished, EROUND_NOT_ACTIVE);

        // Check if round has expired
        let current_time = timestamp::now_seconds();
        if (current_time > round.start_time + round.duration_seconds) {
            round.finished = true;
            finish_round(game_address);
            return
        };
        
        // Emit guess event
        event::emit(GuessSubmitted {
            game_address,
            guesser: guesser_address,
            team,
            guess,
            round_number: current_round_index,
            timestamp: current_time,
        });

        // Check if guess is correct (simple string comparison for now)
        if (guess == round.word) {
            if (team == 0 && !round.team0_guessed) {
                round.team0_guessed = true;
                round.team0_guess_time = option::some(current_time);
            } else if (team == 1 && !round.team1_guessed) {
                round.team1_guessed = true;
                round.team1_guess_time = option::some(current_time);
            };

            // Check if round should finish
            if (round.team0_guessed && round.team1_guessed) {
                finish_round(game_address);
            };
        };
    }

    // Get which team a player is on
    fun get_player_team(game: &Game, player: address): u64 {
        if (vector::contains(&game.team0_players, &player)) {
            0
        } else {
            1
        }
    }

    // Convert u8 to Color enum
    fun u8_to_color(value: u8): Color {
        if (value == 0) Color::Black
        else if (value == 1) Color::White
        else if (value == 2) Color::Red
        else if (value == 3) Color::Green
        else if (value == 4) Color::Blue
        else if (value == 5) Color::Yellow
        else if (value == 6) Color::Orange
        else if (value == 7) Color::Purple
        else if (value == 8) Color::Pink
        else if (value == 9) Color::Brown
        else if (value == 10) Color::Gray
        else if (value == 11) Color::LightBlue
        else if (value == 12) Color::LightGreen
        else if (value == 13) Color::LightRed
        else Color::Black // Default fallback
    }

    // Internal function to finish the current round
    fun finish_round(game_address: address) acquires Game {
        let game = borrow_global_mut<Game>(game_address);
        let current_round_index = game.current_round - 1;
        let round = vector::borrow_mut(&mut game.rounds, current_round_index);
        
        if (round.finished) {
            return // Already finished
        };

        round.finished = true;

        // Calculate points
        let team0_points = 0u64;
        let team1_points = 0u64;

        if (round.team0_guessed && round.team1_guessed) {
            // Both teams guessed - first gets 2 points, second gets 1
            let team0_time = option::extract(&mut round.team0_guess_time);
            let team1_time = option::extract(&mut round.team1_guess_time);
            
            if (team0_time <= team1_time) {
                team0_points = 2;
                team1_points = 1;
            } else {
                team0_points = 1;
                team1_points = 2;
            };
        } else if (round.team0_guessed) {
            team0_points = 2;
        } else if (round.team1_guessed) {
            team1_points = 2;
        };

        // Update scores
        game.team0_score = game.team0_score + team0_points;
        game.team1_score = game.team1_score + team1_points;

        // Emit round finished event
        event::emit(RoundFinished {
            game_address,
            round_number: current_round_index,
            word: round.word,
            team0_points_earned: team0_points,
            team1_points_earned: team1_points,
            team0_total_score: game.team0_score,
            team1_total_score: game.team1_score,
        });

        // Check if game is finished
        if (game.team0_score >= game.target_score || game.team1_score >= game.target_score) {
            game.finished = true;
            game.winner = if (game.team0_score >= game.team1_score) {
                option::some(0)
            } else {
                option::some(1)
            };

            event::emit(GameFinished {
                game_address,
                winner: option::extract(&mut game.winner),
                final_team0_score: game.team0_score,
                final_team1_score: game.team1_score,
            });
        } else {
            // Rotate artists for next round
            game.current_team0_artist = (game.current_team0_artist + 1) % vector::length(&game.team0_players);
            game.current_team1_artist = (game.current_team1_artist + 1) % vector::length(&game.team1_players);
        };
    }

    // Start next round (can be called by any artist)
    #[lint::allow_unsafe_randomness]
    public entry fun next_round(caller: &signer, game_address: address) acquires Game, WordList {
        let game = borrow_global<Game>(game_address);
        assert!(game.started, EGAME_NOT_STARTED);
        assert!(!game.finished, EGAME_FINISHED);

        let caller_address = signer::address_of(caller);
        
        // Check if caller is one of the current artists
        let is_team0_artist = *vector::borrow(&game.team0_players, game.current_team0_artist) == caller_address;
        let is_team1_artist = *vector::borrow(&game.team1_players, game.current_team1_artist) == caller_address;
        
        assert!(is_team0_artist || is_team1_artist, ENOT_ARTIST_TURN);

        // Check if current round is finished
        if (game.current_round > 0) {
            let current_round_index = game.current_round - 1;
            let round = vector::borrow(&game.rounds, current_round_index);
            assert!(round.finished, EROUND_NOT_ACTIVE);
        };

        start_new_round(game_address);
    }

    // View functions
    #[view]
    public fun get_game(game_address: address): (
        address, // creator
        vector<address>, // team0_players
        vector<address>, // team1_players
        u64, // current_team0_artist
        u64, // current_team1_artist
        u64, // team0_score
        u64, // team1_score
        u64, // target_score
        u64, // current_round
        bool, // started
        bool, // finished
        Option<u64>, // winner
        u16, // canvas_width
        u16, // canvas_height
        u64, // round_duration
    ) acquires Game {
        let game = borrow_global<Game>(game_address);
        (
            game.creator,
            game.team0_players,
            game.team1_players,
            game.current_team0_artist,
            game.current_team1_artist,
            game.team0_score,
            game.team1_score,
            game.target_score,
            game.current_round,
            game.started,
            game.finished,
            game.winner,
            game.canvas_width,
            game.canvas_height,
            game.round_duration,
        )
    }

    #[view]
    public fun get_current_round(game_address: address): (
        u64, // round_number
        String, // word (only if round is finished)
        u64, // start_time
        u64, // duration_seconds
        bool, // team0_guessed
        bool, // team1_guessed
        bool, // finished
        Option<u64>, // team0_guess_time
        Option<u64>, // team1_guess_time
    ) acquires Game {
        let game = borrow_global<Game>(game_address);
        if (game.current_round == 0) {
            return (0, string::utf8(b""), 0, 0, false, false, false, option::none(), option::none())
        };

        let current_round_index = game.current_round - 1;
        let round = vector::borrow(&game.rounds, current_round_index);
        
        // Only reveal word if round is finished
        let word_to_show = if (round.finished) {
            round.word
        } else {
            string::utf8(b"")
        };

        (
            round.round_number,
            word_to_show,
            round.start_time,
            round.duration_seconds,
            round.team0_guessed,
            round.team1_guessed,
            round.finished,
            round.team0_guess_time,
            round.team1_guess_time,
        )
    }

    #[view]
    public fun get_canvas(game_address: address, round_number: u64, team: u64): SimpleMap<u16, Color> acquires Game {
        let game = borrow_global<Game>(game_address);
        assert!(team == 0 || team == 1, EINVALID_TEAM);
        assert!(round_number < vector::length(&game.rounds), EGAME_NOT_FOUND);

        let round = vector::borrow(&game.rounds, round_number);
        let canvas = if (team == 0) {
            &round.team0_canvas
        } else {
            &round.team1_canvas
        };

        canvas.pixels
    }

    // Admin functions (creator only)
    public entry fun update_word_list(deployer: &signer, new_words: vector<String>) acquires WordList {
        let word_list = borrow_global_mut<WordList>(@pictionary);
        // Only the original deployer can update the word list
        assert!(signer::address_of(deployer) == @pictionary, ENOT_AUTHORIZED);
        word_list.words = new_words;
    }
}