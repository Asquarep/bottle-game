import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("BottleArrangementGame", function () {
    async function deployGameContract() {
        const [player, otherPlayer] = await ethers.getSigners();
        const Game = await ethers.getContractFactory("BottleArrangementGame");
        const game = await Game.deploy();
        await game.waitForDeployment();
        return { game, player, otherPlayer };
    }

    describe("Game Flow", function () {
        it("Should start a new game", async function () {
            const { game, player } = await loadFixture(deployGameContract);
            await expect(game.connect(player).startNewGame())
                .to.emit(game, "GameStarted")
                .withArgs(player.address, anyValue);
        });

        it("Should allow correct attempts and win the game", async function () {
            const { game, player } = await loadFixture(deployGameContract);
            await game.connect(player).startNewGame();
            
            const gameData = await game.games(player.address);
            const correctSequence = await gameData.sequence;

            console.log(correctSequence);
            
            
            await expect(game.connect(player).makeAttempt(correctSequence))
                .to.emit(game, "AttemptMade").withArgs(player.address, 5)
                .to.emit(game, "GameWon").withArgs(player.address);
        });

        it("Should allow multiple attempts and lose the game after 5 attempts", async function () {
            const { game, player } = await loadFixture(deployGameContract);
            await game.connect(player).startNewGame();
            
            for (let i = 0; i < 4; i++) {
                await expect(game.connect(player).makeAttempt([0, 0, 0, 0, 0]))
                    .to.emit(game, "AttemptMissed")
                    .withArgs(player.address, 0);
            }
            
            await expect(game.connect(player).makeAttempt([0, 0, 0, 0, 0]))
                .to.emit(game, "GameEnded").withArgs(player.address);
        });

        it("Should not allow starting a new game if one is in progress", async function () {
            const { game, player } = await loadFixture(deployGameContract);
            await game.connect(player).startNewGame();
            await expect(game.connect(player).startNewGame())
                .to.be.revertedWith("Game in progress");
        });

        it("Should enforce cooldown period after winning", async function () {
            const { game, player } = await loadFixture(deployGameContract);
            await game.connect(player).startNewGame();
            
            const gameData = await game.games(player.address);
            const correctSequence = gameData.sequence;
            
            await game.connect(player).makeAttempt(correctSequence);
            
            await expect(game.connect(player).startNewGame())
                .to.be.revertedWith("Wait 2 minutes after winning");

            await time.increase(121); // Increase past cooldown
            await expect(game.connect(player).startNewGame())
                .to.emit(game, "GameStarted");
        });
    });
});
