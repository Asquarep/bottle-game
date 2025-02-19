// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract BottleArrangementGame {
    struct Game {
        uint8[5] sequence;
        uint8 attempts;
        bool active;
    }
    string private constant ATTEMPT_MISSED_MSG = "Attempt was missed";
    string private constant GAME_OVER_MSG = "Game over";
    string private constant GAME_WON_MSG = "Game won";

    mapping(address => Game) public games;
    mapping(address => uint40) private lastWinTime; 

    event GameStarted(address indexed player, uint8[5] sequence);
    event AttemptMade(address indexed player, uint8 correctCount);
    event AttemptMissed(address indexed player, uint8 correctCount);
    event GameWon(address indexed player);
    event GameEnded(address indexed player);

    uint256 private constant COOLDOWN_PERIOD = 2 minutes;


    function startNewGame() external {
        require(!games[msg.sender].active || games[msg.sender].attempts == 5, "Game in progress");
        require(block.timestamp >= lastWinTime[msg.sender] + COOLDOWN_PERIOD, "Wait 2 minutes after winning");

        games[msg.sender] = Game({
            sequence: generateRandomSequence(msg.sender),
            attempts: 0,
            active: true
        });

        emit GameStarted(msg.sender, games[msg.sender].sequence);
    }

    function makeAttempt(uint8[5] memory attempt) external returns (string memory) {
        Game storage game = games[msg.sender];
        require(game.active, "No active game");

        uint8 correctCount = 0;
        for (uint8 i = 0; i < 5; i++) {
            if (attempt[i] == game.sequence[i]) correctCount++;
        }

        game.attempts++;
        emit AttemptMade(msg.sender, correctCount);

        if (correctCount == 5 || game.attempts == 5) {
            game.active = false;
            if (correctCount == 5) {
                lastWinTime[msg.sender] = uint40(block.timestamp);
                emit GameWon(msg.sender);
                return GAME_WON_MSG;
            } else {
                emit GameEnded(msg.sender);
                return GAME_OVER_MSG;
            }
        } else {
            emit AttemptMissed(msg.sender, correctCount);
            return ATTEMPT_MISSED_MSG;
        }
    }

    function generateRandomSequence(address player) internal view returns (uint8[5] memory) {
        uint8[5] memory sequence;
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, player)));
        for (uint8 i = 0; i < 5; i++) {
            sequence[i] = uint8((seed >> (i * 8)) % 5 + 1);
        }
        return sequence;
    }
}
