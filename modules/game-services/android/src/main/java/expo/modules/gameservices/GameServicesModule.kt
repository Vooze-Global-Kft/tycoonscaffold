package expo.modules.gameservices

import android.content.pm.PackageManager
import com.google.android.gms.games.PlayGames
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** The manifest entry Play Games Services reads its project id from (app.config.ts writes it). */
private const val APP_ID_KEY = "com.google.android.gms.games.APP_ID"

/** Google's guide: "You must use startActivityForResult even though it returns no result." */
private const val RC_LEADERBOARD_UI = 9004

/**
 * Play Games Services (v2) for the games of this repository: is a player signed in, sign in, send a
 * score to a leaderboard, open the leaderboard screen. Nothing else (no achievements, no saved
 * games, no friends).
 *
 * The JavaScript side is src/services/boards.ts; every function resolves to a Boolean and never
 * rejects, so a player without Play Games simply has no leaderboard.
 *
 * A game without a Play Games project id has no APP_ID entry, and its manifest drops the SDK's
 * start-up provider (app.config.ts): `configured` is then false and no function touches the SDK,
 * which would throw when it was never started.
 */
class GameServicesModule : Module() {
  private val configured: Boolean by lazy {
    try {
      val context = appContext.reactContext
      if (context == null) {
        false
      } else {
        val info = context.packageManager.getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
        !info.metaData?.getString(APP_ID_KEY).isNullOrBlank()
      }
    } catch (e: Exception) {
      false
    }
  }

  override fun definition() = ModuleDefinition {
    Name("GameServices")

    Function("isConfigured") {
      return@Function configured
    }

    // The SDK signs in by itself at launch; this waits for that attempt. Never shows a screen.
    AsyncFunction("authenticate") { promise: Promise ->
      val activity = appContext.currentActivity
      if (!configured || activity == null) {
        promise.resolve(false)
        return@AsyncFunction
      }
      try {
        PlayGames.getGamesSignInClient(activity).isAuthenticated().addOnCompleteListener { task ->
          promise.resolve(task.isSuccessful && task.result.isAuthenticated())
        }
      } catch (e: Exception) {
        promise.resolve(false)
      }
    }

    // The manual sign-in: Play Games shows its own screen when the player has to choose or create a profile.
    AsyncFunction("signIn") { promise: Promise ->
      val activity = appContext.currentActivity
      if (!configured || activity == null) {
        promise.resolve(false)
        return@AsyncFunction
      }
      try {
        PlayGames.getGamesSignInClient(activity).signIn().addOnCompleteListener { task ->
          promise.resolve(task.isSuccessful && task.result.isAuthenticated())
        }
      } catch (e: Exception) {
        promise.resolve(false)
      }
    }

    AsyncFunction("submitScore") { leaderboardId: String, score: Double, promise: Promise ->
      val activity = appContext.currentActivity
      if (!configured || activity == null || score.isNaN() || score.isInfinite() || score < 0) {
        promise.resolve(false)
        return@AsyncFunction
      }
      try {
        PlayGames.getLeaderboardsClient(activity).submitScoreImmediate(leaderboardId, score.toLong()).addOnCompleteListener { task ->
          promise.resolve(task.isSuccessful)
        }
      } catch (e: Exception) {
        promise.resolve(false)
      }
    }

    AsyncFunction("showLeaderboard") { leaderboardId: String, promise: Promise ->
      val activity = appContext.currentActivity
      if (!configured || activity == null) {
        promise.resolve(false)
        return@AsyncFunction
      }
      try {
        PlayGames.getLeaderboardsClient(activity).getLeaderboardIntent(leaderboardId)
          .addOnSuccessListener { intent ->
            try {
              activity.startActivityForResult(intent, RC_LEADERBOARD_UI)
              promise.resolve(true)
            } catch (e: Exception) {
              promise.resolve(false)
            }
          }
          .addOnFailureListener {
            promise.resolve(false)
          }
      } catch (e: Exception) {
        promise.resolve(false)
      }
    }
  }
}
