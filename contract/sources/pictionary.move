/// Pictionary game implementation on Aptos blockchain
/// 
/// This module implements a multiplayer pictionary game where:
/// - Two teams compete with at least 2 players each
/// - Artists rotate and draw words while teammates guess
/// - Canvas updates are stored on-chain with delta compression
/// - Games are played to a target score with timed rounds
module pictionary::pictionary {
    use std::option::{Self, Option};
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use aptos_framework::event;
    use aptos_framework::object::{Self, ExtendRef};
    use aptos_framework::randomness;
    use aptos_framework::ordered_map::{Self, OrderedMap};
    use aptos_framework::timestamp;

    // Error codes
    /// Game not found
    const EGAME_NOT_FOUND: u64 = 1;
    /// Round not found
    const EROUND_NOT_FOUND: u64 = 13;
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

    /// Color palette available for drawing on the canvas
    /// Each variant represents a different color that artists can use
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
    }

    /// Represents a single pixel change on the canvas for efficient delta updates
    /// Used to minimize on-chain storage by only storing changes rather than full canvas
    struct CanvasDelta has store, copy, drop {
        /// Linear position on canvas (y * width + x)
        position: u16,
        /// Color to set at this position
        color: Color,
    }

    /// Canvas representing the drawing area for each team in each round
    /// Stores pixel data efficiently using ordered map for consistent iteration
    struct Canvas has store {
        /// Pixel data stored as position -> color mapping
        /// Only stores non-default (non-white) pixels for efficiency
        pixels: OrderedMap<u16, Color>,
        /// Canvas width in pixels
        width: u16,
        /// Canvas height in pixels  
        height: u16,
        /// Unix timestamp of last canvas update
        last_updated: u64,
    }

    /// Contains all information for a single round of the game
    /// Each round has its own word, timer, and canvas for each team
    struct Round has store {
        /// Sequential round number starting from 0
        round_number: u64,
        /// The word both teams are trying to draw/guess
        word: String,
        /// Unix timestamp when round started
        start_time: u64,
        /// How long the round lasts in seconds
        duration_seconds: u64,
        /// Team 0's drawing canvas for this round
        team0_canvas: Canvas,
        /// Team 1's drawing canvas for this round
        team1_canvas: Canvas,
        /// Whether team 0 has guessed correctly
        team0_guessed: bool,
        /// Whether team 1 has guessed correctly
        team1_guessed: bool,
        /// Timestamp when team 0 guessed (if they did)
        team0_guess_time: Option<u64>,
        /// Timestamp when team 1 guessed (if they did)
        team1_guess_time: Option<u64>,
        /// Whether this round has been processed for scoring
        processed: bool,
    }

    /// Main game state stored as an Aptos object
    /// Contains all players, scores, rounds, and game configuration
    struct Game has key {
        /// Address of the player who created this game
        creator: address,
        /// List of addresses on team 0 (must have at least 2 players)
        team0_players: vector<address>,
        /// List of addresses on team 1 (must have at least 2 players)
        team1_players: vector<address>,
        /// Name of team 0
        team0_name: String,
        /// Name of team 1
        team1_name: String,
        /// Index of current artist in team0_players vector
        current_team0_artist: u64,
        /// Index of current artist in team1_players vector
        current_team1_artist: u64,
        /// Score needed to win the game
        target_score: u64,
        /// History of all rounds played
        rounds: vector<Round>,
        /// Whether the game has been started by creator
        started: bool,
        /// Whether the game has finished (someone reached target score)
        finished: bool,
        /// Which team won (0 or 1), none if game not finished
        winner: Option<u64>,
        /// Width of canvas in pixels for all rounds
        canvas_width: u16,
        /// Height of canvas in pixels for all rounds
        canvas_height: u16,
        /// Duration of each round in seconds
        round_duration: u64,
        /// Object extend reference for future upgrades
        extend_ref: ExtendRef,
    }

    /// Global word list used for selecting random words in games
    /// Only the module deployer can update this list
    struct WordList has key {
        /// List of words that can be randomly selected for rounds
        words: vector<String>,
        /// Object extend reference for future upgrades
        extend_ref: ExtendRef,
    }

    #[event]
    /// Emitted when a new game is created.
    /// Used by frontend to show games a user is participating in.
    struct GameCreated has drop, store {
        /// Object address of the created game
        game_address: address,
        /// Address of the player who created the game
        creator: address,
        /// All players on team 0
        team0_players: vector<address>,
        /// All players on team 1
        team1_players: vector<address>,
        /// Score needed to win this game
        target_score: u64,
    }

    #[event]
    /// Emitted when a new round begins
    struct RoundStarted has drop, store {
        /// Game this round belongs to
        game_address: address,
        /// Sequential round number
        round_number: u64,
        /// Word to be drawn (revealed to artists only initially)
        word: String,
        /// Current artist for team 0
        team0_artist: address,
        /// Current artist for team 1
        team1_artist: address,
        /// When this round started
        start_time: u64,
    }

    #[event]
    /// Emitted when an artist updates their team's canvas
    struct CanvasUpdated has drop, store {
        /// Game this update belongs to
        game_address: address,
        /// Which team's canvas was updated (0 or 1)
        team: u64,
        /// Which round this update belongs to
        round_number: u64,
        /// Artist who made the drawing changes
        artist: address,
        /// List of pixel changes made
        deltas: vector<CanvasDelta>,
        /// When the update was made
        timestamp: u64,
    }

    #[event]
    /// Emitted when a player makes a guess
    struct GuessSubmitted has drop, store {
        /// Game this guess belongs to
        game_address: address,
        /// Player who made the guess
        guesser: address,
        /// Which team the guesser is on (0 or 1)
        team: u64,
        /// The guess that was made
        guess: String,
        /// Which round this guess was for
        round_number: u64,
        /// When the guess was made
        timestamp: u64,
    }

    #[event]
    /// Emitted when a round completes
    struct RoundFinished has drop, store {
        /// Game this round belongs to
        game_address: address,
        /// Which round just finished
        round_number: u64,
        /// The word that was being drawn
        word: String,
        /// Points team 0 earned this round
        team0_points_earned: u64,
        /// Points team 1 earned this round
        team1_points_earned: u64,
        /// Team 0's total score after this round
        team0_total_score: u64,
        /// Team 1's total score after this round
        team1_total_score: u64,
    }

    #[event]
    /// Emitted when a game ends (team reaches target score)
    struct GameFinished has drop, store {
        /// Game that just finished
        game_address: address,
        /// Winning team (0 or 1)
        winner: u64,
        /// Team 0's final score
        final_team0_score: u64,
        /// Team 1's final score
        final_team1_score: u64,
    }

    /// Initialize the module with a default word list
    /// Called automatically when the module is first published
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

    public entry fun create_game(
        creator: &signer,
        team0_players: vector<address>,
        team1_players: vector<address>,
        team0_name: String,
        team1_name: String,
        target_score: u64,
        canvas_width: u16,
        canvas_height: u16,
        round_duration: u64,
    ) {
        create_game_inner(creator, team0_players, team1_players, team0_name, team1_name, target_score, canvas_width, canvas_height, round_duration);
    }

    /// Creates a new pictionary game with the specified teams and settings
    /// Game is created but not started - creator must call start_game() separately
    /// Returns the address of the created game object
    public fun create_game_inner(
        creator: &signer,
        team0_players: vector<address>,
        team1_players: vector<address>,
        team0_name: String,
        team1_name: String,
        target_score: u64,
        canvas_width: u16,
        canvas_height: u16,
        round_duration: u64,
    ): address {
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
            team0_name: if (string::length(&team0_name) == 0) string::utf8(b"Team 1") else team0_name,
            team1_name: if (string::length(&team1_name) == 0) string::utf8(b"Team 2") else team1_name,
            current_team0_artist: 0,
            current_team1_artist: 0,
            target_score,
            rounds: vector::empty(),
            started: false,
            finished: false,
            winner: option::none(),
            canvas_width: if (canvas_width == 0) 500 else canvas_width,
            canvas_height: if (canvas_height == 0) 500 else canvas_height,
            round_duration: if (round_duration == 0) 60 else round_duration,
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
        game_address
    }

    /// Helper function to derive team 0's current score from completed rounds
    fun get_team0_score(game: &Game): u64 {
        let total_score = 0;
        let i = 0;
        while (i < vector::length(&game.rounds)) {
            let round = vector::borrow(&game.rounds, i);
            if (round.processed) {
                // Team 0 gets points based on timing if they guessed correctly
                if (round.team0_guessed) {
                    let points = if (round.team1_guessed) {
                        // Both teams guessed - points based on timing
                        let team0_time = *option::borrow(&round.team0_guess_time);
                        let team1_time = *option::borrow(&round.team1_guess_time);
                        if (team0_time <= team1_time) 2 else 1
                    } else {
                        // Only team 0 guessed
                        2
                    };
                    total_score = total_score + points;
                };
            };
            i = i + 1;
        };
        total_score
    }

    /// Helper function to derive team 1's current score from completed rounds
    fun get_team1_score(game: &Game): u64 {
        let total_score = 0;
        let i = 0;
        while (i < vector::length(&game.rounds)) {
            let round = vector::borrow(&game.rounds, i);
            if (round.processed) {
                // Team 1 gets points based on timing if they guessed correctly
                if (round.team1_guessed) {
                    let points = if (round.team0_guessed) {
                        // Both teams guessed - points based on timing
                        let team0_time = *option::borrow(&round.team0_guess_time);
                        let team1_time = *option::borrow(&round.team1_guess_time);
                        if (team1_time < team0_time) 2 else 1
                    } else {
                        // Only team 1 guessed
                        2
                    };
                    total_score = total_score + points;
                };
            };
            i = i + 1;
        };
        total_score
    }

    /// Helper function to derive current round number from rounds vector
    fun get_current_round_number(game: &Game): u64 {
        vector::length(&game.rounds)
    }

    #[randomness]
    // Starts the game and begins the first round (only creator can do this)
    // Uses on-chain randomness to select the first word
    entry fun start_game(creator: &signer, game_address: address) acquires Game, WordList {
        let game = borrow_global_mut<Game>(game_address);
        assert!(game.creator == signer::address_of(creator), ENOT_AUTHORIZED);
        assert!(!game.started, EGAME_ALREADY_STARTED);
        assert!(!game.finished, EGAME_FINISHED);

        game.started = true;
        start_new_round(game_address);
    }

    /// Internal function to start a new round with a random word
    /// Creates fresh canvases and rotates artists
    fun start_new_round(game_address: address) acquires Game, WordList {
        let game = borrow_global_mut<Game>(game_address);
        assert!(game.started, EGAME_NOT_STARTED);
        assert!(!game.finished, EGAME_FINISHED);

        // Get all previously used words in this game
        let used_words = vector::empty<String>();
        let i = 0;
        while (i < vector::length(&game.rounds)) {
            let round = vector::borrow(&game.rounds, i);
            vector::push_back(&mut used_words, round.word);
            i = i + 1;
        };

        // Select a random word that hasn't been used yet
        let word_list_address = object::create_object_address(&@pictionary, b"WordList");
        let word_list = borrow_global<WordList>(word_list_address);
        
        // Build list of available words (not yet used in this game)
        let available_words = vector::empty<String>();
        let j = 0;
        while (j < vector::length(&word_list.words)) {
            let candidate_word = *vector::borrow(&word_list.words, j);
            if (!vector::contains(&used_words, &candidate_word)) {
                vector::push_back(&mut available_words, candidate_word);
            };
            j = j + 1;
        };

        // If all words have been used, reset and use the full list
        // This prevents games from getting stuck if they exceed the word list size
        if (vector::is_empty(&available_words)) {
            available_words = word_list.words;
        };

        let word_index = randomness::u64_range(0, vector::length(&available_words));
        let word = *vector::borrow(&available_words, word_index);

        // Create new canvases for this round
        let team0_canvas = Canvas {
            pixels: ordered_map::new(),
            width: game.canvas_width,
            height: game.canvas_height,
            last_updated: timestamp::now_seconds(),
        };

        let team1_canvas = Canvas {
            pixels: ordered_map::new(),
            width: game.canvas_width,
            height: game.canvas_height,
            last_updated: timestamp::now_seconds(),
        };

        // Create new round
        let round = Round {
            round_number: get_current_round_number(game),
            word,
            start_time: timestamp::now_seconds(),
            duration_seconds: game.round_duration,
            team0_canvas,
            team1_canvas,
            team0_guessed: false,
            team1_guessed: false,
            team0_guess_time: option::none(),
            team1_guess_time: option::none(),
            processed: false,
        };

        vector::push_back(&mut game.rounds, round);

        // Get current artists
        let team0_artist = *vector::borrow(&game.team0_players, game.current_team0_artist);
        let team1_artist = *vector::borrow(&game.team1_players, game.current_team1_artist);

        // Emit round started event
        event::emit(RoundStarted {
            game_address,
            round_number: get_current_round_number(game),
            word,
            team0_artist,
            team1_artist,
            start_time: timestamp::now_seconds(),
        });

        // Round number is now derived from rounds vector length - no need to update manually
    }

    /// Submits drawing updates to the canvas (only current artist can do this)
    /// Uses delta compression to minimize on-chain storage
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
        let current_round_index = get_current_round_number(game) - 1;
        let round = vector::borrow_mut(&mut game.rounds, current_round_index);
        
        // Check if round is already finished
        if (is_round_finished(round)) {
            finish_round(game_address);
            return
        };
        
        assert!(!is_round_finished(round), EROUND_NOT_ACTIVE);

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

        let max_position = (canvas.width as u32) * (canvas.height as u32);
        let current_time = timestamp::now_seconds();

        let i = 0;
        while (i < vector::length(&deltas)) {
            let delta = vector::borrow(&deltas, i);
            
            // Validate position is within canvas bounds
            assert!((delta.position as u32) < max_position, EINVALID_CANVAS_POSITION);
            
            ordered_map::upsert(&mut canvas.pixels, delta.position, delta.color);
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

    /// Submits a guess for the current round
    /// Automatically awards points if the guess is correct
    /// Artists cannot make guesses, only other team members can
    public entry fun make_guess(
        guesser: &signer,
        game_address: address,
        guess: String,
    ) acquires Game {
        let game = borrow_global_mut<Game>(game_address);
        assert!(game.started, EGAME_NOT_STARTED);
        assert!(!game.finished, EGAME_FINISHED);

        let guesser_address = signer::address_of(guesser);
        let current_round_index = get_current_round_number(game) - 1;
        
        // Determine which team the guesser is on first (before borrowing round mutably)
        let team = get_player_team(game, guesser_address);
        
        // Check that guesser is not the current artist
        let is_team0_artist = *vector::borrow(&game.team0_players, game.current_team0_artist) == guesser_address;
        let is_team1_artist = *vector::borrow(&game.team1_players, game.current_team1_artist) == guesser_address;
        assert!(!is_team0_artist && !is_team1_artist, ENOT_ARTIST_TURN); // Reusing error code - artists can't guess
        
        let round = vector::borrow_mut(&mut game.rounds, current_round_index);
        
        // Check if round is already finished
        if (is_round_finished(round)) {
            finish_round(game_address);
            return
        };
        
        assert!(!is_round_finished(round), EROUND_NOT_ACTIVE);
        
        let current_time = timestamp::now_seconds();
        
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

    /// Determines which team a player belongs to
    /// Returns 0 for team 0, 1 for team 1
    fun get_player_team(game: &Game, player: address): u64 {
        if (vector::contains(&game.team0_players, &player)) {
            0
        } else {
            1
        }
    }

    /// Determines if a round is finished based on multiple criteria
    /// A round is finished if:
    /// 1. Both teams have guessed correctly, OR
    /// 2. The time limit has expired
    fun is_round_finished(round: &Round): bool {
        let current_time = timestamp::now_seconds();
        let time_expired = current_time > round.start_time + round.duration_seconds;
        let both_guessed = round.team0_guessed && round.team1_guessed;
        
        time_expired || both_guessed
    }

    /// Converts a u8 value to the corresponding Color enum variant
    /// Used for canvas delta updates from frontend
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
        else Color::Black // Default fallback
    }

    /// Internal function to complete the current round and award points
    /// Calculates scoring based on who guessed correctly and when
    fun finish_round(game_address: address) acquires Game {
        let game = borrow_global_mut<Game>(game_address);
        let current_round_index = get_current_round_number(game) - 1;
        let round = vector::borrow_mut(&mut game.rounds, current_round_index);
        
        // Check if already processed (prevent double processing)
        if (round.processed) {
            return
        };
        
        // Mark as processed
        round.processed = true;
        
        // Calculate points
        let team0_points = 0u64;
        let team1_points = 0u64;

        if (round.team0_guessed && round.team1_guessed) {
            // Both teams guessed - first gets 2 points, second gets 1
            // Safely check if guess times exist before borrowing
            if (option::is_some(&round.team0_guess_time) && option::is_some(&round.team1_guess_time)) {
                let team0_time = *option::borrow(&round.team0_guess_time);
                let team1_time = *option::borrow(&round.team1_guess_time);
                
                if (team0_time <= team1_time) {
                    team0_points = 2;
                    team1_points = 1;
                } else {
                    team0_points = 1;
                    team1_points = 2;
                };
            } else {
                // Fallback: if guess times are missing, give both teams 1 point
                team0_points = 1;
                team1_points = 1;
            };
        } else if (round.team0_guessed) {
            team0_points = 2;
        } else if (round.team1_guessed) {
            team1_points = 2;
        };

        // Extract round word before calling score functions to avoid borrow conflicts
        let round_word = round.word;
        
        // Scores are now derived from round results - no need to store them separately
        // Get current derived scores after processing this round
        let team0_total_score = get_team0_score(game);
        let team1_total_score = get_team1_score(game);

        // Emit round finished event
        event::emit(RoundFinished {
            game_address,
            round_number: current_round_index,
            word: round_word,
            team0_points_earned: team0_points,
            team1_points_earned: team1_points,
            team0_total_score,
            team1_total_score,
        });

        // Always rotate artists for next round (ensures proper advancement)
        game.current_team0_artist = (game.current_team0_artist + 1) % vector::length(&game.team0_players);
        game.current_team1_artist = (game.current_team1_artist + 1) % vector::length(&game.team1_players);

        // Check if game is finished
        if (team0_total_score >= game.target_score || team1_total_score >= game.target_score) {
            game.finished = true;
            game.winner = if (team0_total_score >= team1_total_score) {
                option::some(0)
            } else {
                option::some(1)
            };

            // Use borrow instead of extract to avoid consuming the option
            let winner_team = *option::borrow(&game.winner);
            event::emit(GameFinished {
                game_address,
                winner: winner_team,
                final_team0_score: team0_total_score,
                final_team1_score: team1_total_score,
            });
        };
    }

    #[randomness]
    // Starts the next round (can be called by either current artist)
    // Only allowed after current round is finished
    entry fun next_round(caller: &signer, game_address: address) acquires Game, WordList {
        let game = borrow_global<Game>(game_address);
        assert!(game.started, EGAME_NOT_STARTED);
        assert!(!game.finished, EGAME_FINISHED);

        let caller_address = signer::address_of(caller);
        
        // Check if caller is a member of the game.
        let is_team0_player = vector::contains(&game.team0_players, &caller_address);
        let is_team1_player = vector::contains(&game.team1_players, &caller_address);
        
        assert!(is_team0_player || is_team1_player, ENOT_ARTIST_TURN);

        // Check if current round is finished
        if (get_current_round_number(game) > 0) {
            let current_round_index = get_current_round_number(game) - 1;
            let round = vector::borrow(&game.rounds, current_round_index);
            assert!(is_round_finished(round), EROUND_NOT_ACTIVE);
        };

        // Finish the current round in case it hasn't been finished yet
        finish_round(game_address);

        start_new_round(game_address);
    }

    #[view]
    /// Returns complete game information
    public fun get_game(game_address: address): (
        address, // creator
        vector<address>, // team0_players
        vector<address>, // team1_players
        String, // team0_name
        String, // team1_name
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
            game.team0_name,
            game.team1_name,
            game.current_team0_artist,
            game.current_team1_artist,
            get_team0_score(game),
            get_team1_score(game),
            game.target_score,
            get_current_round_number(game),
            game.started,
            game.finished,
            game.winner,
            game.canvas_width,
            game.canvas_height,
            game.round_duration,
        )
    }

    #[view]
    /// Returns information about the current/most recent round
    /// Word is only revealed if the round is finished
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
        if (get_current_round_number(game) == 0) {
            return (0, string::utf8(b""), 0, 0, false, false, false, option::none(), option::none())
        };

        let current_round_index = get_current_round_number(game) - 1;
        let round = vector::borrow(&game.rounds, current_round_index);
        
        let round_finished = is_round_finished(round);
        
        // Only reveal word if round is finished
        let word_to_show = if (round_finished) {
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
            round_finished,
            round.team0_guess_time,
            round.team1_guess_time,
        )
    }

    #[view]
    /// Returns the canvas pixel data for a specific round and team
    public fun get_canvas(game_address: address, round_number: u64, team: u64): OrderedMap<u16, Color> acquires Game {
        let game = borrow_global<Game>(game_address);
        assert!(team == 0 || team == 1, EINVALID_TEAM);
        assert!(round_number < vector::length(&game.rounds), EROUND_NOT_FOUND);

        let round = vector::borrow(&game.rounds, round_number);
        let canvas = if (team == 0) {
            &round.team0_canvas
        } else {
            &round.team1_canvas
        };

        canvas.pixels
    }

    /// Simple round summary that can be copied (for view functions)
    struct RoundSummary has copy, drop {
        round_number: u64,
        word: String,
        start_time: u64,
        duration_seconds: u64,
        team0_guessed: bool,
        team1_guessed: bool,
        team0_guess_time: Option<u64>,
        team1_guess_time: Option<u64>,
    }

    #[view]
    /// Returns the round history for a game as copyable summaries
    public fun get_round_history(game_address: address): vector<RoundSummary> acquires Game {
        let game = borrow_global<Game>(game_address);
        let summaries = vector::empty<RoundSummary>();
        
        let i = 0;
        while (i < vector::length(&game.rounds)) {
            let round = vector::borrow(&game.rounds, i);
            let summary = RoundSummary {
                round_number: round.round_number,
                word: round.word,
                start_time: round.start_time,
                duration_seconds: round.duration_seconds,
                team0_guessed: round.team0_guessed,
                team1_guessed: round.team1_guessed,
                team0_guess_time: round.team0_guess_time,
                team1_guess_time: round.team1_guess_time,
            };
            vector::push_back(&mut summaries, summary);
            i = i + 1;
        };
        
        summaries
    }

    #[view]
    /// Returns the word for the current round (only if you're an artist or round is finished)
    public fun get_current_word_for_artist(game_address: address, player: address): String acquires Game {
        let game = borrow_global<Game>(game_address);
        if (get_current_round_number(game) == 0) {
            return string::utf8(b"")
        };

        let current_round_index = get_current_round_number(game) - 1;
        let round = vector::borrow(&game.rounds, current_round_index);
        
        // Return word if round is finished or if player is current artist
        if (is_round_finished(round)) {
            return round.word
        };
        
        // Check if player is current artist
        let is_team0_artist = *vector::borrow(&game.team0_players, game.current_team0_artist) == player;
        let is_team1_artist = *vector::borrow(&game.team1_players, game.current_team1_artist) == player;
        
        if (is_team0_artist || is_team1_artist) {
            round.word
        } else {
            string::utf8(b"")
        }
    }

    /// Updates the global word list used for random word selection
    /// Only the original module deployer can call this
    public entry fun update_word_list(deployer: &signer, new_words: vector<String>) acquires WordList {
        let word_list = borrow_global_mut<WordList>(@pictionary);
        // Only the original deployer can update the word list
        assert!(signer::address_of(deployer) == @pictionary, ENOT_AUTHORIZED);
        word_list.words = new_words;
    }

    #[test_only]
    /// Test-only function to start a game with a fixed word (no randomness)
    public entry fun start_game_test(creator: &signer, game_address: address, test_word: String) acquires Game {
        let game = borrow_global_mut<Game>(game_address);
        assert!(game.creator == signer::address_of(creator), ENOT_AUTHORIZED);
        assert!(!game.started, EGAME_ALREADY_STARTED);
        assert!(!game.finished, EGAME_FINISHED);

        game.started = true;
        start_new_round_with_word(game_address, test_word);
    }

    #[test_only]
    /// Test-only function to start next round with a fixed word (no randomness)
    public entry fun next_round_test(caller: &signer, game_address: address, test_word: String) acquires Game {
        let game = borrow_global<Game>(game_address);
        assert!(game.started, EGAME_NOT_STARTED);
        assert!(!game.finished, EGAME_FINISHED);

        let caller_address = signer::address_of(caller);
        
        // Check if caller is any player in either team (more lenient for testing)
        let is_team0_player = vector::contains(&game.team0_players, &caller_address);
        let is_team1_player = vector::contains(&game.team1_players, &caller_address);
        
        assert!(is_team0_player || is_team1_player, ENOT_ARTIST_TURN);

        // Check if current round is finished
        if (get_current_round_number(game) > 0) {
            let current_round_index = get_current_round_number(game) - 1;
            let round = vector::borrow(&game.rounds, current_round_index);
            assert!(is_round_finished(round), EROUND_NOT_ACTIVE);
        };

        // Finish the current round in case it hasn't been finished yet
        finish_round(game_address);

        start_new_round_with_word(game_address, test_word);
    }

    #[test_only]
    /// Internal test helper to start a new round with a specific word
    fun start_new_round_with_word(game_address: address, word: String) acquires Game {
        let game = borrow_global_mut<Game>(game_address);
        assert!(game.started, EGAME_NOT_STARTED);
        assert!(!game.finished, EGAME_FINISHED);

        // Create new canvases for this round
        let team0_canvas = Canvas {
            pixels: ordered_map::new(),
            width: game.canvas_width,
            height: game.canvas_height,
            last_updated: timestamp::now_seconds(),
        };

        let team1_canvas = Canvas {
            pixels: ordered_map::new(),
            width: game.canvas_width,
            height: game.canvas_height,
            last_updated: timestamp::now_seconds(),
        };

        // Create new round with provided word
        let round = Round {
            round_number: get_current_round_number(game),
            word,
            start_time: timestamp::now_seconds(),
            duration_seconds: game.round_duration,
            team0_canvas,
            team1_canvas,
            team0_guessed: false,
            team1_guessed: false,
            team0_guess_time: option::none(),
            team1_guess_time: option::none(),
            processed: false,
        };

        vector::push_back(&mut game.rounds, round);

        // Get current artists
        let team0_artist = *vector::borrow(&game.team0_players, game.current_team0_artist);
        let team1_artist = *vector::borrow(&game.team1_players, game.current_team1_artist);

        // Emit round started event
        event::emit(RoundStarted {
            game_address,
            round_number: get_current_round_number(game),
            word,
            team0_artist,
            team1_artist,
            start_time: timestamp::now_seconds(),
        });

        // Round number is now derived from rounds vector length - no need to update manually
    }
}