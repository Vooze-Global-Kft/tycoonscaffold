import ExpoModulesCore
import GameKit
import UIKit

/// Closes the leaderboard screen of iOS 16 and 17 when the player is done with it.
private final class GameCenterDismisser: NSObject, GKGameCenterControllerDelegate {
  func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
    gameCenterViewController.dismiss(animated: true)
  }
}

/**
 Game Center for the games of this repository: sign the player in, send a score to a leaderboard,
 open the leaderboard screen. Nothing else (no achievements, no saved games, no friends).

 The JavaScript side is src/services/boards.ts; every function resolves to a Bool and never
 rejects, so a player without Game Center simply has no leaderboard.

 Signing in follows Apple's rule ("GameKit calls the handler, possibly several times"): the
 handler is set once. When no player is signed in, GameKit hands over a sign-in screen; it is kept
 and shown only when the player asks for a leaderboard, never at launch.
 */
public class GameServicesModule: Module {
  /// The handler is set once per launch.
  private var handlerSet = false
  /// GameKit has called the handler at least once.
  private var answered = false
  /// A caller asked for the sign-in screen before GameKit answered.
  private var wantsScreen = false
  /// The sign-in screen GameKit handed over, until it is shown.
  private var signInScreen: UIViewController?
  /// Callers waiting for the answer of the sign-in in progress.
  private var waiting: [(Bool) -> Void] = []
  private let dismisser = GameCenterDismisser()

  public func definition() -> ModuleDefinition {
    Name("GameServices")

    // Game Center needs no project id: an iOS build is configured when the entitlement is in it
    // (app.config.ts adds it for a game with a leaderboard), which the JavaScript side decides.
    Function("isConfigured") { () -> Bool in
      return true
    }

    // Signed in already, or signed in without showing anything. Never shows a screen.
    AsyncFunction("authenticate") { (promise: Promise) in
      self.authenticate(interactive: false) { ok in promise.resolve(ok) }
    }.runOnQueue(.main)

    // The same, showing Game Center's own sign-in screen when the player is not signed in.
    AsyncFunction("signIn") { (promise: Promise) in
      self.authenticate(interactive: true) { ok in promise.resolve(ok) }
    }.runOnQueue(.main)

    AsyncFunction("submitScore") { (leaderboardId: String, score: Double, promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated, score.isFinite, score >= 0 else {
        promise.resolve(false)
        return
      }
      let value = Int(min(score, 9_007_199_254_740_991))
      GKLeaderboard.submitScore(value, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [leaderboardId]) { error in
        promise.resolve(error == nil)
      }
    }.runOnQueue(.main)

    AsyncFunction("showLeaderboard") { (leaderboardId: String, promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated else {
        promise.resolve(false)
        return
      }
      if #available(iOS 18.0, *) {
        // GKGameCenterViewController is deprecated from iOS 26; the access point opens the same screen.
        GKAccessPoint.shared.trigger(leaderboardID: leaderboardId, playerScope: .global, timeScope: .allTime, handler: nil)
        promise.resolve(true)
        return
      }
      guard let presenter = self.appContext?.utilities?.currentViewController() else {
        promise.resolve(false)
        return
      }
      let screen = GKGameCenterViewController(leaderboardID: leaderboardId, playerScope: .global, timeScope: .allTime)
      screen.gameCenterDelegate = self.dismisser
      presenter.present(screen, animated: true)
      promise.resolve(true)
    }.runOnQueue(.main)
  }

  /// Main thread only. Calls `done` exactly once.
  private func authenticate(interactive: Bool, done: @escaping (Bool) -> Void) {
    let player = GKLocalPlayer.local
    if player.isAuthenticated {
      done(true)
      return
    }
    if !handlerSet {
      handlerSet = true
      wantsScreen = interactive
      waiting.append(done)
      player.authenticateHandler = { [weak self] screen, _ in
        DispatchQueue.main.async {
          self?.answer(screen)
        }
      }
      return
    }
    if !answered {
      // The first answer is still on its way.
      wantsScreen = wantsScreen || interactive
      waiting.append(done)
      return
    }
    // GameKit has answered and the player is not signed in: only its own screen can change that.
    guard interactive, let screen = signInScreen, let presenter = appContext?.utilities?.currentViewController() else {
      done(false)
      return
    }
    signInScreen = nil
    waiting.append(done)
    // GameKit calls the handler again when the player has signed in or closed the screen.
    presenter.present(screen, animated: true)
  }

  /// One call of GameKit's handler. Main thread only.
  private func answer(_ screen: UIViewController?) {
    answered = true
    if let screen = screen {
      if wantsScreen, let presenter = appContext?.utilities?.currentViewController() {
        wantsScreen = false
        presenter.present(screen, animated: true)
        return
      }
      signInScreen = screen
      settle(false)
      return
    }
    wantsScreen = false
    settle(GKLocalPlayer.local.isAuthenticated)
  }

  private func settle(_ ok: Bool) {
    let callers = waiting
    waiting = []
    for done in callers {
      done(ok)
    }
  }
}
