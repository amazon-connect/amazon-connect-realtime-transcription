## [1.0.2] - 2022-01-05
### Changed
- TranscriptionRequest.java - remove unused imports
- KVSByteToAudioEventSubscription.java - remove unused logger & imports
- KVSContactTagProcessor.java - remove unused import; fix log formatting
- KVSUtils.java - suppress compiler warning
- kvs_transcribe_streaming_lambda.zip - update with latest changes
- build.gradle - change 'compile' to 'implementation', remove jars location as directory no longer used, distribute to correct zip file name
- README.md - Building instructions
- .gitignore - Ignore /bin directory used by VS Code

## [1.0.1] - 2022-01-27
### Added
- Lambda zip files restored in deployment/* folder 

### Changed
- amazon-kinesis-video-streams-parser-library version to 1.2.1 

### Removed
- .DS_Store 

## [1.0.0] - 2021-12-17
### Added
- CHANGELOG.md

### Changed
- amazon-kinesis-video-streams-parser-library version to 1.1.0
- org.slf4j:slf4j-api to 1.7.32
- org.slf4j:slf4j-log4j12 to 1.7.32

### Removed
- deployment files