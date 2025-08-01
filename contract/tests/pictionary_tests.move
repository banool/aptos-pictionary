#[test_only]
module pictionary::pictionary_tests {

    use aptos_framework::account;
    use aptos_framework::timestamp;
    use pictionary::pictionary;

    // Helper function to create test accounts
    fun create_test_account(aptos_framework: &signer, account_addr: address): signer {
        account::create_account_for_test(account_addr);
        account::create_signer_for_test(account_addr)
    }

    #[test(aptos_framework = @0x1)]
    fun test_basic_functionality(aptos_framework: &signer) {
        timestamp::set_time_has_started_for_testing(aptos_framework);
        // Basic test that just ensures the module can be compiled and called
    }

    #[test(aptos_framework = @0x1, creator = @0x100)]
    fun test_create_game_success(aptos_framework: &signer, creator: &signer) {
        timestamp::set_time_has_started_for_testing(aptos_framework);

        let team0_players = vector[@0x200, @0x201];
        let team1_players = vector[@0x300, @0x301];

        // This should not fail
        pictionary::create_game(
            creator,
            team0_players,
            team1_players,
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

        pictionary::create_game(
            creator,
            team0_players,
            team1_players,
            11,
            500,
            500,
            30,
        );
    }

    #[test(aptos_framework = @0x1, creator = @0x100)]
    fun test_create_multiple_games(aptos_framework: &signer, creator: &signer) {
        timestamp::set_time_has_started_for_testing(aptos_framework);

        let team0_players = vector[@0x200, @0x201];
        let team1_players = vector[@0x300, @0x301];

        // Create first game
        pictionary::create_game(
            creator,
            team0_players,
            team1_players,
            11,
            500,
            500,
            30,
        );

        // Create second game with different players
        let team0_players_2 = vector[@0x400, @0x401];
        let team1_players_2 = vector[@0x500, @0x501];

        pictionary::create_game(
            creator,
            team0_players_2,
            team1_players_2,
            15, // Different target score
            600, // Different canvas size
            600,
            45, // Different round duration
        );
    }

    #[test(aptos_framework = @0x1, creator = @0x100)]
    fun test_canvas_delta_conversion(aptos_framework: &signer, creator: &signer) {
        timestamp::set_time_has_started_for_testing(aptos_framework);

        let team0_players = vector[@0x200, @0x201];
        let team1_players = vector[@0x300, @0x301];

        pictionary::create_game(
            creator,
            team0_players,
            team1_players,
            11,
            100, // Smaller canvas for testing
            100,
            30,
        );

        // Test would continue with canvas operations if we could get game address
        // This demonstrates the structure for testing canvas deltas
    }

    #[test(aptos_framework = @0x1, creator = @0x100)]
    fun test_game_parameters_validation(aptos_framework: &signer, creator: &signer) {
        timestamp::set_time_has_started_for_testing(aptos_framework);

        let team0_players = vector[@0x200, @0x201, @0x202]; // 3 players
        let team1_players = vector[@0x300, @0x301]; // 2 players

        // Should work with different team sizes (both >= 2)
        pictionary::create_game(
            creator,
            team0_players,
            team1_players,
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

        // Test with zero values to check defaults
        pictionary::create_game(
            creator,
            team0_players,
            team1_players,
            11,
            0, // Should default to 500
            0, // Should default to 500
            0, // Should default to 30
        );
    }

    #[test(aptos_framework = @0x1)]
    fun test_color_conversion_bounds(aptos_framework: &signer) {
        timestamp::set_time_has_started_for_testing(aptos_framework);
        
        // This test would verify that color conversion handles edge cases properly
        // Testing all valid color indices (0-13) and invalid ones defaulting to Black
        
        // Note: We can't directly test the u8_to_color function since it's private,
        // but this structure shows how we would test it in integration
    }

    // Integration test structure for full game flow
    // Note: These tests would require being able to capture game addresses from events
    // or having the create_game function return the game address
    
    /*
    #[test(aptos_framework = @0x1, creator = @0x100, artist1 = @0x200, artist2 = @0x300)]
    fun test_full_game_flow(
        aptos_framework: &signer, 
        creator: &signer, 
        artist1: &signer, 
        artist2: &signer
    ) {
        timestamp::set_time_has_started_for_testing(aptos_framework);
        
        // This would test:
        // 1. Game creation
        // 2. Game start
        // 3. Round progression
        // 4. Drawing and guessing
        // 5. Scoring
        // 6. Game completion
    }
    */
}