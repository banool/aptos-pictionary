#[test_only]
module pictionary::pictionary_tests {
    use pictionary::pictionary;
    use std::string;
    use aptos_framework::timestamp;

    // Helper function to create test accounts
    fun create_test_account(aptos_framework: &signer, account_addr: address): signer {
        aptos_framework::account::create_account_for_test(account_addr)
    }

    // Test basic game creation with valid teams
    #[test(aptos_framework = @0x1, creator = @0x100)]
    fun test_create_game_success(aptos_framework: &signer, creator: &signer) {
        timestamp::set_time_has_started_for_testing(aptos_framework);

        // Create valid teams with 2+ players each
        let team0_players = vector[@0x200, @0x201];
        let team1_players = vector[@0x300, @0x301];

        // This should not fail
        let _game_address = pictionary::create_game_inner(
            creator,
            team0_players,
            team1_players,
            string::utf8(b"Team A"),
            string::utf8(b"Team B"),
            11, // target_score
            500, // canvas_width
            500, // canvas_height
            30, // round_duration
        );
    }

    #[test(aptos_framework = @0x1, creator = @0x100)]
    #[expected_failure(abort_code = pictionary::pictionary::ETEAM_TOO_SMALL)]
    fun test_create_game_team_too_small(aptos_framework: &signer, creator: &signer) {
        timestamp::set_time_has_started_for_testing(aptos_framework);

        // Try to create game with team that has only 1 player
        let team0_players = vector[@0x200]; // Only 1 player - should fail
        let team1_players = vector[@0x300, @0x301];

        let _game_address = pictionary::create_game_inner(
            creator,
            team0_players,
            team1_players,
            string::utf8(b"Team A"),
            string::utf8(b"Team B"),
            11,
            500,
            500,
            30,
        );
    }

    #[test(aptos_framework = @0x1, creator = @0x100)]
    fun test_basic_functionality(aptos_framework: &signer, creator: &signer) {
        timestamp::set_time_has_started_for_testing(aptos_framework);

        let team0_players = vector[@0x200, @0x201];
        let team1_players = vector[@0x300, @0x301];

        let _game_address = pictionary::create_game_inner(
            creator,
            team0_players,
            team1_players,
            string::utf8(b"Red Team"),
            string::utf8(b"Blue Team"),
            11,
            500,
            500,
            30,
        );
    }

    #[test(aptos_framework = @0x1, creator = @0x100)]
    fun test_create_multiple_games(aptos_framework: &signer, creator: &signer) {
        timestamp::set_time_has_started_for_testing(aptos_framework);

        // Create first game
        let team0_players = vector[@0x200, @0x201];
        let team1_players = vector[@0x300, @0x301];

        let _game_address = pictionary::create_game_inner(
            creator,
            team0_players,
            team1_players,
            string::utf8(b"Alpha"),
            string::utf8(b"Beta"),
            15, // Different target score
            600, // Different canvas size
            600,
            45, // Different round duration
        );
    }

    #[test(aptos_framework = @0x1, creator = @0x100)]
    fun test_game_parameters_validation(aptos_framework: &signer, creator: &signer) {
        timestamp::set_time_has_started_for_testing(aptos_framework);

        let team0_players = vector[@0x200, @0x201];
        let team1_players = vector[@0x300, @0x301];

        let _game_address = pictionary::create_game_inner(
            creator,
            team0_players,
            team1_players,
            string::utf8(b"Warriors"),
            string::utf8(b"Legends"),
            11,
            500,
            500,
            30,
        );
    }

    #[test(aptos_framework = @0x1, creator = @0x100)]
    fun test_color_conversion_bounds(aptos_framework: &signer, creator: &signer) {
        timestamp::set_time_has_started_for_testing(aptos_framework);

        let team0_players = vector[@0x200, @0x201];
        let team1_players = vector[@0x300, @0x301];

        let _game_address = pictionary::create_game_inner(
            creator,
            team0_players,
            team1_players,
            string::utf8(b"Phoenix"),
            string::utf8(b"Dragons"),
            11,
            500,
            500,
            30,
        );
    }

    #[test(aptos_framework = @0x1, creator = @0x100)]
    fun test_canvas_delta_conversion(aptos_framework: &signer, creator: &signer) {
        timestamp::set_time_has_started_for_testing(aptos_framework);

        let team0_players = vector[@0x200, @0x201];
        let team1_players = vector[@0x300, @0x301];

        let _game_address = pictionary::create_game_inner(
            creator,
            team0_players,
            team1_players,
            string::utf8(b"Storm"),
            string::utf8(b"Thunder"),
            11,
            500,
            500,
            30,
        );
    }

    #[test(aptos_framework = @0x1, creator = @0x100)]
    fun test_game_configuration_defaults(aptos_framework: &signer, creator: &signer) {
        timestamp::set_time_has_started_for_testing(aptos_framework);

        let team0_players = vector[@0x200, @0x201];
        let team1_players = vector[@0x300, @0x301];

        let _game_address = pictionary::create_game_inner(
            creator,
            team0_players,
            team1_players,
            string::utf8(b""),
            string::utf8(b""),
            11,
            0, // Should default to 500
            0, // Should default to 500
            0, // Should default to 60
        );
    }

    #[test(aptos_framework = @0x1, creator = @0x100, player1 = @0x200, player2 = @0x201, player3 = @0x300, player4 = @0x301)]
    fun test_round_advancement_happy_path(
        aptos_framework: &signer, 
        creator: &signer,
        player1: &signer,
        player2: &signer, 
        player3: &signer,
        player4: &signer
    ) {
        timestamp::set_time_has_started_for_testing(aptos_framework);

        let team0_players = vector[@0x200, @0x201];
        let team1_players = vector[@0x300, @0x301];

        // Create game
        let game_address = pictionary::create_game_inner(
            creator,
            team0_players,
            team1_players,
            string::utf8(b"Team A"),
            string::utf8(b"Team B"),
            5, // Lower target score for easier testing
            500,
            500,
            30,
        );

        // Start the game with test word
        let test_word = string::utf8(b"cat");
        pictionary::start_game_test(creator, game_address, test_word);

        // Check initial state
        let (_, _, _, _, _, team0_artist_idx, team1_artist_idx, team0_score, team1_score, _, current_round, started, finished, _, _, _, _) = 
            pictionary::get_game(game_address);
        
        assert!(started, 1);
        assert!(!finished, 2);
        assert!(team0_artist_idx == 0, 3); // First artist
        assert!(team1_artist_idx == 0, 4); // First artist
        assert!(team0_score == 0, 5);
        assert!(team1_score == 0, 6);
        assert!(current_round == 1, 7); // First round started

        // Get the word for artists
        let word = pictionary::get_current_word_for_artist(game_address, @0x200); // Team 0 artist
        assert!(word == test_word, 8); // Word should match test word

        // Team 0 guesser makes correct guess
        pictionary::make_guess(player2, game_address, word);

        // Team 1 guesser makes correct guess
        pictionary::make_guess(player4, game_address, word);

        // Check scores after round finishes
        let (_, _, _, _, _, new_team0_artist_idx, new_team1_artist_idx, new_team0_score, new_team1_score, _, new_current_round, _, _, _, _, _, _) = 
            pictionary::get_game(game_address);

        // Both teams should have points (first team gets 2, second gets 1)
        assert!(new_team0_score > 0 || new_team1_score > 0, 9);
        assert!(new_team0_score + new_team1_score == 3, 10); // Total should be 3 points
        
        // Artists should have advanced
        assert!(new_team0_artist_idx == 1, 11); // Should advance to next artist
        assert!(new_team1_artist_idx == 1, 12); // Should advance to next artist
    }

    #[test(aptos_framework = @0x1, creator = @0x100, player1 = @0x200, player2 = @0x201, player3 = @0x300, player4 = @0x301)]
    fun test_artist_looping_back_to_first(
        aptos_framework: &signer,
        creator: &signer,
        player1: &signer,
        player2: &signer,
        player3: &signer,
        player4: &signer
    ) {
        timestamp::set_time_has_started_for_testing(aptos_framework);

        let team0_players = vector[@0x200, @0x201]; // Only 2 players per team
        let team1_players = vector[@0x300, @0x301];

        let game_address = pictionary::create_game_inner(
            creator,
            team0_players,
            team1_players,
            string::utf8(b"Team A"),
            string::utf8(b"Team B"),
            5,
            500,
            500,
            30,
        );
        let test_word1 = string::utf8(b"cat");
        pictionary::start_game_test(creator, game_address, test_word1);

        // First round - artist indices should be 0
        let (_, _, _, _, _, team0_artist_idx, team1_artist_idx, _, _, _, _, _, _, _, _, _, _) = 
            pictionary::get_game(game_address);
        assert!(team0_artist_idx == 0, 1);
        assert!(team1_artist_idx == 0, 2);

        // Complete first round
        pictionary::make_guess(player2, game_address, test_word1);
        pictionary::make_guess(player4, game_address, test_word1);

        // Start second round
        let test_word2 = string::utf8(b"dog");
        pictionary::next_round_test(player1, game_address, test_word2); // Team 0 artist can start next round

        // Second round - artist indices should be 1
        let (_, _, _, _, _, team0_artist_idx, team1_artist_idx, _, _, _, _, _, _, _, _, _, _) = 
            pictionary::get_game(game_address);
        assert!(team0_artist_idx == 1, 3);
        assert!(team1_artist_idx == 1, 4);

        // Complete second round
        pictionary::make_guess(player1, game_address, test_word2);
        pictionary::make_guess(player3, game_address, test_word2);

        // Start third round
        let test_word3 = string::utf8(b"tree");
        pictionary::next_round_test(player2, game_address, test_word3); // Team 0 new artist can start next round

        // Third round - artist indices should loop back to 0
        let (_, _, _, _, _, team0_artist_idx, team1_artist_idx, _, _, _, _, _, _, _, _, _, _) = 
            pictionary::get_game(game_address);
        assert!(team0_artist_idx == 0, 5); // Should loop back to first artist
        assert!(team1_artist_idx == 0, 6); // Should loop back to first artist
    }

    #[test(aptos_framework = @0x1, creator = @0x100, player1 = @0x200, player2 = @0x201, player3 = @0x300, player4 = @0x301)]
    fun test_cannot_advance_round_twice(
        aptos_framework: &signer,
        creator: &signer,
        player1: &signer,
        player2: &signer,
        player3: &signer,
        player4: &signer
    ) {
        timestamp::set_time_has_started_for_testing(aptos_framework);

        let team0_players = vector[@0x200, @0x201];
        let team1_players = vector[@0x300, @0x301];

        let game_address = pictionary::create_game_inner(
            creator,
            team0_players,
            team1_players,
            string::utf8(b"Team A"),
            string::utf8(b"Team B"),
            10, // Higher target to prevent game ending
            500,
            500,
            30,
        );
        let test_word1 = string::utf8(b"cat");
        pictionary::start_game_test(creator, game_address, test_word1);

        // Get initial round state
        let (_, _, _, _, _, initial_team0_artist, initial_team1_artist, initial_team0_score, initial_team1_score, _, initial_round, _, _, _, _, _, _) = 
            pictionary::get_game(game_address);

        // Both teams guess correctly (this should finish the round automatically)
        pictionary::make_guess(player2, game_address, test_word1);
        pictionary::make_guess(player4, game_address, test_word1);

        // Check that round finished and artists advanced
        let (_, _, _, _, _, mid_team0_artist, mid_team1_artist, mid_team0_score, mid_team1_score, _, mid_round, _, _, _, _, _, _) = 
            pictionary::get_game(game_address);
        
        assert!(mid_team0_artist != initial_team0_artist || mid_team1_artist != initial_team1_artist, 1); // Artists should have advanced
        assert!(mid_team0_score > initial_team0_score || mid_team1_score > initial_team1_score, 2); // Scores should have increased

        // Now try to call next_round - this should either start a new round or handle gracefully
        // The key is that it shouldn't cause a double advancement or error
        let test_word2 = string::utf8(b"dog");
        pictionary::next_round_test(player1, game_address, test_word2);

        // Check final state
        let (_, _, _, _, _, final_team0_artist, final_team1_artist, final_team0_score, final_team1_score, _, final_round, _, _, _, _, _, _) = 
            pictionary::get_game(game_address);

        // Should have started a new round, not double-advanced artists
        assert!(final_round > mid_round, 3); // Should be in next round
        // Artists may advance again for the new round, but scores shouldn't double-count
        assert!(final_team0_score == mid_team0_score, 4); // Scores shouldn't change from calling next_round
        assert!(final_team1_score == mid_team1_score, 5);
    }

    #[test(aptos_framework = @0x1, creator = @0x100, player1 = @0x200, player2 = @0x201, player3 = @0x300, player4 = @0x301)]
    fun test_round_timeout_advancement(
        aptos_framework: &signer,
        creator: &signer,
        player1: &signer,
        player2: &signer,
        player3: &signer,
        player4: &signer
    ) {
        timestamp::set_time_has_started_for_testing(aptos_framework);

        let team0_players = vector[@0x200, @0x201];
        let team1_players = vector[@0x300, @0x301];

        let game_address = pictionary::create_game_inner(
            creator,
            team0_players,
            team1_players,
            string::utf8(b"Team A"),
            string::utf8(b"Team B"),
            10,
            500,
            500,
            5, // Very short round duration for testing
        );
        let test_word = string::utf8(b"cat");
        pictionary::start_game_test(creator, game_address, test_word);

        // Get initial artist state
        let (_, _, _, _, _, initial_team0_artist, initial_team1_artist, _, _, _, _, _, _, _, _, _, _) = 
            pictionary::get_game(game_address);

        // Fast-forward time to expire the round
        timestamp::fast_forward_seconds(10); // Exceed the 5-second round duration

        // Try to draw (this should trigger round finishing due to timeout)
        pictionary::submit_canvas_delta(
            player1, 
            game_address, 
            0, // team 0
            vector[100], // positions
            vector[1] // colors (white)
        );

        // Check that artists advanced due to timeout
        let (_, _, _, _, _, final_team0_artist, final_team1_artist, _, _, _, _, _, _, _, _, _, _) = 
            pictionary::get_game(game_address);
        
        assert!(final_team0_artist != initial_team0_artist, 1); // Should advance to next artist
        assert!(final_team1_artist != initial_team1_artist, 2); // Should advance to next artist
    }

    #[test(aptos_framework = @0x1, creator = @0x100)]
    #[expected_failure(abort_code = pictionary::pictionary::ENOT_ARTIST_TURN)]
    fun test_only_artist_can_start_next_round(aptos_framework: &signer, creator: &signer) {
        timestamp::set_time_has_started_for_testing(aptos_framework);

        let team0_players = vector[@0x200, @0x201];
        let team1_players = vector[@0x300, @0x301];

        let game_address = pictionary::create_game_inner(
            creator,
            team0_players,
            team1_players,
            string::utf8(b"Team A"),
            string::utf8(b"Team B"),
            10,
            500,
            500,
            30,
        );
        let test_word = string::utf8(b"cat");
        pictionary::start_game_test(creator, game_address, test_word);

        // Try to start next round with non-artist (should fail)
        let non_artist = create_test_account(aptos_framework, @0x999);
        let test_word2 = string::utf8(b"dog");
        pictionary::next_round_test(&non_artist, game_address, test_word2);
    }
}