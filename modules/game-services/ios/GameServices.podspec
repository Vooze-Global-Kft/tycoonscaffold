Pod::Spec.new do |s|
  s.name           = 'GameServices'
  s.version        = '1.0.0'
  s.summary        = 'Game Center leaderboards for the games of this repository'
  s.description    = 'Signs the player in to Game Center, sends a score to a leaderboard and opens the leaderboard screen.'
  s.license        = 'UNLICENSED'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4'
  }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'GameKit'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
