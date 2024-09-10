"use server";

import { db } from "@/util/db/db";
import { revalidatePath } from "next/cache";

export const insertMatch = async (formData: any) => {
  "use server"; // Mark this as a server action

  // console.log(formData);
  // const { name, email, message } = formData;

  const scoreA = formData.get("team1Score");
  const scoreB = formData.get("team2Score");

  if (scoreA === scoreB) {
    return {
      error: true,
      message: "Team scores cannot be the same.",
    };
  }

  if (scoreA === 0 && scoreB === 0) {
    return {
      error: true,
      message: "Team scores cannot both be zero.",
    };
  }

  if (scoreA != 3 && scoreB != 3) {
    return {
      error: true,
      message: "One team must have a score of 3 sets.",
    };
  }

  try {
    const matchInsert = await db(
      `INSERT INTO "Match" (map, "team1Won", "team1Score", "team2Score") VALUES ($1, $2, $3, $4) RETURNING "id"`,
      [formData.get("arena"), scoreA > scoreB, scoreA, scoreB]
    );

    const matchId = matchInsert[0].id; // match id for the match created
    const playerNumbers = [1, 2, 3, 4, 5, 6];
    for (let playerNumber of playerNumbers) {
      await db(
        `INSERT INTO "MatchPlayer" ("matchId", "playerId", "teamNumber", "striker", "rank", "wasGoalie", "statGoals", "statAssists", "statSaves", "statKnockouts", "statDamage", "statShots", "statRedirects", "statOrbs")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          matchId,
          formData.get("player" + playerNumber) !== "Anonymous"
            ? formData.get("player" + playerNumber)
            : null,
          playerNumber >= 4 ? 2 : 1,
          formData.get("player" + playerNumber + "striker"),
          formData.get("player" + playerNumber + "rank"),
          formData.get("player" + playerNumber + "role") === "forward"
            ? false
            : true,
          formData.get("player" + playerNumber + "goals"),
          formData.get("player" + playerNumber + "assists"),
          formData.get("player" + playerNumber + "saves"),
          formData.get("player" + playerNumber + "knockouts"),
          formData.get("player" + playerNumber + "damage"),
          formData.get("player" + playerNumber + "shots"),
          formData.get("player" + playerNumber + "redirects"),
          formData.get("player" + playerNumber + "orbs"),
        ]
      );
    }
    console.log("Match inserted successfully");

    revalidatePath("/");
    revalidatePath("/players");
    for (let playerNumber of playerNumbers) {
      if (formData.get("player" + playerNumber) !== "Anonymous") {
        revalidatePath("/player/" + formData.get("player" + playerNumber));
      }
    }

    return {
      error: false,
      message: "Added match successfully",
    };
  } catch (error) {
    console.error("Error inserting data", error);
  }
};
