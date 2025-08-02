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
        pictionary::create_game(
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

        pictionary::create_game(
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

        pictionary::create_game(
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

        pictionary::create_game(
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

        pictionary::create_game(
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

        pictionary::create_game(
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

        pictionary::create_game(
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

        pictionary::create_game(
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
}